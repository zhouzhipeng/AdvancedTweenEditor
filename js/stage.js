/**
 * Stage Module - Canvas rendering and object manipulation
 */
class Stage {
    constructor(canvasId, containerId) {
        this.canvas = document.getElementById(canvasId);
        this.container = document.getElementById(containerId);
        this.ctx = this.canvas.getContext('2d');
        
        this.zoom = 1;
        this.minZoom = 0.25;
        this.maxZoom = 4;
        this.zoomStep = 0.25;
        
        this.panX = 0;
        this.panY = 0;
        
        this.gridSize = 50;
        this.handleSize = 10;
        this.rotationHandleOffset = 30;
        
        // Multi-object support
        this.objects = [];
        this.selectedObjectId = null;
        
        this.defaultImage = null;
        this.createDefaultImage();
        
        this.objectSelectListeners = [];
        
        this.isDragging = false;
        this.dragType = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragStartObjX = 0;
        this.dragStartObjY = 0;
        this.dragStartAngle = 0;
        this.dragStartScaleX = 1;
        this.dragStartScaleY = 1;
        
        // Middle mouse button panning
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.panStartPanX = 0;
        this.panStartPanY = 0;
        
        this.listeners = {
            change: []
        };
        
        this.setupEventListeners();
        this.resize();
    }

    createDefaultImage() {
        this.defaultImage = this.generateDefaultImage('OBJECT');
    }
    
    generateDefaultImage(name) {
        const size = 100;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        const checkSize = 10;
        for (let y = 0; y < size; y += checkSize) {
            for (let x = 0; x < size; x += checkSize) {
                ctx.fillStyle = ((x + y) / checkSize) % 2 === 0 ? '#666' : '#999';
                ctx.fillRect(x, y, checkSize, checkSize);
            }
        }
        
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, size - 4, size - 4);
        
        ctx.fillStyle = '#4ecdc4';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const maxWidth = size - 10;
        let fontSize = 14;
        ctx.font = `bold ${fontSize}px sans-serif`;
        
        while (ctx.measureText(name).width > maxWidth && fontSize > 8) {
            fontSize--;
            ctx.font = `bold ${fontSize}px sans-serif`;
        }
        
        ctx.fillText(name, size / 2, size / 2, maxWidth);
        
        // Return canvas directly (can be used with drawImage without async loading)
        return canvas;
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        
        // Prevent context menu on middle click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        this.canvas.addEventListener('auxclick', (e) => e.preventDefault());
        
        window.addEventListener('resize', () => {
            this.resize();
            this.render();
        });
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        this.panX = this.canvas.width / 2;
        this.panY = this.canvas.height / 2;
    }

    setZoom(zoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
        this.render();
        return this.zoom;
    }

    zoomIn() {
        return this.setZoom(this.zoom + this.zoomStep);
    }

    zoomOut() {
        return this.setZoom(this.zoom - this.zoomStep);
    }

    resetZoom() {
        this.zoom = 1;
        this.panX = this.canvas.width / 2;
        this.panY = this.canvas.height / 2;
        this.render();
        return this.zoom;
    }

    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.panX) / this.zoom,
            y: (screenY - this.panY) / this.zoom
        };
    }

    worldToScreen(worldX, worldY) {
        return {
            x: worldX * this.zoom + this.panX,
            y: worldY * this.zoom + this.panY
        };
    }

    setObjectProperties() {
        this.render();
    }

    getObjectProperties() {
        const selectedObj = this.getSelectedObject();
        return selectedObj ? { ...selectedObj.stageProps } : {};
    }

    // Multi-object methods
    setObjects(objects, selectedObjectId) {
        this.objects = objects;
        this.selectedObjectId = selectedObjectId;
    }
    
    getSelectedObject() {
        return this.objects.find(o => o.id === this.selectedObjectId);
    }
    
    onObjectSelect(callback) {
        this.objectSelectListeners.push(callback);
    }
    
    notifyObjectSelect(objectId) {
        this.objectSelectListeners.forEach(cb => cb(objectId));
    }
    
    getObjectAtPosition(screenX, screenY) {
        // Check objects in reverse order (top to bottom in z-order)
        // Use array index as tiebreaker when zIndex is equal (later objects are on top)
        const indexedObjects = this.objects.map((obj, index) => ({ obj, index }));
        const sortedObjects = indexedObjects.sort((a, b) => {
            const zDiff = (b.obj.stageProps.zIndex || 0) - (a.obj.stageProps.zIndex || 0);
            return zDiff !== 0 ? zDiff : b.index - a.index;
        }).map(item => item.obj);
        
        for (const obj of sortedObjects) {
            if (obj.stageProps.hidden) continue;
            
            const pos = this.worldToScreen(obj.stageProps.x, obj.stageProps.y);
            const width = obj.image ? obj.image.width : 100;
            const height = obj.image ? obj.image.height : 100;
            const hw = (width * obj.stageProps.scaleX * this.zoom) / 2;
            const hh = (height * obj.stageProps.scaleY * this.zoom) / 2;
            const angle = obj.stageProps.angle * Math.PI / 180;
            
            const dx = screenX - pos.x;
            const dy = screenY - pos.y;
            const localX = dx * Math.cos(-angle) - dy * Math.sin(-angle);
            const localY = dx * Math.sin(-angle) + dy * Math.cos(-angle);
            
            if (Math.abs(localX) < hw && Math.abs(localY) < hh) {
                return obj.id;
            }
        }
        
        return null;
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        ctx.fillStyle = '#1e1e2e';
        ctx.fillRect(0, 0, w, h);
        
        this.drawGrid();
        this.drawOrigin();
        
        // Draw all objects (multi-object mode)
        if (this.objects.length > 0) {
            // Sort by zIndex for proper draw order (lower zIndex drawn first)
            // Use array index as tiebreaker (earlier objects drawn first, later on top)
            const indexedObjects = this.objects.map((obj, index) => ({ obj, index }));
            const sortedObjects = indexedObjects.sort((a, b) => {
                const zDiff = (a.obj.stageProps.zIndex || 0) - (b.obj.stageProps.zIndex || 0);
                return zDiff !== 0 ? zDiff : a.index - b.index;
            }).map(item => item.obj);
            
            sortedObjects.forEach(obj => {
                if (!obj.stageProps.hidden) {
                    this.drawSingleObject(obj);
                    // Only draw handles for selected object
                    if (obj.id === this.selectedObjectId) {
                        this.drawHandlesForObject(obj);
                    }
                }
            });
        }
    }
    
    drawSingleObject(obj) {
        const ctx = this.ctx;
        const props = obj.stageProps;
        const pos = this.worldToScreen(props.x, props.y);
        
        const img = obj.image || obj.defaultImage || this.defaultImage;
        if (!img) return;
        
        const width = img.width;
        const height = img.height;
        const scaledWidth = width * props.scaleX * this.zoom;
        const scaledHeight = height * props.scaleY * this.zoom;
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(props.angle * Math.PI / 180);
        ctx.scale(props.flipX ? -1 : 1, props.flipY ? -1 : 1);
        ctx.globalAlpha = props.opacity / 255;
        
        ctx.drawImage(
            img,
            -scaledWidth / 2,
            -scaledHeight / 2,
            scaledWidth,
            scaledHeight
        );
        
        ctx.restore();
    }
    
    drawHandlesForObject(obj) {
        const ctx = this.ctx;
        const props = obj.stageProps;
        const pos = this.worldToScreen(props.x, props.y);
        
        const img = obj.image || obj.defaultImage || this.defaultImage;
        const width = img ? img.width : 100;
        const height = img ? img.height : 100;
        
        const hw = (width * props.scaleX * this.zoom) / 2;
        const hh = (height * props.scaleY * this.zoom) / 2;
        const angle = props.angle * Math.PI / 180;
        
        const corners = [
            { x: -hw, y: -hh },
            { x: hw, y: -hh },
            { x: hw, y: hh },
            { x: -hw, y: hh }
        ];
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#4ecdc4';
        corners.forEach(corner => {
            ctx.fillRect(
                corner.x - this.handleSize / 2,
                corner.y - this.handleSize / 2,
                this.handleSize,
                this.handleSize
            );
        });
        
        const rotHandleY = -hh - this.rotationHandleOffset;
        ctx.beginPath();
        ctx.moveTo(0, -hh);
        ctx.lineTo(0, rotHandleY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(0, rotHandleY, this.handleSize / 2 + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        
        ctx.restore();
    }

    drawGrid() {
        const ctx = this.ctx;
        const gridSize = this.gridSize * this.zoom;
        
        ctx.strokeStyle = '#2a2a3e';
        ctx.lineWidth = 1;
        
        const startX = this.panX % gridSize;
        const startY = this.panY % gridSize;
        
        ctx.beginPath();
        for (let x = startX; x < this.canvas.width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
        }
        for (let y = startY; y < this.canvas.height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
        }
        ctx.stroke();
    }

    drawOrigin() {
        const ctx = this.ctx;
        const origin = this.worldToScreen(0, 0);
        
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(origin.x - 15, origin.y);
        ctx.lineTo(origin.x + 15, origin.y);
        ctx.moveTo(origin.x, origin.y - 15);
        ctx.lineTo(origin.x, origin.y + 15);
        ctx.stroke();
        
        ctx.fillStyle = '#ff6b6b';
        ctx.font = '12px sans-serif';
        ctx.fillText('(0, 0)', origin.x + 8, origin.y - 8);
    }

    getHandleAtPosition(screenX, screenY) {
        const selectedObj = this.getSelectedObject();
        if (!selectedObj) return null;
        
        const props = selectedObj.stageProps;
        const pos = this.worldToScreen(props.x, props.y);
        
        const objWidth = selectedObj.image ? selectedObj.image.width : 100;
        const objHeight = selectedObj.image ? selectedObj.image.height : 100;
        
        const hw = (objWidth * props.scaleX * this.zoom) / 2;
        const hh = (objHeight * props.scaleY * this.zoom) / 2;
        const angle = props.angle * Math.PI / 180;
        
        const dx = screenX - pos.x;
        const dy = screenY - pos.y;
        const localX = dx * Math.cos(-angle) - dy * Math.sin(-angle);
        const localY = dx * Math.sin(-angle) + dy * Math.cos(-angle);
        
        const rotHandleY = -hh - this.rotationHandleOffset;
        if (Math.abs(localX) < this.handleSize && Math.abs(localY - rotHandleY) < this.handleSize) {
            return 'rotate';
        }
        
        const corners = [
            { x: -hw, y: -hh, type: 'scale-nw' },
            { x: hw, y: -hh, type: 'scale-ne' },
            { x: hw, y: hh, type: 'scale-se' },
            { x: -hw, y: hh, type: 'scale-sw' }
        ];
        
        for (const corner of corners) {
            if (Math.abs(localX - corner.x) < this.handleSize && 
                Math.abs(localY - corner.y) < this.handleSize) {
                return corner.type;
            }
        }
        
        if (Math.abs(localX) < hw && Math.abs(localY) < hh) {
            return 'move';
        }
        
        return null;
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // Middle mouse button for panning
        if (e.button === 1) {
            e.preventDefault();
            this.isPanning = true;
            this.panStartX = screenX;
            this.panStartY = screenY;
            this.panStartPanX = this.panX;
            this.panStartPanY = this.panY;
            this.canvas.style.cursor = 'grabbing';
            return;
        }
        
        // Left mouse button for object manipulation
        if (e.button !== 0) return;
        
        // Check if clicking on a different object (for selection)
        const clickedObjectId = this.getObjectAtPosition(screenX, screenY);
        if (clickedObjectId && clickedObjectId !== this.selectedObjectId) {
            this.notifyObjectSelect(clickedObjectId);
            return;
        }
        
        const handle = this.getHandleAtPosition(screenX, screenY);
        
        if (handle) {
            const selectedObj = this.getSelectedObject();
            if (!selectedObj) return;
            
            this.isDragging = true;
            this.dragType = handle;
            this.dragStartX = screenX;
            this.dragStartY = screenY;
            this.dragStartObjX = selectedObj.stageProps.x;
            this.dragStartObjY = selectedObj.stageProps.y;
            this.dragStartAngle = selectedObj.stageProps.angle;
            this.dragStartScaleX = selectedObj.stageProps.scaleX;
            this.dragStartScaleY = selectedObj.stageProps.scaleY;
            this.canvas.style.cursor = this.getCursorForHandle(handle);
        }
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // Handle panning
        if (this.isPanning) {
            const deltaX = screenX - this.panStartX;
            const deltaY = screenY - this.panStartY;
            this.panX = this.panStartPanX + deltaX;
            this.panY = this.panStartPanY + deltaY;
            this.render();
            return;
        }
        
        if (this.isDragging) {
            const selectedObj = this.getSelectedObject();
            if (!selectedObj) return;
            
            const deltaX = screenX - this.dragStartX;
            const deltaY = screenY - this.dragStartY;
            
            if (this.dragType === 'move') {
                selectedObj.stageProps.x = this.dragStartObjX + deltaX / this.zoom;
                selectedObj.stageProps.y = this.dragStartObjY + deltaY / this.zoom;
            } else if (this.dragType === 'rotate') {
                const pos = this.worldToScreen(selectedObj.stageProps.x, selectedObj.stageProps.y);
                const startAngle = Math.atan2(this.dragStartY - pos.y, this.dragStartX - pos.x);
                const currentAngle = Math.atan2(screenY - pos.y, screenX - pos.x);
                let deltaAngle = (currentAngle - startAngle) * 180 / Math.PI;
                selectedObj.stageProps.angle = this.dragStartAngle + deltaAngle;
            } else if (this.dragType.startsWith('scale-')) {
                const pos = this.worldToScreen(selectedObj.stageProps.x, selectedObj.stageProps.y);
                const angle = selectedObj.stageProps.angle * Math.PI / 180;
                
                const startDX = this.dragStartX - pos.x;
                const startDY = this.dragStartY - pos.y;
                const startLocalX = Math.abs(startDX * Math.cos(-angle) - startDY * Math.sin(-angle));
                const startLocalY = Math.abs(startDX * Math.sin(-angle) + startDY * Math.cos(-angle));
                
                const currentDX = screenX - pos.x;
                const currentDY = screenY - pos.y;
                const currentLocalX = Math.abs(currentDX * Math.cos(-angle) - currentDY * Math.sin(-angle));
                const currentLocalY = Math.abs(currentDX * Math.sin(-angle) + currentDY * Math.cos(-angle));
                
                if (startLocalX > 0.001) {
                    selectedObj.stageProps.scaleX = this.dragStartScaleX * (currentLocalX / startLocalX);
                }
                if (startLocalY > 0.001) {
                    selectedObj.stageProps.scaleY = this.dragStartScaleY * (currentLocalY / startLocalY);
                }
                
                selectedObj.stageProps.scaleX = Math.max(0.01, selectedObj.stageProps.scaleX);
                selectedObj.stageProps.scaleY = Math.max(0.01, selectedObj.stageProps.scaleY);
            }
            
            this.render();
        } else {
            const handle = this.getHandleAtPosition(screenX, screenY);
            this.canvas.style.cursor = this.getCursorForHandle(handle);
        }
    }

    onMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'default';
            return;
        }
        
        if (this.isDragging) {
            this.isDragging = false;
            this.notifyChange();
        }
        this.dragType = null;
        this.canvas.style.cursor = 'default';
    }

    onWheel(e) {
        e.preventDefault();
        if (e.deltaY < 0) {
            this.zoomIn();
        } else {
            this.zoomOut();
        }
        this.notifyZoomChange();
    }

    getCursorForHandle(handle) {
        if (!handle) return 'default';
        if (handle === 'move') return 'move';
        if (handle === 'rotate') return 'grab';
        if (handle.startsWith('scale-')) return handle.replace('scale-', '') + '-resize';
        return 'default';
    }

    onChange(callback) {
        this.listeners.change.push(callback);
    }

    notifyChange() {
        const props = this.getObjectProperties();
        const oldProps = {
            x: this.dragStartObjX,
            y: this.dragStartObjY,
            angle: this.dragStartAngle,
            scaleX: this.dragStartScaleX,
            scaleY: this.dragStartScaleY
        };
        this.listeners.change.forEach(cb => cb(props, oldProps));
    }

    notifyZoomChange() {
        const event = new CustomEvent('zoomchange', { detail: { zoom: this.zoom } });
        this.canvas.dispatchEvent(event);
    }
}

window.Stage = Stage;
