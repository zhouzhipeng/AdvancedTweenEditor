/**
 * File I/O Module - JSON load/save and image handling
 */
class FileIO {
    constructor() {
        this.jsonInput = document.getElementById('file-input-json');
        this.imageInput = document.getElementById('file-input-image');
        
        this.loadSourceModal = document.getElementById('load-source-modal');
        this.btnCloseLoadSource = document.getElementById('btn-close-load-source');
        this.btnLoadFromFile = document.getElementById('btn-load-from-file');
        this.btnLoadFromClipboard = document.getElementById('btn-load-from-clipboard');
        
        // Clipboard fallback modals
        this.clipboardPasteModal = document.getElementById('clipboard-paste-modal');
        this.clipboardPasteTextarea = document.getElementById('clipboard-paste-textarea');
        this.btnCloseClipboardPaste = document.getElementById('btn-close-clipboard-paste');
        this.btnClipboardPasteCancel = document.getElementById('btn-clipboard-paste-cancel');
        this.btnClipboardPasteLoad = document.getElementById('btn-clipboard-paste-load');
        
        this.clipboardCopyModal = document.getElementById('clipboard-copy-modal');
        this.clipboardCopyTextarea = document.getElementById('clipboard-copy-textarea');
        this.btnCloseClipboardCopy = document.getElementById('btn-close-clipboard-copy');
        this.btnClipboardCopyClose = document.getElementById('btn-clipboard-copy-close');
        
        this.listeners = {
            jsonLoad: [],
            imageLoad: [],
            allLoad: []
        };
        
        // All objects file input
        this.allInput = document.getElementById('file-input-all');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.jsonInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadJSON(file);
            }
            this.jsonInput.value = '';
        });
        
        this.imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadImage(file);
            }
            this.imageInput.value = '';
        });
        
        // All objects file input
        if (this.allInput) {
            this.allInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.loadAllJSON(file);
                }
                this.allInput.value = '';
            });
        }
        
        this.btnCloseLoadSource.addEventListener('click', () => this.hideLoadSourceModal());
        this.loadSourceModal.addEventListener('click', (e) => {
            if (e.target === this.loadSourceModal) {
                this.hideLoadSourceModal();
            }
        });
        
        this.btnLoadFromFile.addEventListener('click', () => {
            this.hideLoadSourceModal();
            this.jsonInput.click();
        });
        
        this.btnLoadFromClipboard.addEventListener('click', () => {
            this.hideLoadSourceModal();
            this.loadJSONFromClipboard();
        });
        
        // Clipboard paste modal events
        this.btnCloseClipboardPaste.addEventListener('click', () => this.hideClipboardPasteModal());
        this.btnClipboardPasteCancel.addEventListener('click', () => this.hideClipboardPasteModal());
        this.clipboardPasteModal.addEventListener('click', (e) => {
            if (e.target === this.clipboardPasteModal) {
                this.hideClipboardPasteModal();
            }
        });
        this.btnClipboardPasteLoad.addEventListener('click', () => {
            this.loadJSONFromPasteModal();
        });
        
        // Clipboard copy modal events
        this.btnCloseClipboardCopy.addEventListener('click', () => this.hideClipboardCopyModal());
        this.btnClipboardCopyClose.addEventListener('click', () => this.hideClipboardCopyModal());
        this.clipboardCopyModal.addEventListener('click', (e) => {
            if (e.target === this.clipboardCopyModal) {
                this.hideClipboardCopyModal();
            }
        });
    }

    triggerJSONLoad() {
        this.showLoadSourceModal();
    }
    
    showLoadSourceModal() {
        this.loadSourceModal.classList.remove('hidden');
    }
    
    hideLoadSourceModal() {
        this.loadSourceModal.classList.add('hidden');
    }

    triggerImageLoad() {
        this.imageInput.click();
    }

    loadJSON(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.validateJSON(data);
                this.notifyJSONLoad(data, file.name);
            } catch (err) {
                alert('Error loading JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
    }
    
    loadJSONFromClipboard() {
        // Try Clipboard API first, fallback to paste modal
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(text => {
                try {
                    const data = JSON.parse(text);
                    this.validateJSON(data);
                    this.notifyJSONLoad(data, 'clipboard');
                } catch (err) {
                    alert('Error loading JSON from clipboard: ' + err.message);
                }
            }).catch(err => {
                // Clipboard API failed (likely iframe policy), show fallback modal
                console.log('Clipboard API failed, using fallback:', err.message);
                this.showClipboardPasteModal();
            });
        } else {
            // Clipboard API not available, show fallback modal
            this.showClipboardPasteModal();
        }
    }
    
    showClipboardPasteModal() {
        this.clipboardPasteTextarea.value = '';
        this.clipboardPasteModal.classList.remove('hidden');
        this.clipboardPasteTextarea.focus();
    }
    
    hideClipboardPasteModal() {
        this.clipboardPasteModal.classList.add('hidden');
    }
    
    loadJSONFromPasteModal() {
        const text = this.clipboardPasteTextarea.value.trim();
        if (!text) {
            alert('Please paste JSON content first.');
            return;
        }
        try {
            const data = JSON.parse(text);
            this.validateJSON(data);
            this.hideClipboardPasteModal();
            this.notifyJSONLoad(data, 'clipboard');
        } catch (err) {
            alert('Error loading JSON: ' + err.message);
        }
    }
    
    showClipboardCopyModal(text) {
        this.clipboardCopyTextarea.value = text;
        this.clipboardCopyModal.classList.remove('hidden');
        this.clipboardCopyTextarea.focus();
        this.clipboardCopyTextarea.select();
    }
    
    hideClipboardCopyModal() {
        this.clipboardCopyModal.classList.add('hidden');
    }
    
    copyToClipboard(text) {
        // Try Clipboard API first, fallback to copy modal
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                // Success - could show a brief toast notification here
                console.log('Copied to clipboard successfully');
            }).catch(err => {
                // Clipboard API failed (likely iframe policy), show fallback modal
                console.log('Clipboard API failed, using fallback:', err.message);
                this.showClipboardCopyModal(text);
            });
        } else {
            // Clipboard API not available, show fallback modal
            this.showClipboardCopyModal(text);
        }
    }
    
    copyJSONToClipboard(data) {
        const cleanedData = this.cleanJSONForExport(data);
        const json = JSON.stringify(cleanedData, null, 2);
        this.copyToClipboard(json);
    }

    validateJSON(data) {
        if (!data.version) {
            throw new Error('Missing version field');
        }
        if (!data.name) {
            throw new Error('Missing name field');
        }
        if (typeof data.duration !== 'number' || data.duration <= 0) {
            throw new Error('Invalid duration field');
        }
        if (!data.tracks || typeof data.tracks !== 'object') {
            throw new Error('Missing or invalid tracks field');
        }
        
        for (const [trackName, track] of Object.entries(data.tracks)) {
            if (!track.keyframes || !Array.isArray(track.keyframes)) {
                throw new Error(`Track "${trackName}" missing keyframes array`);
            }
            for (const kf of track.keyframes) {
                if (typeof kf.time !== 'number') {
                    throw new Error(`Invalid keyframe time in track "${trackName}"`);
                }
                if (kf.value === undefined) {
                    throw new Error(`Missing keyframe value in track "${trackName}"`);
                }
            }
        }
    }

    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.notifyImageLoad(img, file.name);
            };
            img.onerror = () => {
                alert('Error loading image');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    saveJSON(data, filename) {
        const cleanedData = this.cleanJSONForExport(data);
        const json = JSON.stringify(cleanedData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'animation.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    cleanJSONForExport(data) {
        const cleanTracks = {};
        
        for (const [trackName, track] of Object.entries(data.tracks)) {
            if (!track.keyframes || track.keyframes.length === 0) continue;
            
            const cleanKeyframes = track.keyframes.map((kf, index, arr) => {
                const cleanKf = {
                    time: Math.round(kf.time * 1000) / 1000,
                    value: kf.value
                };
                
                if (index < arr.length - 1 && kf.easing) {
                    if (kf.easing.type === 'linear') {
                        cleanKf.easing = { type: 'linear' };
                    } else if (kf.easing.type === 'step') {
                        cleanKf.easing = { type: 'step' };
                    } else if (kf.easing.type === 'cubicBezier' && kf.easing.controlPoints) {
                        cleanKf.easing = {
                            type: 'cubicBezier',
                            controlPoints: kf.easing.controlPoints.map(v => Math.round(v * 1000) / 1000)
                        };
                    }
                }
                
                return cleanKf;
            });
            
            cleanTracks[trackName] = { keyframes: cleanKeyframes };
        }
        
        return {
            version: data.version || '1.0.0',
            name: data.name || 'untitled',
            duration: data.duration,
            loop: data.loop || false,
            tracks: cleanTracks
        };
    }

    createEmptyAnimation() {
        return {
            version: '1.0.0',
            name: 'untitled',
            duration: 3.0,
            loop: false,
            tracks: {}
        };
    }

    onJSONLoad(callback) {
        this.listeners.jsonLoad.push(callback);
    }

    onImageLoad(callback) {
        this.listeners.imageLoad.push(callback);
    }
    
    onAllLoad(callback) {
        this.listeners.allLoad.push(callback);
    }

    notifyJSONLoad(data, filename) {
        this.listeners.jsonLoad.forEach(cb => cb(data, filename));
    }

    notifyImageLoad(image, filename) {
        this.listeners.imageLoad.forEach(cb => cb(image, filename));
    }
    
    notifyAllLoad(data) {
        this.listeners.allLoad.forEach(cb => cb(data));
    }
    
    // Load All / Save All methods
    triggerAllLoad() {
        if (this.allInput) {
            this.allInput.click();
        }
    }
    
    loadAllJSON(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.validateAllJSON(data);
                this.notifyAllLoad(data);
            } catch (err) {
                alert('Error loading project JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
    }
    
    validateAllJSON(data) {
        if (!data.version) {
            throw new Error('Missing version field');
        }
        if (!data.objects || !Array.isArray(data.objects)) {
            throw new Error('Missing or invalid objects array');
        }
        // Validate each object's animation data
        for (const objData of data.objects) {
            if (objData.animation) {
                // Basic validation for animation data
                if (objData.animation.tracks && typeof objData.animation.tracks !== 'object') {
                    throw new Error('Invalid tracks in object animation');
                }
            }
        }
    }
    
    saveAllJSON(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'project.atproj';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

window.FileIO = FileIO;
