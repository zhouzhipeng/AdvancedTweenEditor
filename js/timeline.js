/**
 * Timeline Module - Track rendering and keyframe management
 */
class Timeline {
    constructor(options) {
        this.tracksContainer = document.getElementById('timeline-tracks');
        this.tracksWrapper = document.getElementById('timeline-tracks-container');
        this.playhead = document.getElementById('playhead');
        this.ruler = document.getElementById('timeline-ruler');
        this.rulerInner = document.getElementById('timeline-ruler-inner');
        this.currentTimeEl = document.getElementById('current-time');
        this.totalTimeEl = document.getElementById('total-time');
        
        this.duration = 3.0;
        this.currentTime = 0;
        this.pixelsPerSecond = 100;
        this.isPlaying = false;
        this.playStartTime = 0;
        this.playStartTimestamp = 0;
        this.loop = false;
        
        this.tracks = {};
        this.selectedKeyframe = null;
        this.selectedTrack = null;
        
        this.isDraggingPlayhead = false;
        this.isDraggingKeyframe = false;
        this.draggedKeyframe = null;
        this.dragStartTime = 0;
        
        this.listeners = {
            timeChange: [],
            keyframeSelect: [],
            keyframeMove: [],
            trackSelect: []
        };
        
        this.trackOrder = [
            'x', 'y', 'angle', 'scaleX', 'scaleY', 
            'opacity', 'zIndex', 'hidden', 'flipX', 'flipY', 'animationName'
        ];
        
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        this.tracksWrapper.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.tracksWrapper.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.tracksWrapper.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.tracksWrapper.addEventListener('mouseleave', this.onMouseUp.bind(this));
        
        // Sync ruler scroll with tracks scroll using transform
        this.tracksWrapper.addEventListener('scroll', () => {
            this.rulerInner.style.transform = `translateX(-${this.tracksWrapper.scrollLeft}px)`;
        });
        
        this.ruler.addEventListener('mousedown', this.onRulerMouseDown.bind(this));
        
        // Current time input change
        this.currentTimeEl.addEventListener('change', () => {
            const time = parseFloat(this.currentTimeEl.value) || 0;
            this.setCurrentTime(time);
        });
        
        document.querySelectorAll('.track-label').forEach(label => {
            label.addEventListener('click', (e) => {
                const trackName = e.target.dataset.track;
                this.selectTrack(trackName);
            });
        });
    }

    setDuration(duration) {
        this.duration = Math.max(0.1, duration);
        this.totalTimeEl.textContent = this.duration.toFixed(2) + 's';
        this.render();
    }

    setLoop(loop) {
        this.loop = loop;
    }

    setCurrentTime(time) {
        this.currentTime = Math.max(0, Math.min(this.duration, time));
        this.updatePlayhead();
        this.currentTimeEl.value = this.currentTime.toFixed(2);
        this.notifyTimeChange();
    }

    getCurrentTime() {
        return this.currentTime;
    }

    setTracks(tracks) {
        this.tracks = tracks;
        this.render();
    }

    getTracks() {
        return this.tracks;
    }

    play() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.playStartTime = this.currentTime;
        this.playStartTimestamp = performance.now();
        this.animate();
    }

    pause() {
        this.isPlaying = false;
    }

    stop() {
        this.isPlaying = false;
        this.setCurrentTime(0);
    }

    animate() {
        if (!this.isPlaying) return;
        
        const elapsed = (performance.now() - this.playStartTimestamp) / 1000;
        let newTime = this.playStartTime + elapsed;
        
        if (newTime >= this.duration) {
            if (this.loop) {
                newTime = newTime % this.duration;
                this.playStartTime = 0;
                this.playStartTimestamp = performance.now() - (newTime * 1000);
            } else {
                this.setCurrentTime(this.duration);
                this.isPlaying = false;
                this.notifyPlayStateChange(false);
                return;
            }
        }
        
        this.setCurrentTime(newTime);
        requestAnimationFrame(() => this.animate());
    }

    timeToX(time) {
        return time * this.pixelsPerSecond;
    }

    xToTime(x) {
        return x / this.pixelsPerSecond;
    }

    render() {
        const width = Math.max(this.duration * this.pixelsPerSecond + 50, this.tracksWrapper.clientWidth);
        this.tracksContainer.style.width = width + 'px';
        
        this.renderRuler();
        this.renderKeyframes();
        this.updatePlayhead();
    }

    renderRuler() {
        this.rulerInner.innerHTML = '';
        this.rulerInner.style.width = (this.duration * this.pixelsPerSecond + 50) + 'px';
        
        const majorStep = 1;
        const minorStep = 0.1;
        
        for (let t = 0; t <= this.duration; t += minorStep) {
            const x = this.timeToX(t);
            const marker = document.createElement('div');
            marker.style.cssText = `
                position: absolute;
                left: ${x}px;
                bottom: 0;
                width: 1px;
                background: #404060;
            `;
            
            if (Math.abs(t % majorStep) < 0.001 || Math.abs(t % majorStep - majorStep) < 0.001) {
                marker.style.height = '12px';
                const label = document.createElement('span');
                label.style.cssText = `
                    position: absolute;
                    left: ${x}px;
                    top: 2px;
                    font-size: 10px;
                    color: #a0a0a0;
                    transform: translateX(-50%);
                `;
                label.textContent = t.toFixed(1) + 's';
                this.rulerInner.appendChild(label);
            } else {
                marker.style.height = '6px';
            }
            
            this.rulerInner.appendChild(marker);
        }
    }

    renderKeyframes() {
        document.querySelectorAll('.track').forEach(track => {
            const existing = track.querySelectorAll('.keyframe');
            existing.forEach(kf => kf.remove());
        });
        
        for (const [trackName, trackData] of Object.entries(this.tracks)) {
            const trackEl = document.querySelector(`.track[data-track="${trackName}"]`);
            if (!trackEl || !trackData.keyframes) continue;
            
            trackData.keyframes.forEach((kf, index) => {
                const x = this.timeToX(kf.time);
                const keyframeEl = document.createElement('div');
                keyframeEl.className = 'keyframe';
                keyframeEl.style.left = x + 'px';
                keyframeEl.dataset.track = trackName;
                keyframeEl.dataset.index = index;
                keyframeEl.dataset.time = kf.time;
                
                if (this.selectedKeyframe && 
                    this.selectedKeyframe.track === trackName && 
                    this.selectedKeyframe.index === index) {
                    keyframeEl.classList.add('selected');
                }
                
                trackEl.appendChild(keyframeEl);
            });
        }
    }

    updatePlayhead() {
        const x = this.timeToX(this.currentTime);
        this.playhead.style.left = x + 'px';
    }

    selectTrack(trackName) {
        document.querySelectorAll('.track-label').forEach(label => {
            label.classList.toggle('selected', label.dataset.track === trackName);
        });
        this.selectedTrack = trackName;
        this.notifyTrackSelect(trackName);
    }

    selectKeyframe(trackName, index) {
        this.selectedKeyframe = { track: trackName, index: index };
        this.render();
        this.notifyKeyframeSelect(trackName, index);
    }

    deselectKeyframe() {
        this.selectedKeyframe = null;
        this.render();
        this.notifyKeyframeSelect(null, null);
    }

    getKeyframeAt(trackName, time, tolerance = 0.05) {
        const track = this.tracks[trackName];
        if (!track || !track.keyframes) return null;
        
        for (let i = 0; i < track.keyframes.length; i++) {
            if (Math.abs(track.keyframes[i].time - time) < tolerance) {
                return { index: i, keyframe: track.keyframes[i] };
            }
        }
        return null;
    }

    getSelectedKeyframeData() {
        if (!this.selectedKeyframe) return null;
        const track = this.tracks[this.selectedKeyframe.track];
        if (!track || !track.keyframes) return null;
        return {
            track: this.selectedKeyframe.track,
            index: this.selectedKeyframe.index,
            keyframe: track.keyframes[this.selectedKeyframe.index]
        };
    }

    onMouseDown(e) {
        const rect = this.tracksWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left + this.tracksWrapper.scrollLeft;
        const y = e.clientY - rect.top;
        
        const keyframeEl = e.target.closest('.keyframe');
        if (keyframeEl) {
            const trackName = keyframeEl.dataset.track;
            const index = parseInt(keyframeEl.dataset.index);
            this.selectKeyframe(trackName, index);
            
            this.isDraggingKeyframe = true;
            this.draggedKeyframe = { track: trackName, index: index };
            this.dragStartTime = parseFloat(keyframeEl.dataset.time);
            return;
        }
        
        const trackEl = e.target.closest('.track');
        if (trackEl) {
            const time = this.xToTime(x);
            this.setCurrentTime(time);
            this.isDraggingPlayhead = true;
        }
    }

    onMouseMove(e) {
        if (!this.isDraggingPlayhead && !this.isDraggingKeyframe) return;
        
        const rect = this.tracksWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left + this.tracksWrapper.scrollLeft;
        const time = Math.max(0, Math.min(this.duration, this.xToTime(x)));
        
        if (this.isDraggingPlayhead) {
            this.setCurrentTime(time);
        } else if (this.isDraggingKeyframe && this.draggedKeyframe) {
            const snappedTime = Math.round(time * 20) / 20;
            this.notifyKeyframeMove(
                this.draggedKeyframe.track,
                this.draggedKeyframe.index,
                snappedTime,
                this.dragStartTime
            );
        }
    }

    onMouseUp(e) {
        this.isDraggingPlayhead = false;
        this.isDraggingKeyframe = false;
        this.draggedKeyframe = null;
    }

    onRulerMouseDown(e) {
        const rect = this.ruler.getBoundingClientRect();
        const x = e.clientX - rect.left + this.tracksWrapper.scrollLeft;
        const time = this.xToTime(x);
        this.setCurrentTime(time);
        
        const onMove = (e) => {
            const x = e.clientX - rect.left + this.tracksWrapper.scrollLeft;
            const time = Math.max(0, Math.min(this.duration, this.xToTime(x)));
            this.setCurrentTime(time);
        };
        
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    onTimeChange(callback) {
        this.listeners.timeChange.push(callback);
    }

    onKeyframeSelect(callback) {
        this.listeners.keyframeSelect.push(callback);
    }

    onKeyframeMove(callback) {
        this.listeners.keyframeMove.push(callback);
    }

    onTrackSelect(callback) {
        this.listeners.trackSelect.push(callback);
    }

    notifyTimeChange() {
        this.listeners.timeChange.forEach(cb => cb(this.currentTime));
    }

    notifyKeyframeSelect(track, index) {
        this.listeners.keyframeSelect.forEach(cb => cb(track, index));
    }

    notifyKeyframeMove(track, index, newTime, oldTime) {
        this.listeners.keyframeMove.forEach(cb => cb(track, index, newTime, oldTime));
    }

    notifyTrackSelect(track) {
        this.listeners.trackSelect.forEach(cb => cb(track));
    }

    notifyPlayStateChange(isPlaying) {
        const event = new CustomEvent('playstatechange', { detail: { isPlaying } });
        document.dispatchEvent(event);
    }
}

window.Timeline = Timeline;
