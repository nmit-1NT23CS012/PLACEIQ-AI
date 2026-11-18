const admin = require('firebase-admin');
const aiService = require('../utils/aiService');
const resumeStorage = require('../utils/resumeStorage');

exports.getRecruiterJobs = async (req, res) => {
  try {
    const snapshot = await admin.firestore()
      .collection('recruiter_jobs')
      .where('recruiterId', '==', req.user.id)
      .get();
    const jobs = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createRecruiterJob = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const company = typeof req.body.company === 'string' ? req.body.company.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    const requiredSkills = Array.isArray(req.body.requiredSkills)
      ? [...new Set(req.body.requiredSkills.filter(skill => typeof skill === 'string').map(skill => skill.trim()).filter(Boolean))]
      : [];

    if (!title || !company || !description) {
      return res.status(400).json({ success: false, message: 'Title, company, and job description are required.' });
    }

    const job = {
      title,
      company,
      description,
      requiredSkills,
      recruiterId: req.user.id,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const document = await admin.firestore().collection('recruiter_jobs').add(job);

    res.status(201).json({ success: true, data: { id: document.id, ...job } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRecruiterJob = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be open or closed.' });
    }

    const jobRef = admin.firestore().collection('recruiter_jobs').doc(req.params.id);
    const jobSnapshot = await jobRef.get();
    if (!jobSnapshot.exists || jobSnapshot.data().recruiterId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    await jobRef.update({ status, updatedAt: new Date().toISOString() });
    res.status(200).json({ success: true, data: { id: jobSnapshot.id, ...jobSnapshot.data(), status } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRecruiterApplications = async (req, res) => {
  try {
    const snapshot = await admin.firestore()
      .collection('job_applications')
      .where('recruiterId', '==', req.user.id)
      .get();
    const applications = snapshot.docs
      .map(doc => {
        const application = { id: doc.id, ...doc.data() };
        const hasResume = Boolean(application.resumeStoragePath);
        delete application.resumeStoragePath;
        delete application.resumeContentType;
        return {
          ...application,
          hasResume,
          resumeFileName: application.resumeFileName || 'resume'
        };
      })
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    res.status(200).json({ success: true, count: applications.length, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRecruiterApplication = async (req, res) => {
  try {
    const allowedStatuses = ['applied', 'reviewing', 'shortlisted', 'rejected', 'offered'];
    const { status } = req.body;
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Choose a valid application status.' });
    }

    const applicationRef = admin.firestore().collection('job_applications').doc(req.params.id);
    const applicationSnapshot = await applicationRef.get();
    if (!applicationSnapshot.exists || applicationSnapshot.data().recruiterId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const updatedAt = new Date().toISOString();
    await applicationRef.update({ status, updatedAt });
    const application = { id: applicationSnapshot.id, ...applicationSnapshot.data() };
    const hasResume = Boolean(application.resumeStoragePath);
    delete application.resumeStoragePath;
    delete application.resumeContentType;
    res.status(200).json({
      success: true,
      data: { ...application, status, updatedAt, hasResume }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.downloadApplicantResume = async (req, res) => {
  try {
    const applicationSnapshot = await admin.firestore()
      .collection('job_applications')
      .doc(req.params.id)
      .get();
    if (!applicationSnapshot.exists) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const application = applicationSnapshot.data();
    if (application.recruiterId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    if (!application.resumeStoragePath) {
      return res.status(404).json({ success: false, message: 'No resume was attached to this application.' });
    }

    const stream = await resumeStorage.getResumeReadStream(
      application.resumeStorageProvider || 'firebase',
      application.resumeStoragePath
    );
    if (!stream) {
      return res.status(404).json({ success: false, message: 'The attached resume is no longer available.' });
    }

    const safeFileName = (application.resumeFileName || 'resume').replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', application.resumeContentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);

    stream.on('error', error => {
      console.error('Applicant resume download error:', error);
      if (res.headersSent) res.destroy(error);
      else res.status(500).json({ success: false, message: 'Could not download the applicant resume.' });
    });
    stream.pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRecruiterCandidates = async (req, res) => {
  try {
    const profiles = await admin.firestore().collection('resume_profiles').get();
    const candidates = await Promise.all(profiles.docs.map(async profileDoc => {
      const profile = profileDoc.data();
      const userId = typeof profile.user === 'string' && profile.user ? profile.user : profileDoc.id;
      const userSnapshot = await admin.firestore().collection('users').doc(userId).get();
      const user = userSnapshot.exists ? userSnapshot.data() : {};
      if (!userSnapshot.exists || user.disabled === true) return null;

      return {
        id: userId,
        name: user.name || 'Unknown Candidate',
        email: user.email || '',
        skills: profile.skills || [],
        readinessScore: profile.readinessScore || 0,
        cgpa: profile.academicRecord?.cgpa ?? null,
        lastUpdated: profile.lastUpdated || null
      };
    }));

    const activeCandidates = candidates.filter(Boolean);
    activeCandidates.sort((a, b) => b.readinessScore - a.readinessScore);
    res.status(200).json({ success: true, count: activeCandidates.length, data: activeCandidates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Submit JD and get matched candidates
 * @route   POST /api/recruiters/match
 * @access  Private (Recruiter)
 */
exports.matchJD = async (req, res) => {
  try {
    const { title, description, requiredSkills } = req.body;

    if (!description) {
      return res.status(400).json({ success: false, message: 'Please provide a job description' });
    }

    // 1. Fetch all student profiles from Firestore
    const profilesSnapshot = await admin.firestore().collection('resume_profiles').get();
    
    if (profilesSnapshot.empty) {
      return res.status(200).json({ success: true, data: [], message: 'No student profiles found in the database' });
    }

    // 2. Prepare candidate data for AI Service
    // We also need user names/emails. In Firestore, we'll fetch them from the 'users' collection.
    const candidatesData = await Promise.all(profilesSnapshot.docs.map(async profileDoc => {
      const profile = profileDoc.data();
      const userId = typeof profile.user === 'string' && profile.user ? profile.user : profileDoc.id;
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      const userData = userDoc.exists ? userDoc.data() : { name: 'Unknown User', email: '' };
      if (!userDoc.exists || userData.disabled === true) return null;
      
      return {
        id: userId,
        name: userData.name || 'Unknown Candidate',
        skills: profile.skills || [],
        embedding: profile.embedding || [],
        readiness_score: profile.readinessScore || 0
      };
    }));

    const activeCandidates = candidatesData.filter(Boolean);
    if (!activeCandidates.length) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const jobJd = {
      id: "temp-jd-" + Date.now(),
      title: title || "Job Posting",
      description: description,
      required_skills: requiredSkills || []
    };

    // 3. Call AI Service for ranking
    const matchResults = await aiService.matchCandidates(jobJd, activeCandidates);

    res.status(200).json({
      success: true,
      count: matchResults.length,
      data: matchResults
    });
  } catch (error) {
    console.error('Recruiter Match Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get detailed student profile for recruiter
 * @route   GET /api/recruiters/candidate/:id
 * @access  Private (Recruiter)
 */
exports.getCandidateDetail = async (req, res) => {
  try {
    const profiles = admin.firestore().collection('resume_profiles');
    let profileDoc = await profiles.doc(req.params.id).get();
    if (!profileDoc.exists) {
      const matchingProfiles = await profiles.where('user', '==', req.params.id).limit(1).get();
      profileDoc = matchingProfiles.docs[0];
    }
    
    if (!profileDoc) {
      return res.status(404).json({ success: false, message: 'Candidate profile not found' });
    }

    const profile = profileDoc.data();
    const userDoc = await admin.firestore().collection('users').doc(req.params.id).get();
    const userData = userDoc.exists ? userDoc.data() : { name: 'Unknown User', email: '' };
    if (!userDoc.exists || userData.disabled === true) {
      return res.status(404).json({ success: false, message: 'Candidate profile not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.params.id,
          name: userData.name || 'Unknown Candidate',
          email: userData.email || ''
        },
        skills: profile.skills || [],
        academicRecord: profile.academicRecord || {},
        readinessScore: profile.readinessScore || 0,
        readinessHistory: profile.readinessHistory || [],
        skillGaps: profile.skillGaps || [],
        lastUpdated: profile.lastUpdated || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
