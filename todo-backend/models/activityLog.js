const mongoose = require('mongoose');

const activityLogSchema = mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['create', 'edit', 'delete', 'assign', 'status_change', 'drag_drop']
    },
    entityType: {
        type: String,
        required: true,
        enum: ['task']
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    details: {
        type: Object,
        default: {}
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient querying of recent activities
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ entityId: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);