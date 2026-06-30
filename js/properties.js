/**
 * Properties Panel Module - Value inputs and easing selection
 */
class PropertiesPanel {
    constructor() {
        this.inputs = {
            x: document.getElementById('prop-x'),
            y: document.getElementById('prop-y'),
            angle: document.getElementById('prop-angle'),
            scaleX: document.getElementById('prop-scaleX'),
            scaleY: document.getElementById('prop-scaleY'),
            opacity: document.getElementById('prop-opacity'),
            opacitySlider: document.getElementById('prop-opacity-slider'),
            zIndex: document.getElementById('prop-zIndex'),
            hidden: document.getElementById('prop-hidden'),
            flipX: document.getElementById('prop-flipX'),
            flipY: document.getElementById('prop-flipY'),
            animationName: document.getElementById('prop-animationName')
        };
        
        this.easingSection = document.getElementById('easing-section');
        this.easingType = document.getElementById('easing-type');
        this.easingPreset = document.getElementById('easing-preset');
        this.bezierValues = document.getElementById('bezier-values');
        this.btnEditBezier = document.getElementById('btn-edit-bezier');
        
        this.keyframeButtons = document.querySelectorAll('.btn-keyframe');
        
        this.currentKeyframe = null;
        this.currentTrack = null;
        
        this.easingPresets = {
            easeInOut: [0.42, 0.0, 0.58, 1.0],
            easeIn: [0.42, 0.0, 1.0, 1.0],
            easeOut: [0.0, 0.0, 0.58, 1.0],
            easeInBack: [0.36, 0.0, 0.66, -0.56],
            easeOutBack: [0.34, 1.56, 0.64, 1.0],
            easeInOutCubic: [0.65, 0.0, 0.35, 1.0],
            easeInCubic: [0.32, 0.0, 0.67, 0.0],
            easeOutCubic: [0.33, 1.0, 0.68, 1.0]
        };
        
        this.listeners = {
            valueChange: [],
            keyframeToggle: [],
            easingChange: [],
            openBezierEditor: []
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        Object.entries(this.inputs).forEach(([prop, input]) => {
            if (!input) return;
            
            if (input.type === 'checkbox') {
                input.addEventListener('change', () => {
                    this.notifyValueChange(prop, input.checked);
                });
            } else if (input.type === 'range') {
                input.addEventListener('input', () => {
                    const value = parseFloat(input.value);
                    this.inputs.opacity.value = value;
                    this.notifyValueChange('opacity', value);
                });
            } else if (input.type === 'number') {
                input.addEventListener('change', () => {
                    const value = parseFloat(input.value);
                    if (prop === 'opacity') {
                        this.inputs.opacitySlider.value = value;
                    }
                    this.notifyValueChange(prop, value);
                });
            } else if (input.type === 'text') {
                input.addEventListener('change', () => {
                    this.notifyValueChange(prop, input.value);
                });
            }
        });
        
        this.keyframeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const prop = btn.dataset.prop;
                this.notifyKeyframeToggle(prop);
            });
        });
        
        this.easingType.addEventListener('change', () => {
            this.updateEasingUI();
            this.notifyEasingChange();
        });
        
        this.easingPreset.addEventListener('change', () => {
            if (this.easingPreset.value !== 'custom') {
                const preset = this.easingPresets[this.easingPreset.value];
                if (preset) {
                    this.bezierValues.value = preset.join(', ');
                    this.notifyEasingChange();
                }
            }
        });
        
        this.btnEditBezier.addEventListener('click', () => {
            this.notifyOpenBezierEditor();
        });
    }

    updateEasingUI() {
        const type = this.easingType.value;
        const isCubicBezier = type === 'cubicBezier';
        
        this.easingPreset.classList.toggle('hidden', !isCubicBezier);
        this.bezierValues.classList.toggle('hidden', !isCubicBezier);
        this.btnEditBezier.classList.toggle('hidden', !isCubicBezier);
    }

    showEasingSection(show) {
        this.easingSection.classList.toggle('hidden', !show);
    }

    setValues(values) {
        if (values.x !== undefined) this.inputs.x.value = Math.round(values.x * 100) / 100;
        if (values.y !== undefined) this.inputs.y.value = Math.round(values.y * 100) / 100;
        if (values.angle !== undefined) this.inputs.angle.value = Math.round(values.angle * 100) / 100;
        if (values.scaleX !== undefined) this.inputs.scaleX.value = Math.round(values.scaleX * 100) / 100;
        if (values.scaleY !== undefined) this.inputs.scaleY.value = Math.round(values.scaleY * 100) / 100;
        if (values.opacity !== undefined) {
            this.inputs.opacity.value = Math.round(values.opacity);
            this.inputs.opacitySlider.value = Math.round(values.opacity);
        }
        if (values.zIndex !== undefined) this.inputs.zIndex.value = Math.round(values.zIndex);
        if (values.hidden !== undefined) this.inputs.hidden.checked = values.hidden;
        if (values.flipX !== undefined) this.inputs.flipX.checked = values.flipX;
        if (values.flipY !== undefined) this.inputs.flipY.checked = values.flipY;
        if (values.animationName !== undefined) this.inputs.animationName.value = values.animationName;
    }

    getValues() {
        return {
            x: parseFloat(this.inputs.x.value) || 0,
            y: parseFloat(this.inputs.y.value) || 0,
            angle: parseFloat(this.inputs.angle.value) || 0,
            scaleX: parseFloat(this.inputs.scaleX.value) || 1,
            scaleY: parseFloat(this.inputs.scaleY.value) || 1,
            opacity: parseInt(this.inputs.opacity.value) || 255,
            zIndex: parseInt(this.inputs.zIndex.value) || 0,
            hidden: this.inputs.hidden.checked,
            flipX: this.inputs.flipX.checked,
            flipY: this.inputs.flipY.checked,
            animationName: this.inputs.animationName.value || ''
        };
    }

    setKeyframeState(trackName, hasKeyframe) {
        const btn = document.querySelector(`.btn-keyframe[data-prop="${trackName}"]`);
        if (btn) {
            btn.classList.toggle('active', hasKeyframe);
        }
    }

    updateKeyframeStates(tracks, currentTime) {
        const tolerance = 0.001;
        
        this.keyframeButtons.forEach(btn => {
            const prop = btn.dataset.prop;
            const track = tracks[prop];
            let hasKeyframe = false;
            
            if (track && track.keyframes) {
                hasKeyframe = track.keyframes.some(kf => Math.abs(kf.time - currentTime) < tolerance);
            }
            
            btn.classList.toggle('active', hasKeyframe);
        });
    }

    setSelectedKeyframe(trackName, keyframe) {
        this.currentTrack = trackName;
        this.currentKeyframe = keyframe;
        
        if (keyframe && keyframe.easing) {
            this.easingType.value = keyframe.easing.type || 'linear';
            if (keyframe.easing.type === 'cubicBezier' && keyframe.easing.controlPoints) {
                this.bezierValues.value = keyframe.easing.controlPoints.join(', ');
                this.matchPreset(keyframe.easing.controlPoints);
            }
        } else {
            this.easingType.value = 'linear';
            this.easingPreset.value = 'custom';
            this.bezierValues.value = '';
        }
        
        this.updateEasingUI();
    }

    matchPreset(controlPoints) {
        for (const [name, preset] of Object.entries(this.easingPresets)) {
            if (this.arraysEqual(controlPoints, preset)) {
                this.easingPreset.value = name;
                return;
            }
        }
        this.easingPreset.value = 'custom';
    }

    arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (Math.abs(a[i] - b[i]) > 0.001) return false;
        }
        return true;
    }

    getEasing() {
        const type = this.easingType.value;
        
        if (type === 'linear') {
            return { type: 'linear' };
        } else if (type === 'step') {
            return { type: 'step' };
        } else if (type === 'cubicBezier') {
            const valuesStr = this.bezierValues.value;
            const values = valuesStr.split(',').map(v => parseFloat(v.trim()));
            if (values.length === 4 && values.every(v => !isNaN(v))) {
                return {
                    type: 'cubicBezier',
                    controlPoints: values
                };
            }
            return { type: 'cubicBezier', controlPoints: [0.42, 0, 0.58, 1] };
        }
        
        return { type: 'linear' };
    }

    setBezierValues(controlPoints) {
        this.bezierValues.value = controlPoints.join(', ');
        this.matchPreset(controlPoints);
    }
    
    setObjectName(name) {
        const input = document.getElementById('prop-object-name');
        if (input) {
            input.value = name || '';
        }
    }

    onValueChange(callback) {
        this.listeners.valueChange.push(callback);
    }

    onKeyframeToggle(callback) {
        this.listeners.keyframeToggle.push(callback);
    }

    onEasingChange(callback) {
        this.listeners.easingChange.push(callback);
    }

    onOpenBezierEditor(callback) {
        this.listeners.openBezierEditor.push(callback);
    }

    notifyValueChange(prop, value) {
        this.listeners.valueChange.forEach(cb => cb(prop, value));
    }

    notifyKeyframeToggle(prop) {
        this.listeners.keyframeToggle.forEach(cb => cb(prop));
    }

    notifyEasingChange() {
        const easing = this.getEasing();
        this.listeners.easingChange.forEach(cb => cb(easing));
    }

    notifyOpenBezierEditor() {
        const currentValues = this.bezierValues.value.split(',').map(v => parseFloat(v.trim()));
        if (currentValues.length === 4 && currentValues.every(v => !isNaN(v))) {
            this.listeners.openBezierEditor.forEach(cb => cb(currentValues));
        } else {
            this.listeners.openBezierEditor.forEach(cb => cb([0.42, 0, 0.58, 1]));
        }
    }
}

window.PropertiesPanel = PropertiesPanel;
