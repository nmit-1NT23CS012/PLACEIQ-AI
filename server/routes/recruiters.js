const express = require('express');
const {
  matchJD,
  getCandidateDetail,
  getRecruiterJobs,
  createRecruiterJob,
  updateRecruiterJob,
  getRecruiterCandidates,
  getRecruiterApplications,
  updateRecruiterApplication,
  downloadApplicantResume
} = require('../controllers/recruiters');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('recruiter'));

router.route('/jobs')
  .get(getRecruiterJobs)
  .post(createRecruiterJob);
router.patch('/jobs/:id', updateRecruiterJob);
router.get('/applications', getRecruiterApplications);
router.patch('/applications/:id', updateRecruiterApplication);
router.get('/applications/:id/resume', downloadApplicantResume);
router.get('/candidates', getRecruiterCandidates);
router.post('/match', matchJD);
router.get('/candidate/:id', getCandidateDetail);

module.exports = router;
