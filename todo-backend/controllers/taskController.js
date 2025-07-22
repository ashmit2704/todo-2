const Task = require('../models/task');
const User = require('../models/user');
const { logActivity } = require('./activityLogController');
const {check, validationResult} = require("express-validator")

exports.lockTaskForEditing = async (req, res) => {
  try {
      const { taskId } = req.params;
      const { userId, userName } = req.body;

      const task = await Task.findById(taskId);
      if (!task) {
          return res.status(404).json({
              success: false,
              message: 'Task not found'
          });
      }

      // Check if task is already being edited by someone else
      if (task.currentlyEditingBy && task.currentlyEditingBy !== userId) {
          const timeSinceEdit = new Date() - task.editStartTime;
          // If editing session is older than 5 minutes, allow override
          if (timeSinceEdit < 5 * 60 * 1000) {
              return res.status(409).json({
                  success: false,
                  message: 'Task is currently being edited by another user',
                  currentEditor: task.currentlyEditingBy,
                  editStartTime: task.editStartTime
              });
          }
      }

      // Lock the task for editing
      task.currentlyEditingBy = userId;
      task.editStartTime = new Date();
      await task.save();

      // Emit socket event to notify other users
      global.io.emit('task-locked', {
          taskId: task._id,
          editorId: userId,
          editorName: userName,
          editStartTime: task.editStartTime
      });

      res.status(200).json({
          success: true,
          message: 'Task locked for editing',
          task
      });

  } catch (error) {
      console.error('Error locking task:', error);
      res.status(500).json({
          success: false,
          message: 'Internal server error'
      });
  }
};

exports.unlockTask = async (req, res) => {
  try {
      const { taskId } = req.params;
      const { userId } = req.body;

      const task = await Task.findById(taskId);
      if (!task) {
          return res.status(404).json({
              success: false,
              message: 'Task not found'
          });
      }

      // Only allow unlocking if the user is the current editor
      if (task.currentlyEditingBy !== userId) {
          return res.status(403).json({
              success: false,
              message: 'You are not the current editor of this task'
          });
      }

      // Unlock the task
      task.currentlyEditingBy = null;
      task.editStartTime = null;
      await task.save();

      // Emit socket event to notify other users
      global.io.emit('task-unlocked', {
          taskId: task._id
      });

      res.status(200).json({
          success: true,
          message: 'Task unlocked'
      });

  } catch (error) {
      console.error('Error unlocking task:', error);
      res.status(500).json({
          success: false,
          message: 'Internal server error'
      });
  }
};

exports.checkTaskConflict = async (req, res) => {
  try {
      const { taskId } = req.params;
      const { version } = req.query;

      const task = await Task.findById(taskId);
      if (!task) {
          return res.status(404).json({
              success: false,
              message: 'Task not found'
          });
      }

      const hasConflict = task.version > parseInt(version);

      res.status(200).json({
          success: true,
          hasConflict,
          currentVersion: task.version,
          requestedVersion: parseInt(version),
          task: hasConflict ? task : null
      });

  } catch (error) {
      console.error('Error checking task conflict:', error);
      res.status(500).json({
          success: false,
          message: 'Internal server error'
      });
  }
};

exports.resolveTaskConflict = async (req, res) => {
  try {
      const { taskId } = req.params;
      const { resolution, userChanges, currentVersion } = req.body;

      const task = await Task.findById(taskId);
      if (!task) {
          return res.status(404).json({
              success: false,
              message: 'Task not found'
          });
      }

      let resolvedTask;

      switch (resolution) {
          case 'overwrite':
              // Apply user changes, overwriting current version
              Object.assign(task, userChanges);
              task.lastModifiedBy = req.body.userId || 'user';
              resolvedTask = await task.save();
              break;

          case 'merge':
              // Merge changes intelligently
              const mergedChanges = {};
              
              // For simple fields, take user version if different from original
              ['title', 'description', 'assignedUser', 'priority'].forEach(field => {
                  if (userChanges[field] !== undefined) {
                      mergedChanges[field] = userChanges[field];
                  }
              });

              // For status, prefer the most recent change
              if (userChanges.status !== undefined) {
                  mergedChanges.status = userChanges.status;
              }

              Object.assign(task, mergedChanges);
              task.lastModifiedBy = req.body.userId || 'user';
              resolvedTask = await task.save();
              break;

          case 'discard':
              // Keep current version, discard user changes
              resolvedTask = task;
              break;

          default:
              return res.status(400).json({
                  success: false,
                  message: 'Invalid resolution type'
              });
      }

      // Log the conflict resolution
      await logActivity('conflict_resolved', 'task', task._id, req.body.userId || 'system', req.body.userName || 'System', {
          title: task.title,
          resolution: resolution,
          conflictVersion: currentVersion,
          resolvedVersion: resolvedTask.version
      });

      // Emit socket event to notify other users
      global.io.emit('task-conflict-resolved', {
          taskId: task._id,
          task: resolvedTask,
          resolution
      });

      res.status(200).json({
          success: true,
          message: 'Conflict resolved successfully',
          task: resolvedTask,
          resolution
      });

  } catch (error) {
      console.error('Error resolving task conflict:', error);
      res.status(500).json({
          success: false,
          message: 'Internal server error'
      });
  }
};

exports.postAddTask = [
    check('title')
        .trim()
        .custom(async (value) => {
            const existingTitle = await Task.findOne({title: value});
            if (existingTitle) {
                throw new Error('Title already exist');
            }
            return true;
        }),

    async (req, res, next) => {
        try {
            const {title, description, assignedUser, status, priority} = req.body;
            const errors = validationResult(req);

            if(!errors.isEmpty()) {
                const errorMessages = {};
                errors.array().forEach(error => {
                    errorMessages[error.path] = error.msg;
                });
                
                return res.status(422).json({
                    message: "Validation failed",
                    errors: errorMessages,
                    success: false
                });
            }
            
            const task = new Task({
                title,
                description,
                assignedUser,
                status,
                priority,
                lastModifiedBy: req.body.userId || 'system'
            });

            await task.save();

            await logActivity('create', 'task', task._id, req.body.userId || 'system', req.body.userName || 'System', {
              title: task.title,
              assignedTo: task.assignedUser,
              priority: task.priority
            });
            
            res.status(201).json({
                message: 'Task created successfully',
                task: task
            });
        } catch (error) {
            console.error('Error creating task:', error);
            res.status(500).json({
                message: 'Failed to create task',
                error: error.message
            });
        }
    }
]

exports.getTask = async (req, res, next) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
      res.status(200).json({
          message: 'Tasks fetched successfully',
          tasks: tasks
      });
  } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({
          message: 'Failed to fetch tasks',
          error: error.message
      });
  }
}

exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, version } = req.body;

    // Validate status
    const validStatuses = ['todo', 'inprogress', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be one of: todo, inprogress, done' 
      });
    }

    const currentTask = await Task.findById(taskId);
    if (!currentTask) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found' 
      });
    }

    if (version && currentTask.version > version) {
      return res.status(409).json({
        success: false,
        message: 'Task has been modified by another user',
        conflict: true,
        currentTask: currentTask,
        requestedVersion: version,
        currentVersion: currentTask.version
      });
    }

    // Find and update the task
    const task = await Task.findByIdAndUpdate(
      taskId,
      { 
        status,
        lastModifiedBy: req.body.userId || 'system'
      },
      { new: true }
    );

    // if (!task) {
    //   return res.status(404).json({ 
    //     success: false, 
    //     message: 'Task not found' 
    //   });
    // }

    await logActivity('status_change', 'task', task._id, req.body.userId || 'system', req.body.userName || 'System', {
      title: task.title,
      oldStatus: currentTask.status,
      newStatus: status
    });

    res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      task
    });

  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};
  
  exports.deleteTask = async (req, res) => {
    try {
      const { taskId } = req.params;
  
      // Find and delete the task
      const task = await Task.findByIdAndDelete(taskId);
  
      if (!task) {
        return res.status(404).json({ 
          success: false, 
          message: 'Task not found' 
        });
      }

      await logActivity('delete', 'task', task._id, req.body.userId || 'system', req.body.userName || 'System', {
        title: task.title,
        assignedUser: task.assignedUser
      });
  
      res.status(200).json({
        success: true,
        message: 'Task deleted successfully',
        taskId: task._id
      });
  
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  };

exports.editTask = async (req, res, next) => {
  try {
      const { taskId } = req.params;
      const { title, description, assignedUser, status, priority, version, userId, userName } = req.body;

      // Get the current task first
      const currentTask = await Task.findById(taskId);
      if (!currentTask) {
          return res.status(404).json({ 
              success: false, 
              message: 'Task not found' 
          });
      }

      if (version && currentTask.version > version) {
        return res.status(409).json({
            success: false,
            message: 'Task has been modified by another user',
            conflict: true,
            currentTask: currentTask,
            requestedVersion: version,
            currentVersion: currentTask.version
        });
    }

      // Only check title uniqueness if title is being changed
      if (title && title !== currentTask.title) {
          const existingTitle = await Task.findOne({
            title: title,
            _id: { $ne: taskId }
          });
          if (existingTitle) {
              return res.status(422).json({
                  message: "Validation failed",
                  errors: { title: 'Title already exists' },
                  success: false
              });
          }
      }

          // Validate status and priority if provided
          const validStatuses = ['todo', 'inprogress', 'done'];
          const validPriorities = ['low', 'medium', 'high'];
          
          if (status && !validStatuses.includes(status)) {
              return res.status(400).json({ 
                  success: false, 
                  message: 'Invalid status. Must be one of: todo, inprogress, done' 
              });
          }

          if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid priority. Must be one of: low, medium, high' 
            });
          }
  
          // Prepare update object with only changed fields
          const updateFields = {};
          if (title && title !== currentTask.title) updateFields.title = title;
          if (description !== undefined && description !== currentTask.description) updateFields.description = description;
          if (assignedUser && assignedUser !== currentTask.assignedUser) updateFields.assignedUser = assignedUser;
          if (status && status !== currentTask.status) updateFields.status = status;
          if (priority && priority !== currentTask.priority) updateFields.priority = priority;

          updateFields.lastModifiedBy = userId || 'system';
  
          // Only update if there are changes
          if (Object.keys(updateFields).length === 1 && updateFields.lastModifiedBy) {
              return res.status(200).json({
                  success: true,
                  message: 'No changes detected',
                  task: currentTask
              });
          }

          // Find and update the task
          const task = await Task.findByIdAndUpdate(
            taskId,
            updateFields,
            { new: true }
          );

          task.currentlyEditingBy = null;
          task.editStartTime = null;
          await task.save();

          const changes = Object.keys(updateFields)
            .filter(field => field !== 'lastModifiedBy')
            .map(field => {
                return `${field}: ${currentTask[field]} → ${updateFields[field]}`;
            }).join(', ');

          await logActivity('edit', 'task', task._id, userId || 'system', userName || 'System', {
            title: task.title,
            changes: changes,
            updatedFields: Object.keys(updateFields).filter(field => field !== 'lastModifiedBy')
        });
        
        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            task: task
        });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update task',
            error: error.message
        });
    }
}

exports.getSmartAssignSuggestion = async (req, res) => {
  try {
      // Get all users
      const users = await User.find({}, 'fullName email').lean();
      
      if (users.length === 0) {
          return res.status(404).json({
              success: false,
              message: 'No users found'
          });
      }

      // Get task counts for each user (only active tasks: todo and inprogress)
      const userTaskCounts = await Promise.all(
          users.map(async (user) => {
              const taskCount = await Task.countDocuments({
                  assignedUser: user.fullName,
                  status: { $in: ['todo', 'inprogress'] }
              });
              return {
                  ...user,
                  activeTaskCount: taskCount
              };
          })
      );

      // Sort by task count (ascending) and get the user with fewest tasks
      const sortedUsers = userTaskCounts.sort((a, b) => a.activeTaskCount - b.activeTaskCount);
      const suggestedUser = sortedUsers[0];

      res.status(200).json({
          success: true,
          message: 'Smart assign suggestion retrieved successfully',
          suggestedUser: {
              fullName: suggestedUser.fullName,
              email: suggestedUser.email,
              activeTaskCount: suggestedUser.activeTaskCount
          },
          allUsers: sortedUsers.map(user => ({
              fullName: user.fullName,
              email: user.email,
              activeTaskCount: user.activeTaskCount
          }))
      });
  } catch (error) {
      console.error('Error getting smart assign suggestion:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to get smart assign suggestion',
          error: error.message
      });
  }
}