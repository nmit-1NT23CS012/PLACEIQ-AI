const admin = require('firebase-admin');

const formatApplication = doc => {
  const application = doc.data();
  return {
    id: doc.id,
    jobTitle: application.jobTitle || 'Untitled job',
    company: application.company || '',
    studentName: application.studentName || 'Student',
    studentEmail: application.studentEmail || '',
    status: application.status || 'applied',
    appliedAt: application.appliedAt || null,
    readinessScore: application.readinessScore || 0,
    skills: Array.isArray(application.skills) ? application.skills : [],
    hasResume: Boolean(application.resumeStoragePath)
  };
};

exports.getOverview = async (req, res) => {
  try {
    const db = admin.firestore();
    const [usersSnapshot, profilesSnapshot, jobsSnapshot, applicationsSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('resume_profiles').get(),
      db.collection('recruiter_jobs').get(),
      db.collection('job_applications').get()
    ]);

    const usersByRole = {};
    for (const userDoc of usersSnapshot.docs) {
      const role = userDoc.data().role || 'unassigned';
      usersByRole[role] = (usersByRole[role] || 0) + 1;
    }

    const scores = profilesSnapshot.docs
      .map(profileDoc => profileDoc.data().readinessScore)
      .filter(score => Number.isFinite(score));
    const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const applications = applicationsSnapshot.docs
      .map(formatApplication)
      .sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0));
    const applicationCounts = {};
    for (const application of applications) {
      applicationCounts[application.status] = (applicationCounts[application.status] || 0) + 1;
    }

    const skillCounts = {};
    for (const profileDoc of profilesSnapshot.docs) {
      const skills = profileDoc.data().skills;
      if (!Array.isArray(skills)) continue;
      for (const skill of skills) {
        if (typeof skill !== 'string' || !skill.trim()) continue;
        const key = skill.trim();
        skillCounts[key] = (skillCounts[key] || 0) + 1;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        totalUsers: usersSnapshot.size,
        usersByRole,
        profilesProcessed: profilesSnapshot.size,
        overallReadiness: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
        totalJobs: jobs.length,
        openJobs: jobs.filter(job => job.status === 'open').length,
        totalApplications: applications.length,
        applicationStats: Object.entries(applicationCounts).map(([_id, count]) => ({ _id, count })),
        topSkills: Object.entries(skillCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        recentJobs: jobs
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, 5)
          .map(({ id, title, company, status, createdAt }) => ({ id, title, company, status, createdAt })),
        recentApplications: applications.slice(0, 5)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('users').get();
    const users = snapshot.docs
      .map(doc => {
        const user = doc.data();
        return {
          id: doc.id,
          name: user.name || 'Unnamed user',
          email: user.email || '',
          role: user.role || 'unassigned',
          disabled: user.disabled === true,
          createdAt: user.createdAt || null
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { disabled } = req.body;
    if (typeof disabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Disabled must be true or false.' });
    }
    if (disabled && req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot disable your own admin account.' });
    }

    const userRef = admin.firestore().collection('users').doc(req.params.id);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updatedAt = new Date().toISOString();
    if (disabled) {
      await userRef.set({ disabled: true, statusUpdatedAt: updatedAt }, { merge: true });
      try {
        await admin.auth().updateUser(req.params.id, { disabled: true });
      } catch (error) {
        console.error('Firebase Auth disable failed after blocking the Firestore account:', error);
        return res.status(503).json({
          success: false,
          message: 'This account is blocked from the app, but Firebase Authentication could not be updated.'
        });
      }
    } else {
      await admin.auth().updateUser(req.params.id, { disabled: false });
      await userRef.set({ disabled: false, statusUpdatedAt: updatedAt }, { merge: true });
    }

    res.status(200).json({
      success: true,
      data: { id: userSnapshot.id, disabled, statusUpdatedAt: updatedAt }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getJobs = async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('recruiter_jobs').get();
    const jobs = snapshot.docs
      .map(doc => {
        const job = doc.data();
        return {
          id: doc.id,
          title: job.title || 'Untitled job',
          company: job.company || '',
          description: job.description || '',
          requiredSkills: Array.isArray(job.requiredSkills) ? job.requiredSkills : [],
          recruiterId: job.recruiterId || '',
          status: job.status || 'closed',
          createdAt: job.createdAt || null,
          updatedAt: job.updatedAt || null
        };
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.status(200).json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be open or closed.' });
    }

    const jobRef = admin.firestore().collection('recruiter_jobs').doc(req.params.id);
    const jobSnapshot = await jobRef.get();
    if (!jobSnapshot.exists) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const updatedAt = new Date().toISOString();
    await jobRef.update({ status, updatedAt });
    res.status(200).json({ success: true, data: { id: jobSnapshot.id, ...jobSnapshot.data(), status, updatedAt } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getApplications = async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('job_applications').get();
    const applications = snapshot.docs
      .map(formatApplication)
      .sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0));
    res.status(200).json({ success: true, count: applications.length, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
