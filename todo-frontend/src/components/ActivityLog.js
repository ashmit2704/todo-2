import React, { useState, useEffect } from 'react';
import './ActivityLog.css';
import io from 'socket.io-client';

const ActivityLog = ({ isOpen, onClose }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const socket = io.connect("http://localhost:3001");

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:3001/activity-log/recent');
            const data = await response.json();
            
            if (data.success) {
                setActivities(data.activities);
                setError(null);
            } else {
                setError(data.message || 'Failed to fetch activities');
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchActivities();
        }
    }, [isOpen]);

    useEffect(() => {
        // Listen for real-time updates
        socket.on('activity-logged', (newActivity) => {
            setActivities(prevActivities => [newActivity, ...prevActivities.slice(0, 19)]);
        });

        return () => {
            socket.off('activity-logged');
        };
    }, [socket]);

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const activityTime = new Date(timestamp);
        const diffInSeconds = Math.floor((now - activityTime) / 1000);
        
        if (diffInSeconds < 60) {
            return `${diffInSeconds} seconds ago`;
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'create':
                return '➕';
            case 'edit':
                return '✏️';
            case 'delete':
                return '🗑️';
            case 'status_change':
            case 'drag_drop':
                return '🔄';
            case 'assign':
                return '👤';
            default:
                return '📝';
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'create':
                return '#4CAF50';
            case 'edit':
                return '#FF9800';
            case 'delete':
                return '#f44336';
            case 'status_change':
            case 'drag_drop':
                return '#2196F3';
            case 'assign':
                return '#9C27B0';
            default:
                return '#757575';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="activity-log-overlay" onClick={onClose}>
            <div className="activity-log-panel" onClick={(e) => e.stopPropagation()}>
                <div className="activity-log-header">
                    <h2>Activity Log</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                
                <div className="activity-log-content">
                    {loading ? (
                        <div className="activity-loading">Loading activities...</div>
                    ) : error ? (
                        <div className="activity-error">
                            <p>Error: {error}</p>
                            <button onClick={fetchActivities} className="retry-button">
                                Retry
                            </button>
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="no-activities">No recent activities</div>
                    ) : (
                        <div className="activities-list">
                            {activities.map((activity, index) => (
                                <div key={activity._id || index} className="activity-item">
                                    <div className="activity-icon" style={{ backgroundColor: getActionColor(activity.action) }}>
                                        {getActionIcon(activity.action)}
                                    </div>
                                    <div className="activity-details">
                                        <div className="activity-text">
                                            {activity.displayText}
                                        </div>
                                        <div className="activity-time">
                                            {formatTimeAgo(activity.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="activity-log-footer">
                    <button onClick={fetchActivities} className="refresh-button">
                        🔄 Refresh
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActivityLog;