const express = require('express');
const {
  getOverview,
  getUsers,
  updateUserStatus,
  getJobs,
  updateJobStatus,
  getApplications
} = require('../controllers/admin');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/overview', getOverview);
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.get('/jobs', getJobs);
router.patch('/jobs/:id/status', updateJobStatus);
router.get('/applications', getApplications);

module.exports = router;
