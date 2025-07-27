# Live Preview: https://todo-front-6556.onrender.com/

# Collaborative To-Do Application

A modern, real-time collaborative task management application built with React and Node.js. This application features intelligent task assignment, real-time conflict resolution, and comprehensive activity logging.

## 🚀 Project Overview

This is a full-stack collaborative to-do application that allows multiple users to work together on tasks in real-time. The application provides intelligent task assignment suggestions, handles editing conflicts gracefully, and maintains a complete audit trail of all activities.

### Key Highlights
- **Real-time Collaboration**: Multiple users can work simultaneously with live updates
- **Smart Task Assignment**: AI-powered suggestions based on workload distribution
- **Conflict Resolution**: Intelligent handling of simultaneous edits
- **Activity Logging**: Complete audit trail of all user actions
- **Responsive Design**: Modern, mobile-friendly interface

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database with Mongoose ODM
- **Socket.io** - Real-time bidirectional communication
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **express-validator** - Input validation
- **express-session** - Session management

### Frontend
- **React 19.1.0** - Frontend library
- **Socket.io-client** - Real-time client communication
- **Lucide React** - Modern icon library
- **CSS3** - Custom styling with modern features

### Development Tools
- **Nodemon** - Development server with auto-restart
- **React Scripts** - Build tools and development server

## 📋 Prerequisites

Before running this application, make sure you have the following installed:
- **Node.js** (version 14 or higher)
- **npm** (Node Package Manager)
- **MongoDB** (local installation or MongoDB Atlas account)

## 🚀 Setup and Installation Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Backend Setup

#### Navigate to the backend directory:
```bash
cd todo-backend
```

#### Install dependencies:
```bash
npm install
```

#### Environment Configuration:
Create a `.env` file in the `todo-backend` directory with the following variables:
```env
MONGODB_URI=mongodb://localhost:27017/todo-app
# Or for MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/todo-app

SESSION_SECRET=your-super-secret-session-key
JWT_SECRET=your-jwt-secret-key
PORT=3001
```

#### Start the backend server:
```bash
npm start
```

The backend server will run on `http://localhost:3001`

### 3. Frontend Setup

#### Open a new terminal and navigate to the frontend directory:
```bash
cd todo-frontend
```

#### Install dependencies:
```bash
npm install
```

#### Start the frontend development server:
```bash
npm start
```

The frontend application will run on `http://localhost:3000`

### 4. Access the Application

Open your web browser and navigate to `http://localhost:3000` to start using the application.

## ✨ Features List and Usage Guide

### 🔐 Authentication System
- **User Registration**: Create new accounts with email verification
- **User Login**: Secure authentication with JWT tokens
- **Session Management**: Persistent login sessions

### 📋 Task Management
- **Create Tasks**: Add new tasks with title, description, priority, and assignment
- **Edit Tasks**: Modify task details with real-time conflict detection
- **Delete Tasks**: Remove tasks with confirmation
- **Status Tracking**: Track tasks through todo → in-progress → done workflow
- **Priority Levels**: Organize tasks by low, medium, or high priority

### 👥 Collaborative Features
- **Real-time Updates**: See changes made by other users instantly
- **Task Locking**: Prevent simultaneous editing conflicts
- **Live Status Updates**: Real-time status changes across all connected users
- **User Presence**: See who is currently editing which tasks

### 🧠 Smart Assignment System
- **Intelligent Suggestions**: Get AI-powered task assignment recommendations
- **Workload Balancing**: Automatically suggests users with the least active tasks
- **Load Distribution**: Considers only active tasks (todo and in-progress) for fair distribution

### ⚡ Real-time Conflict Resolution
- **Conflict Detection**: Automatically detects when multiple users edit the same task
- **Resolution Options**: Choose between overwrite, merge, or discard changes
- **Version Control**: Track task versions to prevent data loss

### 📊 Activity Logging
- **Comprehensive Tracking**: Log all user actions and system events
- **Audit Trail**: Complete history of task modifications
- **User Attribution**: Track who made what changes and when

### 🎨 User Interface
- **Modern Design**: Clean, intuitive interface with smooth animations
- **Responsive Layout**: Works seamlessly on desktop and mobile devices
- **Dark/Light Themes**: Comfortable viewing in any environment
- **Interactive Elements**: Hover effects, loading states, and visual feedback

## 🧠 Smart Assign Logic Explanation

The Smart Assign feature uses an intelligent algorithm to suggest the most suitable user for task assignment based on current workload distribution.

### Algorithm Details:

1. **User Query**: The system retrieves all registered users from the database
2. **Workload Analysis**: For each user, it counts their active tasks (status: 'todo' or 'inprogress')
3. **Load Balancing**: Users are sorted by their active task count in ascending order
4. **Recommendation**: The user with the fewest active tasks is suggested as the optimal assignee

### Key Features:
- **Fair Distribution**: Ensures workload is distributed evenly among team members
- **Real-time Calculation**: Always considers the current state of tasks
- **Excludes Completed Tasks**: Only counts active work to provide accurate recommendations
- **Fallback Handling**: Gracefully handles scenarios with no available users

### API Endpoint:
```javascript
GET /todo/smart-assign-suggestion
```

### Response Format:
```json
{
  "success": true,
  "suggestedUser": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "activeTaskCount": 2
  },
  "allUsers": [
    // Sorted list of all users with their task counts
  ]
}
```

## ⚔️ Conflict Handling Logic Explanation

The application implements a sophisticated conflict resolution system to handle simultaneous edits gracefully.

### Conflict Detection:

1. **Version Tracking**: Each task maintains a version number that increments on every save
2. **Optimistic Locking**: Users can edit tasks freely, but conflicts are detected on save
3. **Real-time Monitoring**: Socket.io broadcasts changes to all connected clients
4. **Edit Session Tracking**: Tasks can be locked for editing with timeout mechanisms

### Conflict Resolution Process:

#### 1. **Detection Phase**:
```javascript
// Version comparison
const hasConflict = task.version > parseInt(userVersion);
```

#### 2. **Resolution Options**:

**Overwrite**: 
- User changes completely replace the current version
- Use case: When user changes are more important than concurrent modifications

**Merge**: 
- Intelligent merging of changes from both versions
- Field-level conflict resolution
- Preserves non-conflicting changes from both versions

**Discard**: 
- User changes are discarded, current version is kept
- Use case: When concurrent changes are more important

#### 3. **Implementation Details**:

```javascript
// Task locking mechanism
exports.lockTaskForEditing = async (req, res) => {
  // Check if task is already being edited
  if (task.currentlyEditingBy && task.currentlyEditingBy !== userId) {
    const timeSinceEdit = new Date() - task.editStartTime;
    // Auto-unlock after 5 minutes of inactivity
    if (timeSinceEdit < 5 * 60 * 1000) {
      return res.status(409).json({
        success: false,
        message: 'Task is currently being edited by another user'
      });
    }
  }
  
  // Lock the task
  task.currentlyEditingBy = userId;
  task.editStartTime = new Date();
  await task.save();
};
```

### Real-time Communication:

The system uses Socket.io events for real-time conflict management:

- `task-locked`: Notifies when a user starts editing
- `task-unlocked`: Notifies when editing session ends
- `task-conflict-detected`: Alerts about detected conflicts
- `task-conflict-resolved`: Broadcasts resolution results

### Safety Mechanisms:

1. **Auto-unlock**: Tasks are automatically unlocked after 5 minutes of inactivity
2. **Disconnect Handling**: Editing locks are released when users disconnect
3. **Version Validation**: All updates are validated against current version
4. **Rollback Capability**: Failed conflict resolutions don't corrupt data

## 🏗️ Architecture Overview

```
┌─────────────────┐    HTTP/WebSocket    ┌─────────────────┐
│   React Client  │ ◄─────────────────► │   Express API   │
│   (Frontend)    │                      │   (Backend)     │
└─────────────────┘                      └─────────────────┘
         │                                        │
         │ Socket.io                             │ Mongoose ODM
         │ Real-time                             │
         ▼                                        ▼
┌─────────────────┐                      ┌─────────────────┐
│   Socket.io     │                      │    MongoDB      │
│   Server        │                      │   Database      │
└─────────────────┘                      └─────────────────┘
```

## 📝 API Documentation

### Authentication Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### Task Management Endpoints
- `GET /todo/tasks` - Get all tasks
- `POST /todo/tasks` - Create new task
- `PUT /todo/tasks/:id` - Update task
- `DELETE /todo/tasks/:id` - Delete task
- `POST /todo/lock-task/:id` - Lock task for editing
- `POST /todo/unlock-task/:id` - Unlock task

### Smart Features Endpoints
- `GET /todo/smart-assign-suggestion` - Get assignment suggestion
- `GET /todo/check-conflict/:id` - Check for conflicts
- `POST /todo/resolve-conflict/:id` - Resolve conflicts

### Activity Logging Endpoints
- `GET /activity-log/logs` - Get activity logs
- `POST /activity-log/log` - Create activity log

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🐛 Troubleshooting

### Common Issues:

1. **MongoDB Connection Error**: Ensure MongoDB is running and the connection string is correct
2. **Port Already in Use**: Change the port in the `.env` file if 3001 is occupied
3. **CORS Issues**: Verify that the frontend URL is correctly configured in the backend CORS settings
4. **Socket.io Connection Failed**: Check that both frontend and backend are running on the correct ports

### Getting Help:

If you encounter any issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed
4. Check that MongoDB is running and accessible

---

Built with ❤️ using modern web technologies for seamless collaboration.
