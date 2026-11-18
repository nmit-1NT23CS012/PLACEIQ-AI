const express = require('express');
const { uploadResume, getProfile, getSkillGaps, addInterviewFeedback } = require('../controllers/resume');
const { protect, authorize } = require('../middleware/auth');
const resumeUpload = require('../middleware/resumeUpload');

const router = express.Router();

router.post('/upload', protect, authorize('student'), resumeUpload('file'), uploadResume);
router.get('/profile', protect, authorize('student'), getProfile);
router.post('/analyze-gaps', protect, authorize('student'), getSkillGaps);
router.post('/interview-feedback', protect, authorize('student'), addInterviewFeedback);

module.exports = router;
