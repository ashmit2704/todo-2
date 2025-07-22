const mongoose = require('mongoose');

const taskSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true
    },
    description: String,
    assignedUser: {
        type: String, 
        required: true
    },
    status: {
        type: String, 
        enum: ["todo", "inprogress", "done"], 
        default: "todo"
    },
    priority: {
        type:String, 
        enum: ["low", "medium", "high"], 
        default: "low"
    },
    version: {
        type: Number,
        default: 1
    },
    lastModified: {
        type: Date,
        default: Date.now
    },
    lastModifiedBy: {
        type: String,
        default: 'system'
    },
    currentlyEditingBy: {
        type: String,
        default: null
    },
    editStartTime: {
        type: Date,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Update version and lastModified on save
taskSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.version += 1;
        this.lastModified = new Date();
    }
    
    // Set completedAt when status changes to done
    if (this.isModified('status') && this.status === 'done' && !this.completedAt) {
        this.completedAt = new Date();
    }
    
    // Clear completedAt if status changes from done to something else
    if (this.isModified('status') && this.status !== 'done' && this.completedAt) {
        this.completedAt = null;
    }
    
    next();
});

module.exports = mongoose.model('Task', taskSchema);