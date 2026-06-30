/**
 * History Manager - Undo/Redo system using Command Pattern
 */
class HistoryManager {
    constructor(maxSize = 100) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxSize = maxSize;
        this.listeners = [];
    }

    /**
     * Execute a command and add to history
     * @param {object} command - { execute: fn, undo: fn, description: string }
     */
    execute(command) {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = [];
        
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
        
        this.notifyListeners();
    }

    /**
     * Undo the last command
     */
    undo() {
        if (!this.canUndo()) return;
        
        const command = this.undoStack.pop();
        command.undo();
        this.redoStack.push(command);
        
        this.notifyListeners();
    }

    /**
     * Redo the last undone command
     */
    redo() {
        if (!this.canRedo()) return;
        
        const command = this.redoStack.pop();
        command.execute();
        this.undoStack.push(command);
        
        this.notifyListeners();
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Clear all history
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.notifyListeners();
    }

    /**
     * Add listener for history changes
     * @param {function} listener
     */
    addListener(listener) {
        this.listeners.push(listener);
    }

    notifyListeners() {
        this.listeners.forEach(listener => listener({
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        }));
    }
}

/**
 * Command factory functions
 */
const Commands = {
    /**
     * Create a command for changing a property value
     */
    changeValue(target, property, newValue, oldValue, onUpdate) {
        return {
            description: `Change ${property}`,
            execute() {
                target[property] = newValue;
                if (onUpdate) onUpdate();
            },
            undo() {
                target[property] = oldValue;
                if (onUpdate) onUpdate();
            }
        };
    },

    /**
     * Create a command for adding a keyframe
     */
    addKeyframe(tracks, trackName, keyframe, onUpdate) {
        return {
            description: `Add keyframe to ${trackName}`,
            execute() {
                if (!tracks[trackName]) {
                    tracks[trackName] = { keyframes: [] };
                }
                tracks[trackName].keyframes.push({ ...keyframe });
                tracks[trackName].keyframes.sort((a, b) => a.time - b.time);
                if (onUpdate) onUpdate();
            },
            undo() {
                const kfs = tracks[trackName].keyframes;
                const idx = kfs.findIndex(k => k.time === keyframe.time);
                if (idx !== -1) {
                    kfs.splice(idx, 1);
                }
                if (kfs.length === 0) {
                    delete tracks[trackName];
                }
                if (onUpdate) onUpdate();
            }
        };
    },

    /**
     * Create a command for removing a keyframe
     */
    removeKeyframe(tracks, trackName, keyframeIndex, onUpdate) {
        const removedKeyframe = JSON.parse(JSON.stringify(tracks[trackName].keyframes[keyframeIndex]));
        return {
            description: `Remove keyframe from ${trackName}`,
            execute() {
                tracks[trackName].keyframes.splice(keyframeIndex, 1);
                if (tracks[trackName].keyframes.length === 0) {
                    delete tracks[trackName];
                }
                if (onUpdate) onUpdate();
            },
            undo() {
                if (!tracks[trackName]) {
                    tracks[trackName] = { keyframes: [] };
                }
                tracks[trackName].keyframes.push({ ...removedKeyframe });
                tracks[trackName].keyframes.sort((a, b) => a.time - b.time);
                if (onUpdate) onUpdate();
            }
        };
    },

    /**
     * Create a command for moving a keyframe
     */
    moveKeyframe(tracks, trackName, keyframeIndex, newTime, oldTime, onUpdate) {
        return {
            description: `Move keyframe in ${trackName}`,
            execute() {
                tracks[trackName].keyframes[keyframeIndex].time = newTime;
                tracks[trackName].keyframes.sort((a, b) => a.time - b.time);
                if (onUpdate) onUpdate();
            },
            undo() {
                const kf = tracks[trackName].keyframes.find(k => k.time === newTime);
                if (kf) {
                    kf.time = oldTime;
                    tracks[trackName].keyframes.sort((a, b) => a.time - b.time);
                }
                if (onUpdate) onUpdate();
            }
        };
    },

    /**
     * Create a command for updating keyframe value
     */
    updateKeyframeValue(tracks, trackName, keyframeIndex, newValue, oldValue, onUpdate) {
        return {
            description: `Update keyframe value in ${trackName}`,
            execute() {
                tracks[trackName].keyframes[keyframeIndex].value = newValue;
                if (onUpdate) onUpdate();
            },
            undo() {
                tracks[trackName].keyframes[keyframeIndex].value = oldValue;
                if (onUpdate) onUpdate();
            }
        };
    },

    /**
     * Create a command for updating keyframe easing
     */
    updateKeyframeEasing(tracks, trackName, keyframeIndex, newEasing, oldEasing, onUpdate) {
        return {
            description: `Update easing in ${trackName}`,
            execute() {
                if (newEasing) {
                    tracks[trackName].keyframes[keyframeIndex].easing = JSON.parse(JSON.stringify(newEasing));
                } else {
                    delete tracks[trackName].keyframes[keyframeIndex].easing;
                }
                if (onUpdate) onUpdate();
            },
            undo() {
                if (oldEasing) {
                    tracks[trackName].keyframes[keyframeIndex].easing = JSON.parse(JSON.stringify(oldEasing));
                } else {
                    delete tracks[trackName].keyframes[keyframeIndex].easing;
                }
                if (onUpdate) onUpdate();
            }
        };
    },

    /**
     * Create a batch command for multiple operations
     */
    batch(commands, description) {
        return {
            description: description || 'Batch operation',
            execute() {
                commands.forEach(cmd => cmd.execute());
            },
            undo() {
                [...commands].reverse().forEach(cmd => cmd.undo());
            }
        };
    }
};

window.HistoryManager = HistoryManager;
window.Commands = Commands;
