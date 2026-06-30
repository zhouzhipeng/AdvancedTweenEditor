/**
 * Bezier Curve Editor Module - Visual cubic bezier editor
 */
class BezierEditor {
    constructor() {
        this.modal = document.getElementById('bezier-modal');
        this.canvas = document.getElementById('bezier-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.inputX1 = document.getElementById('bezier-x1');
        this.inputY1 = document.getElementById('bezier-y1');
        this.inputX2 = document.getElementById('bezier-x2');
        this.inputY2 = document.getElementById('bezier-y2');
        
        this.btnClose = document.getElementById('btn-close-bezier');
        this.btnCancel = document.getElementById('btn-bezier-cancel');
        this.btnApply = document.getElementById('btn-bezier-apply');
        this.presetButtons = document.querySelectorAll('.bezier-presets button');
        
        this.controlPoints = [0.42, 0, 0.58, 1];
        this.originalPoints = null;
        
        this.padding = 40;
        this.graphWidth = this.canvas.width - this.padding * 2;
        
        // Extended Y range to show values outside 0-1 (for Back easing)
        this.yMin = -0.7;
        this.yMax = 1.7;
        this.yRange = this.yMax - this.yMin;
        
        // Calculate graph height for 1:1 ratio (Y range is 2.4, X range is 1)
        this.graphHeight = this.graphWidth * this.yRange;
        
        this.isDragging = false;
        this.dragPointIndex = -1;
        
        this.onApplyCallback = null;
        
        this.presets = {
            easeInOut: [0.42, 0.0, 0.58, 1.0],
            easeIn: [0.42, 0.0, 1.0, 1.0],
            easeOut: [0.0, 0.0, 0.58, 1.0],
            easeInBack: [0.36, 0.0, 0.66, -0.56],
            easeOutBack: [0.34, 1.56, 0.64, 1.0],
            easeInOutCubic: [0.65, 0, 0.35, 1],
            easeInCubic: [0.32, 0.0, 0.67, 0.0],
            easeOutCubic: [0.33, 1.0, 0.68, 1.0]
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
        
        this.inputX1.addEventListener('input', () => this.onInputChange());
        this.inputY1.addEventListener('input', () => this.onInputChange());
        this.inputX2.addEventListener('input', () => this.onInputChange());
        this.inputY2.addEventListener('input', () => this.onInputChange());
        
        this.btnClose.addEventListener('click', () => this.close());
        this.btnCancel.addEventListener('click', () => this.close());
        this.btnApply.addEventListener('click', () => this.apply());
        
        this.presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = this.presets[btn.dataset.preset];
                if (preset) {
                    this.setControlPoints(preset);
                }
            });
        });
    }

    open(controlPoints, onApply) {
        this.originalPoints = [...controlPoints];
        this.setControlPoints(controlPoints);
        this.onApplyCallback = onApply;
        this.modal.classList.remove('hidden');
    }

    close() {
        this.modal.classList.add('hidden');
        this.onApplyCallback = null;
    }

    apply() {
        if (this.onApplyCallback) {
            this.onApplyCallback([...this.controlPoints]);
        }
        this.close();
    }

    setControlPoints(points) {
        this.controlPoints = [...points];
        this.inputX1.value = points[0];
        this.inputY1.value = points[1];
        this.inputX2.value = points[2];
        this.inputY2.value = points[3];
        this.render();
    }

    getControlPoints() {
        return [...this.controlPoints];
    }

    onInputChange() {
        this.controlPoints = [
            parseFloat(this.inputX1.value) || 0,
            parseFloat(this.inputY1.value) || 0,
            parseFloat(this.inputX2.value) || 0,
            parseFloat(this.inputY2.value) || 0
        ];
        this.controlPoints[0] = Math.max(0, Math.min(1, this.controlPoints[0]));
        this.controlPoints[2] = Math.max(0, Math.min(1, this.controlPoints[2]));
        this.render();
    }

    valueToCanvas(x, y) {
        return {
            x: this.padding + x * this.graphWidth,
            y: this.padding + (this.yMax - y) / this.yRange * this.graphHeight
        };
    }

    canvasToValue(cx, cy) {
        return {
            x: (cx - this.padding) / this.graphWidth,
            y: this.yMax - (cy - this.padding) / this.graphHeight * this.yRange
        };
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        ctx.fillStyle = '#1e1e2e';
        ctx.fillRect(0, 0, w, h);
        
        this.drawGrid();
        this.drawCurve();
        this.drawControlPoints();
    }

    drawGrid() {
        const ctx = this.ctx;
        
        ctx.strokeStyle = '#2a2a3e';
        ctx.lineWidth = 1;
        
        // Vertical grid lines (X axis: 0 to 1)
        for (let i = 0; i <= 4; i++) {
            const x = this.padding + (i / 4) * this.graphWidth;
            ctx.beginPath();
            ctx.moveTo(x, this.padding);
            ctx.lineTo(x, this.padding + this.graphHeight);
            ctx.stroke();
        }
        
        // Horizontal grid lines (Y axis: extended range)
        for (let yVal = -0.5; yVal <= 1.5; yVal += 0.5) {
            const pos = this.valueToCanvas(0, yVal);
            ctx.beginPath();
            ctx.moveTo(this.padding, pos.y);
            ctx.lineTo(this.padding + this.graphWidth, pos.y);
            ctx.stroke();
        }
        
        // Draw the 0-1 box with stronger border
        const p0 = this.valueToCanvas(0, 0);
        const p1 = this.valueToCanvas(1, 1);
        ctx.strokeStyle = '#404060';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.padding, p1.y, this.graphWidth, p0.y - p1.y);
        
        // Outer boundary
        ctx.strokeStyle = '#2a2a3e';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.padding, this.padding, this.graphWidth, this.graphHeight);
        
        // Diagonal reference line (linear)
        ctx.strokeStyle = '#505070';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Labels
        ctx.fillStyle = '#a0a0a0';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        
        // Y axis labels
        for (let yVal = -0.5; yVal <= 1.5; yVal += 0.5) {
            const pos = this.valueToCanvas(0, yVal);
            ctx.fillText(yVal.toFixed(1), this.padding - 5, pos.y + 4);
        }
        
        // X axis labels
        ctx.textAlign = 'center';
        ctx.fillText('0', this.padding, this.padding + this.graphHeight + 14);
        ctx.fillText('1', this.padding + this.graphWidth, this.padding + this.graphHeight + 14);
        ctx.fillText('Time', this.padding + this.graphWidth / 2, this.padding + this.graphHeight + 26);
        
        // Y axis title
        ctx.save();
        ctx.translate(12, this.padding + this.graphHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('Progress', 0, 0);
        ctx.restore();
    }

    drawCurve() {
        const ctx = this.ctx;
        const [x1, y1, x2, y2] = this.controlPoints;
        
        const p0 = this.valueToCanvas(0, 0);
        const p1 = this.valueToCanvas(x1, y1);
        const p2 = this.valueToCanvas(x2, y2);
        const p3 = this.valueToCanvas(1, 1);
        
        ctx.strokeStyle = '#6c8cff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        ctx.stroke();
        
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        
        ctx.setLineDash([]);
    }

    drawControlPoints() {
        const ctx = this.ctx;
        const [x1, y1, x2, y2] = this.controlPoints;
        
        const p0 = this.valueToCanvas(0, 0);
        const p1 = this.valueToCanvas(x1, y1);
        const p2 = this.valueToCanvas(x2, y2);
        const p3 = this.valueToCanvas(1, 1);
        
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(p0.x, p0.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p3.x, p3.y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#4ecdc4';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('P1', p1.x - 7, p1.y + 4);
        ctx.fillText('P2', p2.x - 7, p2.y + 4);
    }

    getPointAtPosition(cx, cy) {
        const [x1, y1, x2, y2] = this.controlPoints;
        const p1 = this.valueToCanvas(x1, y1);
        const p2 = this.valueToCanvas(x2, y2);
        
        const hitRadius = 15;
        
        if (Math.hypot(cx - p1.x, cy - p1.y) < hitRadius) {
            return 0;
        }
        if (Math.hypot(cx - p2.x, cy - p2.y) < hitRadius) {
            return 1;
        }
        
        return -1;
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        
        const pointIndex = this.getPointAtPosition(cx, cy);
        if (pointIndex >= 0) {
            this.isDragging = true;
            this.dragPointIndex = pointIndex;
            this.canvas.style.cursor = 'grabbing';
        }
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        
        if (this.isDragging) {
            const value = this.canvasToValue(cx, cy);
            
            value.x = Math.max(0, Math.min(1, value.x));
            
            if (this.dragPointIndex === 0) {
                this.controlPoints[0] = Math.round(value.x * 100) / 100;
                this.controlPoints[1] = Math.round(value.y * 100) / 100;
                this.inputX1.value = this.controlPoints[0];
                this.inputY1.value = this.controlPoints[1];
            } else {
                this.controlPoints[2] = Math.round(value.x * 100) / 100;
                this.controlPoints[3] = Math.round(value.y * 100) / 100;
                this.inputX2.value = this.controlPoints[2];
                this.inputY2.value = this.controlPoints[3];
            }
            
            this.render();
        } else {
            const pointIndex = this.getPointAtPosition(cx, cy);
            this.canvas.style.cursor = pointIndex >= 0 ? 'grab' : 'default';
        }
    }

    onMouseUp() {
        this.isDragging = false;
        this.dragPointIndex = -1;
        this.canvas.style.cursor = 'default';
    }
}

window.BezierEditor = BezierEditor;
