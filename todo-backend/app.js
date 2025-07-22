const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
require('dotenv').config();
const { Server } = require('socket.io');

const taskRouter = require('./routes/taskRouter');
const authRouter = require('./routes/authRouter');
const activityLogRouter = require('./routes/activityLogRouter');

const DB_PATH = process.env.MONGODB_URI;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://todo-front-6556.onrender.com",
        methods: ["GET", "POST"]
    }
});

app.use(cors());

const activeEditingSessions = new Map();

io.on('connection', (socket) => {
    console.log("A user has connected", socket.id);
    socket.on('task-status-updated', (data) => {
        socket.broadcast.emit('task-status-updated', data);
    });
    socket.on("form-data", (data) => {
        socket.broadcast.emit("receive-form-data", data);
    });
    socket.on('task-deleted', (data) => {
        socket.broadcast.emit('task-deleted', data);
    });
    socket.on('task-updated', (data) => {
        socket.broadcast.emit('task-updated', data);
    });
    socket.on('activity-logged', (data) => {
        socket.broadcast.emit('activity-logged', data);
    });
    socket.on('task-locked', (data) => {
        activeEditingSessions.set(data.taskId, {
            editorId: data.editorId,
            editorName: data.editorName,
            socketId: socket.id,
            editStartTime: data.editStartTime
        });
        socket.broadcast.emit('task-locked', data);
    });

    socket.on('task-unlocked', (data) => {
        activeEditingSessions.delete(data.taskId);
        socket.broadcast.emit('task-unlocked', data);
    });

    socket.on('task-conflict-detected', (data) => {
        socket.broadcast.emit('task-conflict-detected', data);
    });

    socket.on('task-conflict-resolved', (data) => {
        socket.broadcast.emit('task-conflict-resolved', data);
    });

    socket.on('task-editing-started', (data) => {
        socket.broadcast.emit('task-editing-started', data);
    });

    socket.on('task-editing-stopped', (data) => {
        socket.broadcast.emit('task-editing-stopped', data);
    });

    // Clean up editing sessions when user disconnects
    socket.on('disconnect', () => {
        console.log('User disconnected', socket.id);
        
        // Remove any editing sessions for this socket
        for (const [taskId, session] of activeEditingSessions.entries()) {
            if (session.socketId === socket.id) {
                activeEditingSessions.delete(taskId);
                socket.broadcast.emit('task-unlocked', { taskId });
            }
        }
    });
});

global.io = io;

const store = new MongoDBStore({
    uri: DB_PATH,
    collection: 'session'
})

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: store,
}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res, next) => {
    res.send('Backend Server is running properly');
});

app.use('/todo', taskRouter);
app.use('/auth', authRouter);
app.use('/activity-log', activityLogRouter);

const PORT = 3001;

mongoose.connect(DB_PATH).then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on: http://localhost:${PORT}`);
    });
}).catch(err => {
    console.log('Error while connecting to Database', err);
});
