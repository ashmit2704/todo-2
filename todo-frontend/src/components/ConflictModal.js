import React, { useState } from 'react';
import './ConflictModal.css';

const ConflictModal = ({ 
    isOpen, 
    onClose, 
    currentTask, 
    userChanges, 
    onResolve,
    conflictType = 'edit' // 'edit' or 'status'
}) => {
    const [selectedResolution, setSelectedResolution] = useState('merge');
    const [isResolving, setIsResolving] = useState(false);

    if (!isOpen) return null;

    const handleResolve = async () => {
        setIsResolving(true);
        try {
            await onResolve(selectedResolution);
            onClose();
        } catch (error) {
            console.error('Error resolving conflict:', error);
        } finally {
            setIsResolving(false);
        }
    };

    const getFieldDisplay = (field, currentValue, userValue) => {
        if (currentValue === userValue) {
            return (
                <div className="field-comparison no-conflict">
                    <span className="field-name">{field}:</span>
                    <span className="field-value">{currentValue || 'Empty'}</span>
                </div>
            );
        }

        return (
            <div className="field-comparison has-conflict">
                <span className="field-name">{field}:</span>
                <div className="value-comparison">
                    <div className="current-value">
                        <span className="value-label">Current:</span>
                        <span className="value">{currentValue || 'Empty'}</span>
                    </div>
                    <div className="user-value">
                        <span className="value-label">Your version:</span>
                        <span className="value">{userValue || 'Empty'}</span>
                    </div>
                </div>
            </div>
        );
    };

    const hasConflicts = () => {
        return Object.keys(userChanges).some(key => 
            currentTask[key] !== userChanges[key]
        );
    };

    return (
        <div className="conflict-modal-overlay">
            <div className="conflict-modal">
                <div className="conflict-modal-header">
                    <h2>⚠️ Conflict Detected</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>

                <div className="conflict-modal-content">
                    <div className="conflict-explanation">
                        <p>
                            This task has been modified by another user while you were editing it. 
                            Please choose how to resolve the conflict:
                        </p>
                    </div>

                    <div className="conflict-details">
                        <h3>Changes Comparison</h3>
                        <div className="fields-comparison">
                            {Object.keys(userChanges).map(field => (
                                <div key={field}>
                                    {getFieldDisplay(
                                        field.charAt(0).toUpperCase() + field.slice(1),
                                        currentTask[field],
                                        userChanges[field]
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="resolution-options">
                        <h3>Resolution Options</h3>
                        
                        <label className="resolution-option">
                            <input
                                type="radio"
                                name="resolution"
                                value="merge"
                                checked={selectedResolution === 'merge'}
                                onChange={(e) => setSelectedResolution(e.target.value)}
                            />
                            <div className="option-content">
                                <strong>Smart Merge</strong>
                                <p>Combine both versions intelligently, keeping your changes where possible</p>
                            </div>
                        </label>

                        <label className="resolution-option">
                            <input
                                type="radio"
                                name="resolution"
                                value="overwrite"
                                checked={selectedResolution === 'overwrite'}
                                onChange={(e) => setSelectedResolution(e.target.value)}
                            />
                            <div className="option-content">
                                <strong>Use My Version</strong>
                                <p>Overwrite the current version with your changes</p>
                            </div>
                        </label>

                        <label className="resolution-option">
                            <input
                                type="radio"
                                name="resolution"
                                value="discard"
                                checked={selectedResolution === 'discard'}
                                onChange={(e) => setSelectedResolution(e.target.value)}
                            />
                            <div className="option-content">
                                <strong>Keep Current Version</strong>
                                <p>Discard your changes and keep the current version</p>
                            </div>
                        </label>
                    </div>

                    <div className="conflict-actions">
                        <button 
                            className="cancel-button" 
                            onClick={onClose}
                            disabled={isResolving}
                        >
                            Cancel
                        </button>
                        <button 
                            className="resolve-button" 
                            onClick={handleResolve}
                            disabled={isResolving}
                        >
                            {isResolving ? 'Resolving...' : 'Resolve Conflict'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConflictModal;