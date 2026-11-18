const axios = require('axios');
const admin = require('firebase-admin');
const aiService = require('../utils/aiService');
const fs = require('fs');
const resumeStorage = require('../utils/resumeStorage');

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '');
};

/**
 * @desc    Get live matched jobs for the student
 * @route   GET /api/jobs/match
 * @access  Private (Student)
 */
exports.getMatchedJobs = async (req, res) => {
  try {
    // 1. Get user profile from Firestore
    const profileDoc = await admin.firestore().collection('resume_profiles').doc(req.user.id).get();
    
    if (!profileDoc.exists) {
      return res.status(400).json({ success: false, message: 'Please upload a resume first to get matched with jobs.' });
    }

    const profile = profileDoc.data();
    if (!profile.skills || !profile.embedding || profile.embedding.length === 0) {
      return res.status(400).json({ success: false, message: 'Please upload a resume first to get matched with jobs.' });
    }

    // 2. Fetch live remote jobs from Remotive API
    const remotiveRes = await axios.get('https://remotive.com/api/remote-jobs?category=software-dev&limit=20');
    const rawJobs = remotiveRes.data.jobs || [];

    if (rawJobs.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // 3. Format jobs for AI Service
    const aiJobsInput = rawJobs.map(job => ({
      id: String(job.id),
      title: job.title,
      description: stripHtml(job.description).substring(0, 1000),
      required_skills: job.tags || []
    }));

    // 4. Call AI Service for matching
    const aiMatchRes = await aiService.matchJobs({
      candidate_skills: profile.skills,
      candidate_embedding: profile.embedding,
      candidate_readiness_score: profile.readinessScore || 0,
      jobs: aiJobsInput
    });

    // 5. Merge AI match results with original job data
    const matchedJobs = aiMatchRes.map(aiMatch => {
      const originalJob = rawJobs.find(j => String(j.id) === aiMatch.id);
      return {
        id: aiMatch.id,
        title: originalJob.title,
        company: originalJob.company_name,
        location: originalJob.candidate_required_location || 'Remote',
        type: originalJob.job_type === 'full_time' ? 'Full Time' : (originalJob.job_type || 'Contract'),
        postedAt: originalJob.publication_date || null,
        match: aiMatch.score,
        skills: (originalJob.tags && originalJob.tags.length > 0) ? originalJob.tags.slice(0, 5) : ['Software Development'],
        url: originalJob.url,
        saved: false,
        explanation: aiMatch.explanation,
        logo: originalJob.company_logo
      };
    });

    // 6. Return the ranked list
    res.status(200).json({ success: true, data: matchedJobs });
  } catch (error) {
    console.error('Job Match Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAvailableJobs = async (req, res) => {
  try {
    const snapshot = await admin.firestore()
      .collection('recruiter_jobs')
      .where('status', '==', 'open')
      .get();
    const jobs = snapshot.docs
      .map(doc => {
        const job = { id: doc.id, ...doc.data() };
        delete job.recruiterId;
        return job;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudentApplications = async (req, res) => {
  try {
    const snapshot = await admin.firestore()
      .collection('job_applications')
      .where('studentId', '==', req.user.id)
      .get();
    const applications = snapshot.docs
      .map(doc => {
        const application = { id: doc.id, ...doc.data() };
        delete application.resumeStoragePath;
        delete application.resumeContentType;
        delete application.recruiterId;
        return application;
      })
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.applyToJob = async (req, res) => {
  let storedResume;
  let resumeStored = false;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Choose a PDF or DOCX resume for this application.' });
    }

    const db = admin.firestore();
    const jobRef = db.collection('recruiter_jobs').doc(req.params.id);
    const profileRef = db.collection('resume_profiles').doc(req.user.id);
    const applicationRef = db.collection('job_applications').doc(`${req.params.id}_${req.user.id}`);
    storedResume = await resumeStorage.storeResume({
      tempFilePath: req.file.path,
      userId: req.user.id,
      originalName: req.file.originalname,
      contentType: req.file.mimetype
    });
    resumeStored = true;

    const result = await db.runTransaction(async transaction => {
      const jobSnapshot = await transaction.get(jobRef);
      if (!jobSnapshot.exists || jobSnapshot.data().status !== 'open') return { error: 'job_unavailable' };

      const profileSnapshot = await transaction.get(profileRef);
      const profile = profileSnapshot.exists ? profileSnapshot.data() : {};

      const existingApplication = await transaction.get(applicationRef);
      if (existingApplication.exists) return { error: 'already_applied' };

      const job = jobSnapshot.data();
      const appliedAt = new Date().toISOString();
      const application = {
        jobId: jobSnapshot.id,
        recruiterId: job.recruiterId,
        studentId: req.user.id,
        studentName: req.user.name || 'Student',
        studentEmail: req.user.email || '',
        jobTitle: job.title,
        company: job.company,
        skills: Array.isArray(profile.skills) ? profile.skills : [],
        readinessScore: profile.readinessScore || 0,
        resumeStorageProvider: storedResume.provider,
        resumeStoragePath: storedResume.storagePath,
        resumeFileName: req.file.originalname,
        resumeContentType: req.file.mimetype || 'application/octet-stream',
        status: 'applied',
        appliedAt,
        updatedAt: appliedAt
      };

      transaction.create(applicationRef, application);
      return { application: { id: applicationRef.id, ...application } };
    });

    if (result.error === 'job_unavailable') {
      await resumeStorage.deleteResume(storedResume.provider, storedResume.storagePath);
      resumeStored = false;
      return res.status(404).json({ success: false, message: 'This job is no longer available.' });
    }
    if (result.error === 'already_applied') {
      await resumeStorage.deleteResume(storedResume.provider, storedResume.storagePath);
      resumeStored = false;
      return res.status(409).json({ success: false, message: 'You have already applied for this job.' });
    }

    resumeStored = false;
    const application = { ...result.application };
    delete application.resumeStoragePath;
    delete application.resumeContentType;
    delete application.recruiterId;
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    if (resumeStored) {
      await resumeStorage.deleteResume(storedResume.provider, storedResume.storagePath).catch(deleteError => {
        console.error('Failed to remove resume from an unsuccessful application:', deleteError);
      });
    }
    if (error.code === 'RESUME_STORAGE_NOT_CONFIGURED' || Number(error.code) === 404) {
      console.error('Resume storage is not configured:', error);
      return res.status(503).json({
        success: false,
        message: 'Resume storage is unavailable. Use RESUME_STORAGE_PROVIDER=local for a local demo, or configure a valid Firebase Storage bucket.'
      });
    }
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (req.file?.path) {
      await fs.promises.unlink(req.file.path).catch(error => {
        if (error.code !== 'ENOENT') console.error('Failed to remove temporary application resume:', error);
      });
    }
  }
};
