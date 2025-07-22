import { useEffect, useState, useCallback } from "react";
import "./Dashboard.css";
import Sidebar from "./Sidebar";
import Overlay from "./Overlay";
import ActivityLog from "./ActivityLog";
import ConflictModal from "./ConflictModal";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";

const TaskCard = ({ task, onDragStart, isDragging, draggedTaskId, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const isBeingDragged = isDragging && draggedTaskId === task._id;

  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/plain", task._id);
    e.dataTransfer.setData("application/json", JSON.stringify(task));
    onDragStart(task._id);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(task);
    setShowActions(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this task?')) {
      onDelete(task._id);
    }
    setShowActions(false);
  };

  const getTimeAgo = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const completedDate = new Date(date);
    const diffInMs = now - completedDate;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div 
      className={`task-card ${isBeingDragged ? 'dragging' : ''}`}
      draggable="true"
      onDragStart={handleDragStart}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="task-card-header">
        <span className="task-title">{task.title}</span>
        <div className="task-actions">
          <span className="priority-indicator" style={{
            backgroundColor: task.priority === 'high' ? '#ff4444' : 
                            task.priority === 'medium' ? '#ffaa00' : '#00cc44'
          }}></span>
          {showActions && (
            <div className="task-action-buttons">
              <button 
                className="edit-btn" 
                onClick={handleEdit}
                title="Edit task"
              >
                ✏️
              </button>
              <button 
                className="delete-btn" 
                onClick={handleDelete}
                title="Delete task"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="task-desc">{task.description}</p>
      <div className="task-footer">
        <div className="task-assigned">
          <img src={`https://ui-avatars.com/api/?name=${task.assignedUser}&background=random`} 
               alt={task.assignedUser} 
               className="avatar" />
          <span className="assigned-name">{task.assignedUser}</span>
        </div>
        {task.status === 'done' && task.completedAt && (
          <div className="completed-info">
            <span className="checkmark">✓</span>
            <span className="completed-text">Completed {getTimeAgo(task.completedAt)}</span>
          </div>
        )}
        {task.currentlyEditingBy && (
          <div className="editing-indicator">
            <span className="editing-icon">✏️</span>
            <span className="editing-text">Being edited</span>
          </div>
        )}
      </div>
    </div>
  );
};

const TaskColumn = ({ title, status, tasks, taskCount, loading, onDrop, isDragOver, onDragEnter, onDragLeave, onDragStart, isDragging, draggedTaskId, onEdit, onDelete }) => {
  const handleDrop = (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    const taskData = JSON.parse(e.dataTransfer.getData("application/json"));
    
    if (taskData.status !== status) {
      onDrop(taskId, status);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div 
      className={`task-column ${isDragOver ? 'drag-over' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
    >
      <div className="column-header">
        <div className="column-title">
          <span>{title}</span>
          <span className="task-count">{taskCount}</span>
        </div>
      </div>
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="tasks-container">
          {tasks.map((task, i) => (
            <TaskCard 
              task={task} 
              key={task._id || i} 
              onDragStart={onDragStart}
              isDragging={isDragging}
              draggedTaskId={draggedTaskId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const socket = io.connect("http://localhost:3001");
  const navigate = useNavigate();

  const [openSide, setOpenSide] = useState(true);
  const [addTaskMenu, setAddTaskMenu] = useState(false);
  const [editTaskMenu, setEditTaskMenu] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [tasks, setTasks] = useState({
    todo: [],
    inprogress: [],
    done: []
  });
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState(null);

  const isLoggedIn = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user._id || user.id || 'anonymous';
  const userName = user.fullName || user.name || 'Anonymous User';

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        // Still remove local storage even if server logout fails
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still remove local storage even if there's an error
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
    setShowDropdown(false);
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('http://localhost:3001/todo/get-task', {
        headers
      });
      if (response.ok) {
        const data = await response.json();
        const {tasks} = data;
        console.log(tasks);
        const groupedTasks = tasks.reduce((acc, task) => {
          if (!acc[task.status]) {
            acc[task.status] = [];
          }
          acc[task.status].push(task);
          return acc;
        }, { todo: [], inprogress: [], done: [] });
        
        setTasks(groupedTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = useCallback(async (taskId, newStatus) => {
    if (!isLoggedIn) {
      alert('Please login to update tasks');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const currentTask = Object.values(tasks).flat().find(task => task._id === taskId);
      const response = await fetch(`http://localhost:3001/todo/update-task-status/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: newStatus,
          version: currentTask?.version,
          userId,
          userName
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Optimistically update the UI
        setTasks(prevTasks => {
          const newTasks = { todo: [], inprogress: [], done: [] };
          
          // Find the task and move it to the new status
          Object.keys(prevTasks).forEach(status => {
            prevTasks[status].forEach(task => {
              if (task._id === taskId) {
                newTasks[newStatus].push({ ...task, status: newStatus });
              } else {
                newTasks[status].push(task);
              }
            });
          });
          
          return newTasks;
        });

        // Emit socket event to notify other users
        socket.emit('task-status-updated', { taskId, newStatus });
      } else if (response.status === 409 && data.conflict) {
        // Handle conflict
        setConflictData({
          currentTask: data.currentTask,
          userChanges: { status: newStatus },
          taskId: taskId,
          conflictType: 'status'
        });
        setShowConflictModal(true);
      } else {
        console.error('Failed to update task status:', data.message);
        // Optionally show error message to user
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      // Optionally show error message to user
    }
  }, [socket, tasks, userId, userName]);

  const handleStatusConflictResolution = async (resolution) => {
    try {
      const response = await fetch(`http://localhost:3001/todo/resolve-conflict/${conflictData.taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resolution,
          userChanges: conflictData.userChanges,
          currentVersion: conflictData.currentTask.version,
          userId,
          userName
        })
      });

      if (response.ok) {
        await fetchTasks();
        setShowConflictModal(false);
        setConflictData(null);
      } else {
        throw new Error('Failed to resolve conflict');
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
      alert('Failed to resolve conflict. Please try again.');
    }
  };

  const deleteTask = useCallback(async (taskId) => {
    if (!isLoggedIn) {
      alert('Please login to delete tasks');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/todo/delete-task/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, userName })
      });

      if (response.ok) {
        // Optimistically remove from UI
        setTasks(prevTasks => {
          const newTasks = { todo: [], inprogress: [], done: [] };
          
          Object.keys(prevTasks).forEach(status => {
            prevTasks[status].forEach(task => {
              if (task._id !== taskId) {
                newTasks[status].push(task);
              }
            });
          });
          
          return newTasks;
        });

        // Emit socket event to notify other users
        socket.emit('task-deleted', { taskId });
      } else {
        console.error('Failed to delete task');
        alert('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task');
    }
  }, [socket, userId, userName]);

  const handleEditTask = (task) => {
    if (!isLoggedIn) {
      alert('Please login to edit tasks');
      return;
    }
    setEditingTask(task);
    setEditTaskMenu(true);
  };

  const handleDragStart = (taskId) => {
    setIsDragging(true);
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDrop = (taskId, newStatus) => {
    if (!isLoggedIn) {
      alert('Please login to update tasks');
      handleDragEnd();
      return;
    }
    updateTaskStatus(taskId, newStatus);
    handleDragEnd();
  };

  const handleDragEnter = (status) => {
    setDragOverColumn(status);
  };

  const handleDragLeave = (e) => {
    // Only clear drag over if we're leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  useEffect(() => {
    socket.on("receive-form-data", async (data) => {
      console.log(data);
      fetchTasks();
    });

    socket.on("task-status-updated", (data) => {
      const { taskId, newStatus } = data;
      setTasks(prevTasks => {
        const newTasks = { todo: [], inprogress: [], done: [] };
        
        Object.keys(prevTasks).forEach(status => {
          prevTasks[status].forEach(task => {
            if (task._id === taskId) {
              newTasks[newStatus].push({ ...task, status: newStatus });
            } else {
              newTasks[status].push(task);
            }
          });
        });
        
        return newTasks;
      });
    });

    socket.on("task-deleted", (data) => {
      const { taskId } = data;
      setTasks(prevTasks => {
        const newTasks = { todo: [], inprogress: [], done: [] };
        
        Object.keys(prevTasks).forEach(status => {
          prevTasks[status].forEach(task => {
            if (task._id !== taskId) {
              newTasks[status].push(task);
            }
          });
        });
        
        return newTasks;
      });
    });

    socket.on("task-updated", (data) => {
      const { task: updatedTask } = data;
      setTasks(prevTasks => {
        const newTasks = { todo: [], inprogress: [], done: [] };
        
        Object.keys(prevTasks).forEach(status => {
          prevTasks[status].forEach(task => {
            if (task._id === updatedTask._id) {
              newTasks[updatedTask.status].push(updatedTask);
            } else {
              newTasks[status].push(task);
            }
          });
        });
        
        return newTasks;
      });
    });

    socket.on("task-locked", (data) => {
      // Update UI to show task is being edited
      setTasks(prevTasks => {
        const newTasks = { todo: [], inprogress: [], done: [] };
        
        Object.keys(prevTasks).forEach(status => {
          prevTasks[status].forEach(task => {
            if (task._id === data.taskId) {
              newTasks[status].push({ 
                ...task, 
                currentlyEditingBy: data.editorName,
                editStartTime: data.editStartTime 
              });
            } else {
              newTasks[status].push(task);
            }
          });
        });
        
        return newTasks;
      });
    });

    socket.on("task-unlocked", (data) => {
      // Update UI to remove editing indicator
      setTasks(prevTasks => {
        const newTasks = { todo: [], inprogress: [], done: [] };
        
        Object.keys(prevTasks).forEach(status => {
          prevTasks[status].forEach(task => {
            if (task._id === data.taskId) {
              const { currentlyEditingBy, editStartTime, ...cleanTask } = task;
              newTasks[status].push(cleanTask);
            } else {
              newTasks[status].push(task);
            }
          });
        });
        
        return newTasks;
      });
    });

    const handleGlobalDragEnd = () => {
      handleDragEnd();
    };

    document.addEventListener('dragend', handleGlobalDragEnd);

    return () => {
      socket.off("receive-form-data");
      socket.off("task-status-updated");
      socket.off("task-deleted");
      socket.off("task-updated");
      socket.off("task-locked");
      socket.off("task-unlocked");
      document.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, [socket]);

  useEffect(() => {
    fetchTasks();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.user-dropdown')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <main className="main">
      <Sidebar openSide={openSide} setOpenSide={setOpenSide} />
      <div className="content">
        <header className="header">
          <div className="header-inside">
            {!openSide && (
              <img
                src="/images/bars.svg"
                alt="Menu"
                className="sidebar-icon"
                style={{cursor: "pointer"}}
                onClick={() => setOpenSide(true)}
              />
            )}
            <span className="title">TaskFlow</span>
          </div>
          {isLoggedIn ? 
          <div className="user-dropdown">
            <div className="user-info" onClick={() => setShowDropdown(!showDropdown)}>
              <img src={`https://ui-avatars.com/api/?name=${user.fullName}&background=random`} 
                  alt={user.fullName} 
                  className="avatar-2" />
              <span className="assigned-name-2">{user.fullName}</span>
              <span style={{ marginLeft: '8px', fontSize: '12px' }}>▼</span>
            </div>
            {showDropdown && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={logout}>
                  <span className="logout-icon">🚪</span>
                  Logout
                </button>
              </div>
            )}
          </div>
          : 
          <div className="auth">
            <button className="auth-login" onClick={() => navigate("/login")}>Login</button>
            <button className="auth-register" onClick={() => navigate("/register")}>Register</button>
          </div>
          }
        </header>
        
        {addTaskMenu && (
          <Overlay
            onClose={() => setAddTaskMenu(false)}
            fetchTasks={fetchTasks}
            setAddTaskMenu={setAddTaskMenu}
          />
        )}

        {editTaskMenu && (
          <Overlay
            onClose={() => {
              setEditTaskMenu(false);
              setEditingTask(null);
            }}
            fetchTasks={fetchTasks}
            setAddTaskMenu={setEditTaskMenu}
            editingTask={editingTask}
            isEditing={true}
          />
        )}

        <ActivityLog
          isOpen={activityLogOpen}
          onClose={() => setActivityLogOpen(false)}
        />

        {showConflictModal && conflictData && (
          <ConflictModal
            isOpen={showConflictModal}
            onClose={() => {
              setShowConflictModal(false);
              setConflictData(null);
            }}
            currentTask={conflictData.currentTask}
            userChanges={conflictData.userChanges}
            onResolve={handleStatusConflictResolution}
            conflictType={conflictData.conflictType}
          />
        )}

        <div className="top-row">
          <div className="search-in">
            <input className="search-bar" placeholder="Search tasks, users, and boards" />
            <img src="/images/magnifying-glass.svg" alt="Search" className="search-icon" />
          </div>
          <div className="top-row-buttons">
            <button onClick={() => setActivityLogOpen(true)} className="activity-log-btn">
              📋 Activity Log
            </button>
            <button onClick={() => {
              if (!isLoggedIn) {
                alert('Please login to add tasks');
                return;
              }
              setAddTaskMenu(true);
            }} className="add-task-btn">
              + Add task
            </button>
          </div>
        </div>
        
        <hr className="ver-line"></hr>

        <div className="task-board">
          <TaskColumn
            title="To Do"
            status="todo"
            tasks={tasks.todo}
            taskCount={tasks.todo.length}
            loading={loading}
            onDrop={handleDrop}
            isDragOver={dragOverColumn === 'todo'}
            onDragEnter={() => handleDragEnter('todo')}
            onDragLeave={handleDragLeave}
            onDragStart={handleDragStart}
            isDragging={isDragging}
            draggedTaskId={draggedTaskId}
            onEdit={handleEditTask}
            onDelete={deleteTask}
          />

          <TaskColumn
            title="In Progress"
            status="inprogress"
            tasks={tasks.inprogress}
            taskCount={tasks.inprogress.length}
            loading={loading}
            onDrop={handleDrop}
            isDragOver={dragOverColumn === 'inprogress'}
            onDragEnter={() => handleDragEnter('inprogress')}
            onDragLeave={handleDragLeave}
            onDragStart={handleDragStart}
            isDragging={isDragging}
            draggedTaskId={draggedTaskId}
            onEdit={handleEditTask}
            onDelete={deleteTask}
          />

          <TaskColumn
            title="Done"
            status="done"
            tasks={tasks.done}
            taskCount={tasks.done.length}
            loading={loading}
            onDrop={handleDrop}
            isDragOver={dragOverColumn === 'done'}
            onDragEnter={() => handleDragEnter('done')}
            onDragLeave={handleDragLeave}
            onDragStart={handleDragStart}
            isDragging={isDragging}
            draggedTaskId={draggedTaskId}
            onEdit={handleEditTask}
            onDelete={deleteTask}
          />
        </div>
      </div>
    </main>
  );
};

export default Dashboard;