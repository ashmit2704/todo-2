const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const taskRouter = express.Router();

const taskController = require('../controllers/taskController');

// Protected routes - require authentication
taskRouter.post('/add-task', authenticateToken, taskController.postAddTask);
taskRouter.put('/update-task-status/:taskId', authenticateToken, taskController.updateTaskStatus);
taskRouter.delete('/delete-task/:taskId', authenticateToken, taskController.deleteTask);
taskRouter.put('/edit-task/:taskId', authenticateToken, taskController.editTask);
taskRouter.post('/lock-task/:taskId', authenticateToken, taskController.lockTaskForEditing);
taskRouter.post('/unlock-task/:taskId', authenticateToken, taskController.unlockTask);
taskRouter.post('/resolve-conflict/:taskId', authenticateToken, taskController.resolveTaskConflict);

// Read-only routes - optional authentication
taskRouter.get('/get-task', optionalAuth, taskController.getTask);
taskRouter.get('/smart-assign-suggestion', optionalAuth, taskController.getSmartAssignSuggestion);
taskRouter.get('/check-conflict/:taskId', optionalAuth, taskController.checkTaskConflict);

module.exports = taskRouter;