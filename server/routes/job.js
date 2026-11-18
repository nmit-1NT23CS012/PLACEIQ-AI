const express = require('express');
const { getMatchedJobs, getAvailableJobs, getStudentApplications, applyToJob } = require('../controllers/job');
const { protect, authorize } = require('../middleware/auth');
const resumeUpload = require('../middleware/resumeUpload');

const router = express.Router();

router.get('/match', protect, authorize('student'), getMatchedJobs);
router.get('/', protect, authorize('student'), getAvailableJobs);
router.get('/applications', protect, authorize('student'), getStudentApplications);
router.post('/:id/apply', protect, authorize('student'), resumeUpload('resume'), applyToJob);

module.exports = router;
