/**
 * AdvancedTween Editor - Main Application
 * Entry point and state management
 */

const AI_PROMPT_TEXT = `You are an assistant that helps the user author **Timeline Animation JSON** for a single object.

### Objective

- Interview the user (Q&A) to design an animation.
- Produce:
  1) A **short summary** of the animation/tracks/key moments.
  2) The **final JSON** in a single fenced code block.

### Conversation style

- Ask one question at a time.
- Default to **simple-first**: propose the minimum keyframes needed (often 2-3 per track) unless the user explicitly asks for detailed motion.
- If the user gives a high-level description, propose a reasonable keyframe plan and ask for confirmation.

### Language handling

- Start the chat in the user's **preferred language** by automatically inferring it from the user's first message.
  - Do not require an English-only language confirmation.
  - If the user's language is unclear (e.g., extremely short or mixed-language input), ask a single clarification question written in multiple languages, for example:
    - "Language? / 言語は？ / Idioma? / Langue?"
    - And include examples the user can copy: "English / 日本語 / Español / Français / Português / 中文".
  - Once the language is established, use that language consistently for:
    - Questions
    - Explanations
    - The short summary
- Always keep these items **exactly as specified** (do not translate or rename):
  - JSON keys/field names (e.g., \`version\`, \`duration\`, \`tracks\`, \`keyframes\`, \`easing\`, \`controlPoints\`)
  - Track names (\`x\`, \`y\`, \`scaleX\`, \`hidden\`, etc.)
  - Easing types (\`cubicBezier\`, \`linear\`, \`step\`)
  - Code fences and the final JSON formatting

---

## Timeline Animation JSON Specification (Condensed)

### Root JSON structure

\`\`\`json
{
  "version": "1.0.0",
  "name": "timeline_name",
  "duration": 5.0,
  "loop": false,
  "tracks": {
    "<property>": {
      "keyframes": [
        {
          "time": 0.0,
          "value": "<value>",
          "easing": {
            "type": "cubicBezier",
            "controlPoints": [0.42, 0.0, 0.58, 1.0]
          }
        }
      ]
    }
  }
}
\`\`\`

- \`version\` (string, required): always use **"1.0.0"**.
- \`name\` (string, required): animation identifier.
- \`duration\` (number, required): seconds.
- \`loop\` (boolean, optional): default \`false\`.
- \`tracks\` (object, required): keys are property/track names.

### Track

- Each track has:
  - \`keyframes\` (array, required): sorted by ascending \`time\`.

### Keyframe

- \`time\` (number, required): must be within **0.0 .. duration**.
- \`value\` (any, required): depends on track.
- \`easing\` (object, optional): interpolation curve **to the next keyframe**.
  - Usually omit \`easing\` on the **last** keyframe.
  - If \`easing\` is omitted, treat it as **linear**.

### Easing

- \`type\` must be one of:
  - \`"cubicBezier"\` (requires \`controlPoints: [x1, y1, x2, y2]\`)
  - \`"linear"\` (no \`controlPoints\`)
  - \`"step"\` (no \`controlPoints\`, hold value until next keyframe then switch instantly)

Notes:
- For \`cubicBezier\`, \`x1\` and \`x2\` should be in 0..1.
- \`y1\` and \`y2\` may exceed 0..1 (overshoot allowed).

---

## Allowed Tracks (Properties)

Only use these track names:

- \`x\` (number): relative X from initial position (continuous)
- \`y\` (number): relative Y from initial position (continuous)
- \`zIndex\` (number): relative Z index (continuous, but expected to be rounded to int when applied)
- \`angle\` (number): relative rotation in degrees (continuous)
- \`opacity\` (number): 0..255 (continuous; only if supported by the object)
- \`scaleX\` (number): relative scale multiplier vs initial scale (continuous; 1.0 = no change)
- \`scaleY\` (number): relative scale multiplier vs initial scale (continuous; 1.0 = no change)
- \`hidden\` (boolean): **step-only** (discrete)
- \`flipX\` (boolean): **step-only** (discrete)
- \`flipY\` (boolean): **step-only** (discrete)
- \`animationName\` (string): **step-only** (discrete; Sprite only)

Discrete track rule:
- For \`hidden\`, \`flipX\`, \`flipY\`, \`animationName\`, any \`linear\`/\`cubicBezier\` request must be treated as **step**.

General design notes:
- Tracks are optional: omitted tracks keep initial values.
- If a track has only **one** keyframe, its value is constant for the whole duration.
- Playback outside the range:
  - If \`loop: false\`: clamp to first/last keyframe.
  - If \`loop: true\`: time wraps within 0..duration.

---

## Easing Presets (Quick Choices)

If the user wants common easing, offer these presets:

- easeInOut: \`[0.42, 0.0, 0.58, 1.0]\`
- easeIn: \`[0.42, 0.0, 1.0, 1.0]\`
- easeOut: \`[0.0, 0.0, 0.58, 1.0]\`
- easeInBack: \`[0.36, 0.0, 0.66, -0.56]\`
- easeOutBack: \`[0.34, 1.56, 0.64, 1.0]\`
- easeInOutCubic: \`[0.65, 0.0, 0.35, 1.0]\`

---

## Interview Script (Ask these questions)

Important:
- Ask the questions below in the user's preferred language.
- Keep technical tokens (like \`name\`, \`duration\`, \`loop\`, track names, easing type names) as-is.
- Do not ask for the animation \`name\` until all other required details are collected and confirmed (the \`name\` must be last).

### Step 1: Ask what animation they want (big picture first)

Ask:
- "What kind of animation do you want to create? You can describe it roughly (e.g., 'a quick pop') or specify exact numbers (seconds, pixels, degrees, scale, opacity) if you prefer."

Then (if needed) ask follow-ups to extract:
- Target properties/tracks from the allowed list
- Key moments (times) and values

Then propose a simple plan:
- For continuous tracks: default to **2 keyframes** (start/end). Add a **3rd** keyframe only if needed (bounce/overshoot/anticipation).
- For discrete tracks: choose times when the change should occur.

### Step 2: Collect required fields and missing details

Ask (as needed, based on what the user already said):
- "How long should the animation be in seconds (\`duration\`)?"
- "Which properties do you want to animate? Choose any: x, y, zIndex, angle, opacity, scaleX, scaleY, hidden, flipX, flipY, animationName."

Then run **per-track details** (keyframes, times, values, easing) using the same rules as below.

### Step 3: Loop (only if not mentioned)

If the user has not mentioned looping yet, ask:
- "Should it loop? (\`loop\`: true/false)"

If the user already clearly requested looping (or clearly requested no looping), do not ask again.

### Step 4: Confirm the plan

Before asking for the animation name, briefly summarize the proposed timeline plan (tracks, key moments, easing choices) and ask:
- "Does this plan look good? (Yes / No, and what to change)"

If the user says Yes (or makes no changes), proceed to Step 5.

### Step 5: Ask animation name last

After the user confirms the plan, ask:
- "What should the animation \`name\` be?"

Once the user answers the \`name\`, immediately generate the output (summary + JSON). Do not ask additional design questions after the \`name\`.

### Per-track details (simple-first approach)

Instead of asking for each keyframe individually, **propose a reasonable plan** based on the user's description, then ask for confirmation. For example:

- "I'll use 2 keyframes for \`scaleX\`: 1.0 at 0s → 1.3 at 0.5s with easeOutBack. OK?"

If the user wants more control, allow them to specify exact values. Otherwise, fill in sensible defaults:
- Default easing: \`linear\` (or \`easeInOut\` for smooth motion, \`easeOutBack\` for pop/bounce).
- Discrete tracks (\`hidden\`, \`flipX\`, \`flipY\`, \`animationName\`): always use \`step\` easing.

### Validation (internal, before output)

Before generating the final JSON:
- Ensure all keyframe times are within \`[0, duration]\`.
- Sort keyframes by time.
- Ensure every track has at least 1 keyframe.
- Ensure easing objects are valid:
  - \`cubicBezier\` has 4 numbers.
  - \`linear\` has no controlPoints.
  - \`step\` has no controlPoints.
- Ensure discrete tracks use \`step\` (even if the user asked otherwise).

---

## Required Output Format

When the user confirms, respond with exactly:

1) **Short summary** (in the user's preferred language; a few lines) including:
- Duration and loop
- List of tracks
- A compact list of key moments (times/values)

2) The **final JSON** in a single fenced code block labeled \`json\`.

3) A brief instruction to save the JSON content as a \`.json\` file (e.g., \`my_animation.json\`).

Do not include extra code blocks.

---

## Final Reminder

- One JSON = one object animation. Do not ask for an object name.
- Keep tracks minimal unless the user asks for complexity.
`;

const STEP_ONLY_PROPS = ['hidden', 'flipX', 'flipY', 'animationName'];

class App {
    constructor() {
        this.history = new HistoryManager();
        this.stage = new Stage('stage-canvas', 'stage-container');
        this.timeline = new Timeline();
        this.properties = new PropertiesPanel();
        this.bezierEditor = new BezierEditor();
        this.fileIO = new FileIO();
        
        // Multi-object management
        this.objects = [];
        this.selectedObjectId = null;
        this.objectCounter = 0;
        
        this.setupUI();
        this.setupEventListeners();
        
        // Create initial object (after UI is set up)
        this.addObject();
        this.setupKeyboardShortcuts();
        this.setupBeforeUnload();
        
        this.updateUI();
        this.renderObjectList();
        this.stage.render();
    }
    
    // Object management methods
    createObjectData(name) {
        this.objectCounter++;
        const objName = name || 'Object' + this.objectCounter;
        return {
            id: 'obj_' + this.objectCounter,
            name: objName,
            image: null,
            defaultImage: this.stage.generateDefaultImage(objName),
            animationData: this.fileIO.createEmptyAnimation(),
            stageProps: {
                x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1,
                opacity: 255, zIndex: 0, hidden: false, flipX: false, flipY: false
            }
        };
    }
    
    addObject() {
        const obj = this.createObjectData();
        this.objects.push(obj);
        this.selectObject(obj.id);
        this.renderObjectList();
        return obj;
    }
    
    deleteObject(id) {
        if (this.objects.length <= 1) {
            alert('Cannot delete the last object.');
            return;
        }
        
        const index = this.objects.findIndex(o => o.id === id);
        if (index === -1) return;
        
        this.objects.splice(index, 1);
        
        if (this.selectedObjectId === id) {
            const newIndex = Math.min(index, this.objects.length - 1);
            this.selectObject(this.objects[newIndex].id);
        }
        
        this.renderObjectList();
        this.stage.setObjects(this.objects, this.selectedObjectId);
        this.stage.render();
    }
    
    selectObject(id) {
        const obj = this.objects.find(o => o.id === id);
        if (!obj) return;
        
        this.selectedObjectId = id;
        this.history.clear();
        
        // Update timeline with selected object's data
        this.timeline.setDuration(obj.animationData.duration);
        this.timeline.setLoop(obj.animationData.loop || false);
        this.timeline.setTracks(obj.animationData.tracks);
        
        // Update properties panel
        this.properties.setObjectName(obj.name);
        
        // Update stage
        this.stage.setObjects(this.objects, this.selectedObjectId);
        
        // Update UI
        this.updateUIForSelectedObject();
        this.renderObjectList();
        this.onTimeChange(this.timeline.getCurrentTime());
    }
    
    getSelectedObject() {
        return this.objects.find(o => o.id === this.selectedObjectId);
    }
    
    get animationData() {
        const obj = this.getSelectedObject();
        return obj ? obj.animationData : this.fileIO.createEmptyAnimation();
    }
    
    set animationData(data) {
        const obj = this.getSelectedObject();
        if (obj) {
            obj.animationData = data;
        }
    }
    
    renderObjectList() {
        const listEl = document.getElementById('object-list');
        listEl.innerHTML = '';
        
        this.objects.forEach(obj => {
            const item = document.createElement('div');
            item.className = 'object-list-item' + (obj.id === this.selectedObjectId ? ' selected' : '');
            item.textContent = obj.name;
            item.dataset.id = obj.id;
            item.addEventListener('click', () => this.selectObject(obj.id));
            listEl.appendChild(item);
        });
    }
    
    updateObjectName(name) {
        const obj = this.getSelectedObject();
        if (obj) {
            obj.name = name;
            obj.defaultImage = this.stage.generateDefaultImage(name);
            this.renderObjectList();
            this.stage.render();
        }
    }

    setupUI() {
        this.btnNew = document.getElementById('btn-new');
        this.btnLoad = document.getElementById('btn-load');
        this.btnSave = document.getElementById('btn-save');
        this.btnLoadImage = document.getElementById('btn-load-image');
        this.btnUndo = document.getElementById('btn-undo');
        this.btnRedo = document.getElementById('btn-redo');
        this.btnPlay = document.getElementById('btn-play');
        this.btnStop = document.getElementById('btn-stop');
        
        // Object list buttons
        this.btnAddObject = document.getElementById('btn-add-object');
        this.btnDeleteObject = document.getElementById('btn-delete-object');
        
        // Load All / Save All buttons
        this.btnLoadAll = document.getElementById('btn-load-all');
        this.btnSaveAll = document.getElementById('btn-save-all');
        
        this.inputName = document.getElementById('input-name');
        this.inputDuration = document.getElementById('input-duration');
        this.inputLoop = document.getElementById('input-loop');
        this.inputObjectName = document.getElementById('prop-object-name');
        
        this.btnZoomIn = document.getElementById('btn-zoom-in');
        this.btnZoomOut = document.getElementById('btn-zoom-out');
        this.btnZoomReset = document.getElementById('btn-zoom-reset');
        this.zoomLevel = document.getElementById('zoom-level');
        
        this.btnCopyAIPrompt = document.getElementById('btn-copy-ai-prompt');
    }
    
    updateUIForSelectedObject() {
        const obj = this.getSelectedObject();
        if (!obj) return;
        
        this.inputDuration.value = obj.animationData.duration;
        this.inputLoop.checked = obj.animationData.loop || false;
        this.inputObjectName.value = obj.name;
        document.getElementById('total-time').textContent = obj.animationData.duration.toFixed(2) + 's';
    }

    setupEventListeners() {
        this.btnNew.addEventListener('click', () => this.newAnimation());
        this.btnLoad.addEventListener('click', () => this.fileIO.triggerJSONLoad());
        this.btnSave.addEventListener('click', () => this.saveAnimation());
        this.btnLoadImage.addEventListener('click', () => this.fileIO.triggerImageLoad());
        this.btnUndo.addEventListener('click', () => this.history.undo());
        this.btnRedo.addEventListener('click', () => this.history.redo());
        this.btnPlay.addEventListener('click', () => this.togglePlay());
        this.btnStop.addEventListener('click', () => this.stopAnimation());
        
        // Object list buttons
        this.btnAddObject.addEventListener('click', () => this.addObject());
        this.btnDeleteObject.addEventListener('click', () => {
            if (this.selectedObjectId) {
                this.deleteObject(this.selectedObjectId);
            }
        });
        
        // Load All / Save All buttons
        this.btnLoadAll.addEventListener('click', () => this.fileIO.triggerAllLoad());
        this.btnSaveAll.addEventListener('click', () => this.saveAllObjects());
        
        // Object name change
        this.inputObjectName.addEventListener('change', () => {
            this.updateObjectName(this.inputObjectName.value);
        });
        
        this.btnZoomIn.addEventListener('click', () => {
            const zoom = this.stage.zoomIn();
            this.zoomLevel.textContent = Math.round(zoom * 100) + '%';
        });
        this.btnZoomOut.addEventListener('click', () => {
            const zoom = this.stage.zoomOut();
            this.zoomLevel.textContent = Math.round(zoom * 100) + '%';
        });
        this.btnZoomReset.addEventListener('click', () => {
            const zoom = this.stage.resetZoom();
            this.zoomLevel.textContent = Math.round(zoom * 100) + '%';
        });
        
        this.stage.canvas.addEventListener('zoomchange', (e) => {
            this.zoomLevel.textContent = Math.round(e.detail.zoom * 100) + '%';
        });
        
        this.btnCopyAIPrompt.addEventListener('click', () => this.copyAIPrompt());
        
        this.inputName.addEventListener('change', () => {
            // Tween name is global, not per-object
        });
        
        this.inputDuration.addEventListener('change', () => {
            const newDuration = parseFloat(this.inputDuration.value) || 3.0;
            this.animationData.duration = newDuration;
            this.timeline.setDuration(newDuration);
            this.updateUIForSelectedObject();
        });
        
        this.inputLoop.addEventListener('change', () => {
            this.animationData.loop = this.inputLoop.checked;
            this.timeline.setLoop(this.inputLoop.checked);
        });
        
        this.history.addListener((state) => {
            this.btnUndo.disabled = !state.canUndo;
            this.btnRedo.disabled = !state.canRedo;
        });
        
        this.stage.onChange((props, oldProps) => {
            this.onStageChange(props, oldProps);
        });
        
        this.timeline.onTimeChange((time) => {
            this.onTimeChange(time);
        });
        
        this.timeline.onKeyframeSelect((track, index) => {
            this.onKeyframeSelect(track, index);
        });
        
        this.timeline.onKeyframeMove((track, index, newTime, oldTime) => {
            this.onKeyframeMoved(track, index, newTime, oldTime);
        });
        
        this.properties.onValueChange((prop, value) => {
            this.onPropertyValueChange(prop, value);
        });
        
        this.properties.onKeyframeToggle((prop) => {
            this.toggleKeyframe(prop);
        });
        
        this.properties.onEasingChange((easing) => {
            this.onEasingChange(easing);
        });
        
        this.properties.onOpenBezierEditor((currentValues) => {
            this.bezierEditor.open(currentValues, (newValues) => {
                this.properties.setBezierValues(newValues);
                this.onEasingChange(this.properties.getEasing());
            });
        });
        
        this.fileIO.onJSONLoad((data, filename) => {
            this.loadAnimationData(data);
        });
        
        this.fileIO.onImageLoad((image, filename) => {
            const obj = this.getSelectedObject();
            if (obj) {
                obj.image = image;
                this.stage.setObjects(this.objects, this.selectedObjectId);
                this.stage.render();
            }
        });
        
        this.fileIO.onAllLoad((data) => {
            this.loadAllObjects(data);
        });
        
        // Stage object selection
        this.stage.onObjectSelect((objectId) => {
            if (objectId && objectId !== this.selectedObjectId) {
                this.selectObject(objectId);
            }
        });
        
        document.addEventListener('playstatechange', (e) => {
            this.btnPlay.textContent = e.detail.isPlaying ? '⏸' : '▶';
        });
    }

    setupBeforeUnload() {
        window.addEventListener('beforeunload', (e) => {
            if (Object.keys(this.animationData.tracks).length > 0 || this.history.canUndo()) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.history.undo();
            } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
                e.preventDefault();
                this.history.redo();
            } else if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveAnimation();
            } else if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                this.fileIO.triggerJSONLoad();
            } else if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.newAnimation();
            } else if (e.key === ' ') {
                e.preventDefault();
                this.togglePlay();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                this.deleteSelectedKeyframe();
            }
        });
    }

    newAnimation() {
        const hasData = this.objects.some(obj => Object.keys(obj.animationData.tracks).length > 0);
        if (hasData) {
            if (!confirm('Create new animation? Unsaved changes will be lost.')) {
                return;
            }
        }
        
        // Reset all objects
        this.objects = [];
        this.objectCounter = 0;
        this.selectedObjectId = null;
        this.addObject();
        
        this.history.clear();
        this.inputName.value = 'untitled';
        this.updateUI();
        this.renderObjectList();
        this.timeline.setTracks({});
        this.timeline.setCurrentTime(0);
        this.stage.setObjects(this.objects, this.selectedObjectId);
        this.stage.render();
    }
    
    saveAllObjects() {
        const tweenName = this.inputName.value || 'untitled';
        const allData = {
            version: '1.0.0',
            name: tweenName,
            objects: this.objects.map(obj => ({
                name: obj.name,
                animation: obj.animationData,
                imageDataURL: obj.image ? obj.image.src : null
            }))
        };
        
        const filename = tweenName + '_all.atproj';
        this.fileIO.saveAllJSON(allData, filename);
    }
    
    loadAllObjects(data) {
        if (!data.objects || !Array.isArray(data.objects)) {
            alert('Invalid project file: missing objects array');
            return;
        }
        
        this.objects = [];
        this.objectCounter = 0;
        
        data.objects.forEach(objData => {
            this.objectCounter++;
            const obj = {
                id: 'obj_' + this.objectCounter,
                name: objData.name || 'Object' + this.objectCounter,
                image: null,
                animationData: objData.animation || this.fileIO.createEmptyAnimation(),
                stageProps: {
                    x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1,
                    opacity: 255, zIndex: 0, hidden: false, flipX: false, flipY: false
                }
            };
            if (objData.imageDataURL) {
                const img = new Image();
                img.onload = () => this.stage.render();
                img.src = objData.imageDataURL;
                obj.image = img;
            }
            this.objects.push(obj);
        });
        
        if (this.objects.length === 0) {
            this.addObject();
        } else {
            this.selectObject(this.objects[0].id);
        }
        
        this.inputName.value = data.name || 'untitled';
        this.history.clear();
        this.renderObjectList();
        this.stage.setObjects(this.objects, this.selectedObjectId);
        this.stage.render();
    }

    loadAnimationData(data) {
        this.animationData = data;
        this.history.clear();
        this.updateUI();
        this.timeline.setDuration(data.duration);
        this.timeline.setLoop(data.loop || false);
        this.timeline.setTracks(data.tracks);
        this.timeline.setCurrentTime(0);
        this.onTimeChange(0);
    }

    saveAnimation() {
        const obj = this.getSelectedObject();
        if (!obj) return;
        
        const tweenName = this.inputName.value || 'untitled';
        const objectName = obj.name;
        const combinedName = tweenName + '_' + objectName;
        
        // Create a copy with the combined name
        const dataToSave = { ...obj.animationData, name: combinedName };
        const filename = combinedName + '.json';
        this.fileIO.saveJSON(dataToSave, filename);
    }

    copyAIPrompt() {
        // Use FileIO's copyToClipboard with fallback support
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(AI_PROMPT_TEXT).then(() => {
                this.btnCopyAIPrompt.textContent = 'Copied!';
                setTimeout(() => {
                    this.btnCopyAIPrompt.textContent = 'Copy AI Prompt';
                }, 2000);
            }).catch(err => {
                console.error('Clipboard API failed, using fallback:', err);
                this.fileIO.showClipboardCopyModal(AI_PROMPT_TEXT);
            });
        } else {
            this.fileIO.showClipboardCopyModal(AI_PROMPT_TEXT);
        }
    }

    updateUI() {
        this.inputName.value = this.animationData.name;
        this.inputDuration.value = this.animationData.duration;
        this.inputLoop.checked = this.animationData.loop || false;
        this.timeline.setDuration(this.animationData.duration);
    }

    togglePlay() {
        if (this.timeline.isPlaying) {
            this.timeline.pause();
            this.btnPlay.textContent = '▶';
        } else {
            this.timeline.play();
            this.btnPlay.textContent = '⏸';
        }
    }

    stopAnimation() {
        this.timeline.stop();
        this.btnPlay.textContent = '▶';
    }

    onTimeChange(time) {
        // Evaluate ALL objects at the current time for synchronized playback
        this.objects.forEach(obj => {
            const values = this.evaluateObjectAtTime(obj, time);
            obj.stageProps = { ...obj.stageProps, ...values };
        });
        
        // Update stage with all objects
        this.stage.setObjects(this.objects, this.selectedObjectId);
        this.stage.render();
        
        // Update properties panel for selected object
        const selectedObj = this.getSelectedObject();
        if (selectedObj) {
            this.properties.setValues(selectedObj.stageProps);
            this.properties.updateKeyframeStates(selectedObj.animationData.tracks, time);
        }
        
        const selectedKf = this.timeline.getSelectedKeyframeData();
        if (selectedKf) {
            this.properties.setSelectedKeyframe(selectedKf.track, selectedKf.keyframe);
        }
    }
    
    evaluateObjectAtTime(obj, time) {
        const result = {
            x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1,
            opacity: 255, zIndex: 0, hidden: false, flipX: false, flipY: false,
            animationName: ''
        };
        
        const tracks = obj.animationData.tracks;
        
        for (const [prop, track] of Object.entries(tracks)) {
            if (!track.keyframes || track.keyframes.length === 0) continue;
            
            const value = this.interpolateTrackForObject(obj, track, prop, time);
            if (value !== null) {
                result[prop] = value;
            }
        }
        
        return result;
    }
    
    interpolateTrackForObject(obj, track, prop, time) {
        const keyframes = track.keyframes;
        if (!keyframes || keyframes.length === 0) return null;
        
        if (keyframes.length === 1) {
            return keyframes[0].value;
        }
        
        let evalTime = time;
        if (obj.animationData.loop && obj.animationData.duration > 0) {
            evalTime = ((time % obj.animationData.duration) + obj.animationData.duration) % obj.animationData.duration;
        }
        
        if (evalTime <= keyframes[0].time) {
            return keyframes[0].value;
        }
        if (evalTime >= keyframes[keyframes.length - 1].time) {
            return keyframes[keyframes.length - 1].value;
        }
        
        let segIndex = 0;
        for (let i = 0; i < keyframes.length - 1; i++) {
            if (keyframes[i + 1].time > evalTime) {
                segIndex = i;
                break;
            }
        }
        
        const kfA = keyframes[segIndex];
        const kfB = keyframes[segIndex + 1];
        
        const isStepOnly = STEP_ONLY_PROPS.includes(prop);

        const easing = kfA.easing || { type: 'linear' };
        const easingType = isStepOnly ? 'step' : easing.type;
        
        if (easingType === 'step') {
            return kfA.value;
        }
        
        const segDuration = kfB.time - kfA.time;
        const localT = segDuration === 0 ? 1 : (evalTime - kfA.time) / segDuration;
        
        let progress;
        if (easingType === 'cubicBezier' && easing.controlPoints) {
            const [x1, y1, x2, y2] = easing.controlPoints;
            progress = this.sampleCubicBezier(x1, y1, x2, y2, localT);
        } else {
            progress = localT;
        }
        
        return kfA.value + (kfB.value - kfA.value) * progress;
    }

    sampleCubicBezier(x1, y1, x2, y2, t) {
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        
        const s = this.solveCubicBezierX(x1, x2, t);
        return this.cubicBezierCalc(y1, y2, s);
    }

    cubicBezierCalc(p1, p2, s) {
        const s2 = s * s;
        const s3 = s2 * s;
        const inv = 1 - s;
        const inv2 = inv * inv;
        return 3 * inv2 * s * p1 + 3 * inv * s2 * p2 + s3;
    }

    solveCubicBezierX(x1, x2, targetX) {
        const EPSILON = 1e-7;
        const bx = (s) => this.cubicBezierCalc(x1, x2, s);
        
        let lo = 0, hi = 1, s = targetX;
        for (let i = 0; i < 64; i++) {
            const xVal = bx(s);
            if (Math.abs(xVal - targetX) < EPSILON) return s;
            if (xVal < targetX) lo = s;
            else hi = s;
            s = (lo + hi) / 2;
        }
        return s;
    }

    onStageChange(props, oldProps) {
        const obj = this.getSelectedObject();
        if (!obj) return;
        
        // Update selected object's stageProps
        Object.assign(obj.stageProps, props);
        
        const time = this.timeline.getCurrentTime();
        const tracks = obj.animationData.tracks;
        
        const propsToUpdate = ['x', 'y', 'angle', 'scaleX', 'scaleY'];
        const commands = [];
        
        propsToUpdate.forEach(prop => {
            const newValue = Math.round(props[prop] * 100) / 100;
            const oldPropValue = oldProps ? Math.round(oldProps[prop] * 100) / 100 : newValue;
            
            // Only process if the property value actually changed
            if (newValue === oldPropValue) return;
            
            const kfData = tracks[prop] ? this.timeline.getKeyframeAt(prop, time, 0.001) : null;
            
            if (kfData) {
                // Update existing keyframe
                const oldValue = kfData.keyframe.value;
                if (oldValue !== newValue) {
                    commands.push(Commands.updateKeyframeValue(
                        tracks, prop, kfData.index, newValue, oldValue,
                        () => this.refreshAll()
                    ));
                }
            } else {
                // Auto-add keyframe only for changed properties
                const newKeyframe = {
                    time: time,
                    value: newValue,
                    easing: { type: 'linear' }
                };
                commands.push(Commands.addKeyframe(
                    tracks, prop, newKeyframe,
                    () => this.refreshAll()
                ));
            }
        });
        
        if (commands.length > 0) {
            this.history.execute(Commands.batch(commands, 'Update object transform'));
        }
        
        this.properties.setValues(props);
    }

    onPropertyValueChange(prop, value) {
        const obj = this.getSelectedObject();
        if (!obj) return;
        
        const time = this.timeline.getCurrentTime();
        const tracks = obj.animationData.tracks;
        
        const kfData = tracks[prop] ? this.timeline.getKeyframeAt(prop, time, 0.001) : null;
        
        if (kfData) {
            // Update existing keyframe
            const oldValue = kfData.keyframe.value;
            if (oldValue !== value) {
                this.history.execute(Commands.updateKeyframeValue(
                    tracks, prop, kfData.index, value, oldValue,
                    () => this.refreshAll()
                ));
            }
        } else {
            // Auto-add keyframe if none exists at current time
            const newKeyframe = {
                time: time,
                value: value
            };

            if (!STEP_ONLY_PROPS.includes(prop)) {
                newKeyframe.easing = { type: 'linear' };
            }
            
            this.history.execute(Commands.addKeyframe(
                tracks, prop, newKeyframe,
                () => this.refreshAll()
            ));
        }
        
        // Update stage for visual properties
        if (['x', 'y', 'angle', 'scaleX', 'scaleY', 'opacity', 'hidden', 'flipX', 'flipY'].includes(prop)) {
            obj.stageProps[prop] = value;
            this.stage.setObjectProperties();
        }
    }

    toggleKeyframe(prop) {
        const time = this.timeline.getCurrentTime();
        const tracks = this.animationData.tracks;
        
        const kfData = tracks[prop] ? this.timeline.getKeyframeAt(prop, time, 0.001) : null;
        
        if (kfData) {
            this.history.execute(Commands.removeKeyframe(
                tracks, prop, kfData.index,
                () => this.refreshAll()
            ));
        } else {
            const currentValues = this.properties.getValues();
            const newKeyframe = {
                time: time,
                value: currentValues[prop]
            };

            if (!STEP_ONLY_PROPS.includes(prop)) {
                newKeyframe.easing = { type: 'linear' };
            }
            
            this.history.execute(Commands.addKeyframe(
                tracks, prop, newKeyframe,
                () => this.refreshAll()
            ));
        }
    }

    onKeyframeSelect(track, index) {
        if (track && index !== null) {
            const kf = this.animationData.tracks[track]?.keyframes[index];
            if (kf) {
                this.timeline.setCurrentTime(kf.time);
                this.properties.setSelectedKeyframe(track, kf);
                // Show easing section only for non-step-only properties
                this.properties.showEasingSection(!STEP_ONLY_PROPS.includes(track));
            }
        } else {
            this.properties.setSelectedKeyframe(null, null);
            this.properties.showEasingSection(false);
        }
    }

    onKeyframeMoved(track, index, newTime, oldTime) {
        if (newTime === oldTime) return;
        
        const tracks = this.animationData.tracks;
        const kf = tracks[track]?.keyframes[index];
        if (!kf) return;
        
        const existingAtNewTime = this.timeline.getKeyframeAt(track, newTime, 0.01);
        if (existingAtNewTime && existingAtNewTime.index !== index) {
            return;
        }
        
        this.history.execute(Commands.moveKeyframe(
            tracks, track, index, newTime, oldTime,
            () => this.refreshAll()
        ));
    }

    onEasingChange(easing) {
        const selectedKf = this.timeline.getSelectedKeyframeData();
        if (!selectedKf) return;
        
        const tracks = this.animationData.tracks;
        const oldEasing = selectedKf.keyframe.easing ? { ...selectedKf.keyframe.easing } : null;
        
        this.history.execute(Commands.updateKeyframeEasing(
            tracks, selectedKf.track, selectedKf.index, easing, oldEasing,
            () => this.refreshAll()
        ));
    }

    deleteSelectedKeyframe() {
        const selectedKf = this.timeline.getSelectedKeyframeData();
        if (!selectedKf) return;
        
        const tracks = this.animationData.tracks;
        
        this.history.execute(Commands.removeKeyframe(
            tracks, selectedKf.track, selectedKf.index,
            () => {
                this.timeline.deselectKeyframe();
                this.refreshAll();
            }
        ));
    }

    refreshAll() {
        this.timeline.setTracks(this.animationData.tracks);
        this.timeline.render();
        this.onTimeChange(this.timeline.getCurrentTime());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
