export class PaintTool {
    constructor() {
        this.color = '#990099';
        this.buttons = [];

        this.blendModes = [
            {
                label: "Normal",
                value: "source-over",
            },
            {
                label: "Add",
                value: "lighter",
            },
            {
                label: "Max",
                value: "lighten",
            },
            {
                label: "Multiply",
                value: "multiply",
            },
            {
                label: "Screen",
                value: "screen",
            },
            {
                label: "Overlay",
                value: "overlay",
            },
            {
                label: "Darken",
                value: "darken",
            },
            {
                label: "Hue",
                value: "hue",  
            },
            {
                label: "Saturation",
                value: "saturation",
            },
            {
                label: "Color",
                value: "color",
            },
            {
                label: "Luminosity",
                value: "luminosity",
            },
        ]
        this.blendMode = this.blendModes[0].value;

        const PaintActions = {
            CanvasFill: "CanvasFill",
            Draw: "Draw",
            Fill: "Fill",
        }
        this.PaintActions = PaintActions

        this.colors = [
            {
                lable: "Black",
                color: '#000',
            },
            {
                lable: "White",
                color: '#fff',
            },
            {
                lable: "Red",
                color: '#ff0000',
            },
            {
                lable: "Green",
                color: '#00ff00',
            },
            {
                lable: "Blue",
                color: '#0000ff',
            },
            {
                lable: "Steel Pink",
                color: '#C23AA9',
            },
            {
                lable: "Coral",
                color: '#FB8F67',
            },

            {
                lable: "Naples Yellow",
                color: '#F8E16C',
            },
            {
                lable: "Mint",
                color: '#00C49A',
            },
            {
                lable: "Blue Green",
                color: '#00A0C0',
            },
            {
                lable: "Black Grey",
                color: '#303B2B',
            },
        ]
        this.color = this.colors[0].color;
        this.eraser = {
            lable: "Erase",
            color: '#999',
        }
    }

    init(gl, processor, io) {
        this.gl = gl;
        this.io = io;

        const controls = document.getElementById('controls-toolbar');


        this.toolBtn = document.createElement('button');
        this.toolBtn.innerHTML = "Draw";
        this.toolBtn.addEventListener('click', () => {
            processor.setTool(this);
        });

        controls.appendChild(this.toolBtn);

        return {
            name: 'Draw',
            aliases: ['Paint', 'Brush', 'Pen', 'Pencil', 'Sketch'],
            description: 'Sketch on the canvas',
            action: () => processor.setTool(this)
        }
    }

    addSelectButton(label, color, controls) {
        const btn = document.createElement('button');
        btn.innerHTML = label;
        btn.style.backgroundColor = color;
        controls.appendChild(btn);
        return btn;
    }

    addColorButton(o, controls) {
        const btn = this.addSelectButton("", o.color, controls);
        btn.addEventListener('click', () => {
            this.color = o.color;
            this.selectColor(o.color);
        });
        o.btn = btn;
        this.buttons.push(o);
    }
    addEraserButton(o, controls) {
        const btn = this.addSelectButton('🧽', o.color, controls);
        btn.addEventListener('click', () => {
            this.selectEraser(o.color);
        });
        o.btn = btn;
        this.buttons.push(o);
    }

    addSelect(o, controls) {
        const select = document.createElement('select');
        select.id = "blend-mode-select";
        controls.appendChild(select);

        //Create and append the options
        for (var i = 0; i < o.length; i++) {
            var option = document.createElement("option");
            option.value = o[i].value;
            option.text = o[i].label;
            select.appendChild(option);
        }
        select.value = this.blendMode;
        return select;
    }

    getControls(processor) {
        this.toolBtn.disabled = true;
        const controls = document.getElementById('controls-tool-specific');
        controls.innerHTML = "";


        for (let i = 0; i < this.colors.length; i++) {
            this.addColorButton(this.colors[i], controls);
        }
        this.addEraserButton(this.eraser, controls)
        const fillBtn = this.addSelectButton("Fill Canvas", '#000', controls);
        fillBtn.addEventListener('click', () => this.fillColor());

        const blendSelect = this.addSelect(this.blendModes, controls);
        blendSelect.addEventListener("change", (event) => {
            this.blendMode = event.target.value;
            this.ctx.globalCompositeOperation = this.blendMode;
        });

        const hr = document.createElement('hr');
        controls.appendChild(hr);
        this.currentColor = this.addSelectButton("", this.color, controls);

        this.newCanvas();

        // Add undo/redo buttons
        const undoButton = document.createElement('button');
        undoButton.textContent = 'Undo';
        undoButton.addEventListener('click', () => this.undo());
        // undoButton.onclick = () => this.undo;
        controls.appendChild(undoButton);

        const redoButton = document.createElement('button');
        redoButton.textContent = 'Redo';
        redoButton.addEventListener('click', () => this.redo());
        // redoButton.onclick = () => this.redo;
        controls.appendChild(redoButton);
    }

    dontDraw() { return true; }

    // function to setup a new canvas for drawing
    newCanvas() {
        const state = {
            isDrawing: false,
            paths: [],
            redoPaths: [],
            maxUndoSteps: 20,
            currentPath: [],
        };
        this.state = state;
        
        const baseCanvas = this.gl.canvas;
        this.baseCanvas = baseCanvas;

        const canvas = document.createElement('canvas');
        canvas.width = baseCanvas.width;
        canvas.height = baseCanvas.height;
        canvas.id = 'drawing-canvas';
        this.canvas = canvas;
        baseCanvas.parentNode.appendChild(canvas);

        // Canvas setup
        const historyCanvas = document.createElement('canvas');
        this.historyCanvas = historyCanvas;
        historyCanvas.width = canvas.width;
        historyCanvas.height = canvas.height;


        // setup canvas
        const ctx = canvas.getContext("2d");
        this.ctx = ctx;
        const historyCtx = historyCanvas.getContext('2d');
        this.historyCtx = historyCtx;
        // ctx.strokeStyle = this.color;
        // ctx.lineWidth = 5;

        [this.ctx, this.historyCtx].forEach(ctx => {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        });

        // copy base contents
        baseCanvas.toBlob(async (blob) => {
            const img = new Image();
            img.onload = function () {
                ctx.drawImage(img, 0, 0);
                historyCtx.drawImage(img, 0, 0);
            };
            img.src = URL.createObjectURL(blob);
        }, 'image/png');
        this.baseCanvas.style.display = 'none';

        // setup to trigger drawing on mouse or touch
        this.drawTouch();
        this.drawPointer();
        this.drawMouse();

    }

    close() {
        this.baseCanvas.style.display = 'inline';
        this.canvas.remove();

    }

    apply() {
        // new image with contents
        this.canvas.toBlob(async (blob) => {
            this.io.newImage(URL.createObjectURL(blob));
            this.close();
        }, 'image/png');

    }

    selectColor() {
        if (this.currentColor)
            this.currentColor.style.backgroundColor = this.color;
        this.ctx.globalCompositeOperation = this.blendMode;
        // this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.color;
        // this.ctx.fillStyle = this.color;
    }

    selectEraser(c) {
        this.color = c;
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.color;
    }

    fillColor() {
        this.ctx.beginPath();
        this.ctx.fillStyle = this.color;
        this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fill();

        this.addToUndoStack({
            color: this.color,
            paintAction: this.PaintActions.CanvasFill,
            blend: this.ctx.globalCompositeOperation,
        });
    }

    startDrawing(posX, posY) {
        this.state.isDrawing = true;
        this.state.currentPath = {
            points: [],
            color: this.color,
            paintAction: this.PaintActions.Draw,
        };
        this.state.currentPath.points.push({ x: posX, y: posY });

        this.ctx.beginPath();
        this.ctx.moveTo(posX, posY);
    }

    draw(posX, posY) {
        if (!this.state.isDrawing) return;

        const newPoint = { x: posX, y: posY };
        this.state.currentPath.points.push(newPoint);

        // const lastPoint = state.currentPath[state.currentPath.length - 2];
        // activeCtx.beginPath();
        // activeCtx.moveTo(lastPoint.x, lastPoint.y);
        // activeCtx.lineTo(newPoint.x, newPoint.y);
        // activeCtx.stroke();

        // this.ctx.moveTo(lastPoint.x, lastPoint.y)
        this.ctx.lineTo(posX, posY);
        this.ctx.stroke();
    }

    addToUndoStack(a) {
        this.state.paths.push(a);
        this.state.redoPaths = [];

        // If we exceed maxUndoSteps, bake the oldest path into history
        if (this.state.paths.length > this.state.maxUndoSteps) {
            this.bakeOldestPath();
        }
    }

    stopDrawing() {
        if (!this.state.isDrawing) return;

        this.state.isDrawing = false;
        if (this.state.currentPath.points.length > 0) {
            // this.state.paths.push([...this.state.currentPath.points]);
            this.addToUndoStack({
                points: [...this.state.currentPath.points],
                color: this.state.currentPath.color,
                paintAction: this.PaintActions.Draw,
                blend: this.ctx.globalCompositeOperation,
            });
        }
    }


    // prototype to	start drawing on touch using canvas moveTo and lineTo
    drawTouch() {
        const ctx = this.ctx;
        var start = function (e) {
            ctx.beginPath();
            const x = e.changedTouches[0].pageX - e.touches[0].target.offsetLeft;
            const y = e.changedTouches[0].pageY - e.touches[0].target.offsetTop;
            ctx.moveTo(x, y);
        };
        var move = function (e) {
            e.preventDefault();
            const x = e.changedTouches[0].pageX - e.touches[0].target.offsetLeft;
            const y = e.changedTouches[0].pageY - e.touches[0].target.offsetTop;
            ctx.lineTo(x, y);
            ctx.stroke();
        };
        this.canvas.addEventListener("touchstart", start, false);
        this.canvas.addEventListener("touchmove", move, false);
    };

    // prototype to	start drawing on pointer(microsoft ie) using canvas moveTo and lineTo
    drawPointer() {
        const ctx = this.ctx;
        var start = function (e) {
            e = e.originalEvent;
            ctx.beginPath();
            const x = e.offsetX;
            const y = e.offsetY;
            ctx.moveTo(x, y);
        };
        var move = function (e) {
            e.preventDefault();
            e = e.originalEvent;
            const x = e.offsetX;
            const y = e.offsetY;
            ctx.moveTo(x, y);
            ctx.stroke();
        };
        this.canvas.addEventListener("MSPointerDown", start, false);
        this.canvas.addEventListener("MSPointerMove", move, false);
    };

    // prototype to	start drawing on mouse using canvas moveTo and lineTo
    drawMouse() {
        const ctx = this.ctx;
        var clicked = 0;

        const startDrawing = this.startDrawing.bind(this);
        const draw = this.draw.bind(this);
        // const stopDrawing = this.stopDrawing;
        // this.stopDrawing.bind(state);
        const stopDrawing = this.stopDrawing.bind(this);
        var start = function (e) {
            clicked = 1;
            // ctx.beginPath();
            // ctx.moveTo(e.offsetX, e.offsetY);
            startDrawing(e.offsetX, e.offsetY);
        };
        var move = function (e) {
            if (clicked) {
                draw(e.offsetX, e.offsetY);
                // ctx.lineTo(e.offsetX, e.offsetY);
                // ctx.stroke();
            }
        };
        var stop = function (e) {
            clicked = 0;
            // ctx.fill(); 
            stopDrawing();
        };
        this.canvas.addEventListener("mousedown", start, false);
        this.canvas.addEventListener("mousemove", move, false);
        document.addEventListener("mouseup", stop, false);
    };

    // Undo/Redo functions
    undo() {
        if (this.state.paths.length === 0) return;

        const pathToUndo = this.state.paths.pop();
        this.state.redoPaths.push(pathToUndo);
        this.redrawCanvas();
    }

    redo() {
        if (this.state.redoPaths.length === 0) return;

        const pathToRedo = this.state.redoPaths.pop();
        this.state.paths.push(pathToRedo);
        this.redrawCanvas();
    }

    redrawCanvas() {
        // Clear active canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Copy history canvas content to active canvas
        this.ctx.drawImage(this.historyCanvas, 0, 0);

        // Redraw all paths in the undo stack
        for (const path of this.state.paths) {
            this.ctx.globalCompositeOperation = path.blend;
            if(path.paintAction === this.PaintActions.Draw) {
                this.ctx.strokeStyle = path.color;
                this.ctx.beginPath();
                for (let i = 1; i < path.points.length; i++) {
                    // this.ctx.moveTo(path.points[i - 1].x, path.points[i - 1].y);
                    this.ctx.lineTo(path.points[i].x, path.points[i].y);
                }
                this.ctx.stroke();
            }
            else if(path.paintAction === this.PaintActions.CanvasFill) {
                this.ctx.beginPath();
                this.ctx.fillStyle = path.color;
                this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.fill();
            }
        }

        this.selectColor();
        // TODO: store the current tool and restore it after redraw
        // to avoid eraser edge case
        // if(this.state.paths.at(-1).blend == 'destination-out')
        //     this.selectEraser();
    }

    bakeOldestPath() {
        // Remove oldest path and draw it on the history canvas
        const path = this.state.paths.shift();

        this.historyCtx.globalCompositeOperation = path.blend;
        if(path.paintAction === this.PaintActions.Draw) {
            this.historyCtx.strokeStyle = path.color;
            this.historyCtx.beginPath();
            for (let i = 1; i < path.points.length; i++) {
                // this.historyCtx.moveTo(oldestPath.points[i - 1].x, oldestPath.points[i - 1].y);
                this.historyCtx.lineTo(path.points[i].x, path.points[i].y);
            }
            this.historyCtx.stroke();
        }
        else if(path.paintAction === this.PaintActions.CanvasFill) {
            this.historyCtx.beginPath();
            this.historyCtx.fillStyle = path.color;
            this.historyCtx.rect(0, 0, this.canvas.width, this.canvas.height);
            this.historyCtx.fill();
        }
        
    }
}
