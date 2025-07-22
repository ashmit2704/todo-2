import { useState, useEffect } from 'react';
import './Overlay.css';
import io from 'socket.io-client';
import ConflictModal from './ConflictModal';

const socket = io.connect('https://todo-2-jnyc.onrender.com');

const Overlay = ({ onClose, fetchTasks, setAddTaskMenu, editingTask, isEditing = false }) => {
    const handleBackgroundClick = (e) => {
        if (e.target.className === 'overlay-background') {
            handleClose();
        }
    };

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignedUser: '',
        status: 'todo',
        priority: ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [smartAssignLoading, setSmartAssignLoading] = useState(false);
    const [originalVersion, setOriginalVersion] = useState(null);
    const [isLocked, setIsLocked] = useState(false);
    
    // Conflict handling state
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [conflictData, setConflictData] = useState(null);

    // Get user info
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user._id || user.id || 'anonymous';
    const userName = user.fullName || user.name || 'Anonymous User';

    useEffect(() => {
        if (isEditing && editingTask) {
            setFormData({
                title: editingTask.title || '',
                description: editingTask.description || '',
                assignedUser: editingTask.assignedUser || '',
                status: editingTask.status || 'todo',
                priority: editingTask.priority || ''
            });

            setOriginalVersion(editingTask.version || 1);
            
            // Lock the task for editing
            lockTaskForEditing();
        }

        // Socket listeners for conflict detection
        socket.on('task-locked', (data) => {
            if (data.taskId === editingTask?._id && data.editorId !== userId) {
                // Another user is editing this task
                setIsLocked(true);
            }
        });

        socket.on('task-unlocked', (data) => {
            if (data.taskId === editingTask?._id) {
                setIsLocked(false);
            }
        });

        socket.on('task-updated', (data) => {
            if (data.task._id === editingTask?._id && isEditing) {
                // Task was updated by another user while we're editing
                checkForConflicts(data.task);
            }
        });

        return () => {
            socket.off('task-locked');
            socket.off('task-unlocked');
            socket.off('task-updated');
            
            // Unlock task when component unmounts
            if (isEditing && editingTask) {
                unlockTask();
            }
        };
    }, [isEditing, editingTask, userId]);

    const lockTaskForEditing = async () => {
        if (!editingTask) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://todo-2-jnyc.onrender.com/todo/lock-task/${editingTask._id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId, userName })
            });

            if (!response.ok) {
                const data = await response.json();
                if (response.status === 409) {
                    // Task is already being edited
                    alert(`This task is currently being edited by ${data.currentEditor}`);
                    onClose();
                }
            }
        } catch (error) {
            console.error('Error locking task:', error);
        }
    };

    const unlockTask = async () => {
        if (!editingTask) return;
        
        try {
            const token = localStorage.getItem('token');
            await fetch(`http://localhost:3001/todo/unlock-task/${editingTask._id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId })
            });
        } catch (error) {
            console.error('Error unlocking task:', error);
        }
    };

    const checkForConflicts = (updatedTask) => {
        // Compare current form data with updated task
        const hasConflicts = 
            formData.title !== updatedTask.title ||
            formData.description !== updatedTask.description ||
            formData.assignedUser !== updatedTask.assignedUser ||
            formData.status !== updatedTask.status ||
            formData.priority !== updatedTask.priority;

        if (hasConflicts) {
            setConflictData({
                currentTask: updatedTask,
                userChanges: { ...formData }
            });
            setShowConflictModal(true);
        }
    };

    const handleConflictResolution = async (resolution) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://todo-2-jnyc.onrender.com/todo/resolve-conflict/${editingTask._id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    resolution,
                    userChanges: formData,
                    currentVersion: originalVersion,
                    userId,
                    userName
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Update form data based on resolution
                if (resolution === 'discard') {
                    setFormData({
                        title: data.task.title || '',
                        description: data.task.description || '',
                        assignedUser: data.task.assignedUser || '',
                        status: data.task.status || 'todo',
                        priority: data.task.priority || ''
                    });
                }
                
                setOriginalVersion(data.task.version);
                await fetchTasks();
                setShowConflictModal(false);
                
                if (resolution !== 'discard') {
                    onClose();
                }
            } else {
                throw new Error('Failed to resolve conflict');
            }
        } catch (error) {
            console.error('Error resolving conflict:', error);
            alert('Failed to resolve conflict. Please try again.');
        }
    };

    const handleClose = () => {
        if (isEditing && editingTask) {
            unlockTask();
        }
        onClose();
    };

    const handleAddTask = async () => {
        setErrors({});
        setIsSubmitting(true);

        socket.emit("form-data", {message: "Task Added"});

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://todo-2-jnyc.onrender.com/todo/add-task', {
              method: "POST",
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                ...formData,
                userId,
                userName
              }),
            });

            const data = await response.json();
      
            if (response.ok) {
              await fetchTasks();
              setFormData({
                title: '',
                description: '',
                assignedUser: '',
                status: 'todo',
                priority: ''
              });
              setAddTaskMenu(false);
            } else {
                if (data.errors) {
                    setErrors(data.errors);
                } else {
                    setErrors({ general: data.message || 'An error occurred while adding the task' });
                }
            }
          } catch (error) {
                console.error('Error adding task:', error);
                setErrors({ general: 'Failed to connect to the server. Please try again.' });
          } finally {
                setIsSubmitting(false);
          }
    };

    const handleEditTask = async () => {
        setErrors({});
        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://todo-2-jnyc.onrender.com/todo/edit-task/${editingTask._id}`, {
              method: "PUT",
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                ...formData,
                version: originalVersion,
                userId,
                userName
              }),
            });

            const data = await response.json();
      
            if (response.ok) {
              // Emit socket event to notify other users
              socket.emit('task-updated', { task: data.task });
              await fetchTasks();
              await unlockTask();
              onClose();
            } else {
                if (response.status === 409 && data.conflict) {
                    // Handle conflict
                    setConflictData({
                        currentTask: data.currentTask,
                        userChanges: { ...formData }
                    });
                    setShowConflictModal(true);
                } else if (data.errors) {
                    setErrors(data.errors);
                } else {
                    setErrors({ general: data.message || 'An error occurred while updating the task' });
                }
            }
          } catch (error) {
                console.error('Error updating task:', error);
                setErrors({ general: 'Failed to connect to the server. Please try again.' });
          } finally {
                setIsSubmitting(false);
          }
    };

    const handleSubmit = () => {
        if (isLocked && isEditing) {
            alert('This task is currently being edited by another user. Please wait.');
            return;
        }

        if (isEditing) {
            handleEditTask();
        } else {
            handleAddTask();
        }
    };

    const handleInputChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' });
        }
    };

    const handleSmartAssign = async () => {
        setSmartAssignLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://todo-2-jnyc.onrender.com/todo/smart-assign-suggestion', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            
            if (data.success && data.suggestedUser) {
                setFormData({ ...formData, assignedUser: data.suggestedUser.fullName });
                // Show a brief notification
                const notification = document.createElement('div');
                notification.textContent = `Smart assigned to ${data.suggestedUser.fullName} (${data.suggestedUser.activeTaskCount} active tasks)`;
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #2ecc71;
                    color: white;
                    padding: 12px 16px;
                    border-radius: 6px;
                    z-index: 10000;
                    font-size: 14px;
                `;
                document.body.appendChild(notification);
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 3000);
            } else {
                alert('Unable to get smart assign suggestion. Please try again.');
            }
        } catch (error) {
            console.error('Error getting smart assign suggestion:', error);
            alert('Failed to get smart assign suggestion. Please try again.');
        } finally {
            setSmartAssignLoading(false);
        }
    };

    return (
        <>
            <div className="overlay-background" onClick={handleBackgroundClick}>
                <div className="overlay-content">
                    <div className="overlay-header">
                        <h2>{isEditing ? 'Edit Task' : 'Add New Task'}</h2>
                        {isLocked && isEditing && (
                            <span className="editing-indicator">🔒 Being edited by another user</span>
                        )}
                        <button className="close-button" onClick={handleClose}>&times;</button>
                    </div>
                    <div className="overlay-form">
                        {errors.general && (
                            <div className="error-message general-error">
                                {errors.general}
                            </div>
                        )}
                        <div className="form-group">
                            <label>Task Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => handleInputChange('title', e.target.value)}
                                placeholder="Enter task title"
                                className={errors.title ? 'error-input' : ''}
                                disabled={isLocked}
                            />
                            {errors.title && (
                                <div className="error-message field-error">
                                    {errors.title}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Enter task description"
                                disabled={isLocked}
                            />
                        </div>

                        <div className="form-group">
                            <label>Assigned User</label>
                            <div className="assigned-user-input-group">
                                <input
                                    type="text"
                                    value={formData.assignedUser}
                                    onChange={(e) => handleInputChange('assignedUser', e.target.value)}
                                    placeholder="Enter user name"
                                    disabled={isLocked}
                                />
                                <button
                                    type="button"
                                    className={`smart-assign-btn ${smartAssignLoading ? 'loading' : ''}`}
                                    onClick={handleSmartAssign}
                                    disabled={smartAssignLoading || isLocked}
                                    title="Smart assign to user with fewest active tasks"
                                >
                                    {smartAssignLoading ? '⏳' : '🧠'}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Priority</label>
                            <div className="radio-group">
                                <label>
                                    <input
                                        type="radio"
                                        name="priority"
                                        value="low"
                                        checked={formData.priority === 'low'}
                                        onChange={(e) => handleInputChange('priority', e.target.value)}
                                        disabled={isLocked}
                                    /> Low
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="priority"
                                        value="medium"
                                        checked={formData.priority === 'medium'}
                                        onChange={(e) => handleInputChange('priority', e.target.value)}
                                        disabled={isLocked}
                                    /> Medium
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="priority"
                                        value="high"
                                        checked={formData.priority === 'high'}
                                        onChange={(e) => handleInputChange('priority', e.target.value)}
                                        disabled={isLocked}
                                    /> High
                                </label>
                            </div>
                        </div>
                        <button 
                            className={`add-task-button ${isSubmitting ? 'submitting' : ''} ${isLocked ? 'disabled' : ''}`} 
                            onClick={handleSubmit}
                            disabled={isSubmitting || isLocked}
                        >
                            {isSubmitting ? (isEditing ? 'Updating Task...' : 'Adding Task...') : (isEditing ? 'Update Task' : 'Add Task')}
                        </button>
                    </div>
                </div>
            </div>

            {showConflictModal && conflictData && (
                <ConflictModal
                    isOpen={showConflictModal}
                    onClose={() => setShowConflictModal(false)}
                    currentTask={conflictData.currentTask}
                    userChanges={conflictData.userChanges}
                    onResolve={handleConflictResolution}
                />
            )}
        </>
    );
};

export default Overlay;
