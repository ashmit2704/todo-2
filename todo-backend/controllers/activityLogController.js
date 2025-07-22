const ActivityLog = require('../models/activityLog');

// Helper function to log activities
exports.logActivity = async (action, entityType, entityId, userId, userName, details = {}) => {
    try {
        const activityLog = new ActivityLog({
            action,
            entityType,
            entityId,
            userId,
            userName,
            details
        });
        await activityLog.save();
        
        // Emit real-time update if io is available
        if (global.io) {
            const formattedActivity = {
                ...activityLog.toObject(),
                displayText: generateDisplayText(activityLog)
            };
            global.io.emit('activity-logged', formattedActivity);
        }
        
        return activityLog;
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

// Get last 20 activities
exports.getRecentActivities = async (req, res) => {
    try {
        const activities = await ActivityLog.find()
            .sort({ timestamp: -1 })
            .limit(20)
            .lean(); // Use lean() for better performance

        // Format activities for frontend
        const formattedActivities = activities.map(activity => ({
            _id: activity._id,
            action: activity.action,
            entityType: activity.entityType,
            entityId: activity.entityId,
            userId: activity.userId,
            userName: activity.userName,
            details: activity.details,
            timestamp: activity.timestamp,
            displayText: generateDisplayText(activity)
        }));

        res.status(200).json({
            success: true,
            message: 'Recent activities fetched successfully',
            activities: formattedActivities
        });
    } catch (error) {
        console.error('Error fetching recent activities:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent activities',
            error: error.message
        });
    }
};

// Helper function to generate display text for activities
const generateDisplayText = (activity) => {
    const { action, userName, details } = activity;
    
    switch (action) {
        case 'create':
            return `${userName} created task "${details.title || 'Unknown'}"`;
        case 'edit':
            return `${userName} edited task "${details.title || 'Unknown'}"`;
        case 'delete':
            return `${userName} deleted task "${details.title || 'Unknown'}"`;
        case 'assign':
            return `${userName} assigned task "${details.title || 'Unknown'}" to ${details.assignedTo || 'Unknown'}`;
        case 'status_change':
            return `${userName} moved task "${details.title || 'Unknown'}" from ${details.oldStatus || 'Unknown'} to ${details.newStatus || 'Unknown'}`;
        case 'drag_drop':
            return `${userName} moved task "${details.title || 'Unknown'}" to ${details.newStatus || 'Unknown'}`;
        default:
            return `${userName} performed ${action} on task`;
    }
};