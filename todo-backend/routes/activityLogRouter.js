const express = require('express');
const activityLogController = require('../controllers/activityLogController');

const activityLogRouter = express.Router();

// GET /activity-log/recent - Get last 20 activities
activityLogRouter.get('/recent', activityLogController.getRecentActivities);

module.exports = activityLogRouter;