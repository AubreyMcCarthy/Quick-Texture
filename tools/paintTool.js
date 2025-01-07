export class PaintTool {
    constructor() {
        this.color = '#990099';
        this.buttons = [];

        this.lineWidth = 5;
        
        this.eraser = {
            label: "🧽",
            value: false,
            defaultValue: false,
            color: "#000"
        }
        this.polyFill = {
            label: "▨",
            value: false,
            defaultValue: false,
        }

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

    addSelectButton(label, controls) {
        const btn = document.createElement('button');
        btn.innerHTML = label;
        controls.appendChild(btn);
        return btn;
    }
    
    setButtonColor(btn, color) {
        btn.style.backgroundColor = color;
    }

    addColorButton(o, controls) {
        const btn = this.addSelectButton("", controls);
        this.setButtonColor(btn, o.color);
        btn.addEventListener('click', () => {
            this.color = o.color;
            this.eraser.value = false;
            this.eraser.btn.classList.remove("btn-enabled");
            this.selectColor(o.color);
        });
        o.btn = btn;
        this.buttons.push(o);
    }
    addToolButton(o, controls) {
        const btn = this.addSelectButton(o.label, controls);

        if(o.value)
            btn.classList.add("btn-enabled");

        btn.addEventListener('click', () => {
            o.value = !o.value;
            if(o.value)
                btn.classList.add("btn-enabled");
            else
                btn.classList.remove("btn-enabled");

            this.selectColor();
        });
        o.btn = btn;
    }

    addSelect(o, controls) {
        const select = document.createElement('select');
        controls.appendChild(select);

        //Create and append the options
        for (var i = 0; i < o.length; i++) {
            var option = document.createElement("option");
            option.value = o[i].value;
            option.text = o[i].label;
            select.appendChild(option);
        }
        return select;
    }

    getControls(processor) {
        this.toolBtn.disabled = true;
        const controls = document.getElementById('controls-tool-specific');
        controls.innerHTML = "";


        for (let i = 0; i < this.colors.length; i++) {
            this.addColorButton(this.colors[i], controls);
        }
        this.addToolButton(this.eraser, controls);
        this.addToolButton(this.polyFill, controls);
        const fillBtn = this.addSelectButton("🪣", controls);
        fillBtn.addEventListener('click', () => this.fillColor());

        const blendSelect = this.addSelect(this.blendModes, controls);
        blendSelect.addEventListener("change", (event) => {
            this.blendMode = event.target.value;
            this.ctx.globalCompositeOperation = this.blendMode;
        });
        blendSelect.id = "blend-mode-select";
        blendSelect.value = this.blendMode;

        const hr = document.createElement('hr');
        controls.appendChild(hr);
        this.currentColor = this.addSelectButton("", controls);
        this.setButtonColor(this.currentColor, this.color);

        this.newCanvas();

        // Add undo/redo buttons
        const undoButton = document.createElement('button');
        undoButton.innerHTML = '&ShortLeftArrow;';
        undoButton.addEventListener('click', () => this.undo());
        controls.appendChild(undoButton);

        const redoButton = document.createElement('button');
        redoButton.innerHTML = '&rightarrow;';
        redoButton.addEventListener('click', () => this.redo());
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


        const ctx = canvas.getContext("2d");
        this.ctx = ctx;
        const historyCtx = historyCanvas.getContext('2d');
        this.historyCtx = historyCtx;

        [this.ctx, this.historyCtx].forEach(ctx => {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        });

        // copy existing contents to paint tool's canvas
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
        if(this.eraser.value)
        {
            this.ctx.globalCompositeOperation = 'destination-out';
            if (this.currentColor)
            {
                this.currentColor.style.backgroundColor = this.eraser.color;
                this.currentColor.innerHTML = this.eraser.label;
            }
        }
        else
        {
            this.ctx.globalCompositeOperation = this.blendMode;
            if (this.currentColor)
            {
                this.currentColor.style.backgroundColor = this.color;
                this.currentColor.innerHTML = "";
            }
        }

        this.ctx.lineWidth = this.polyFill.value ? 1 : this.lineWidth;
        
        this.ctx.fillStyle = this.color;
        this.ctx.strokeStyle = this.color;
        this.ctx.beginPath();
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

        if(this.polyFill.value)
            this.ctx.fill();

        this.state.isDrawing = false;
        if (this.state.currentPath.points.length > 0) {
            // this.state.paths.push([...this.state.currentPath.points]);
            this.addToUndoStack({
                points: [...this.state.currentPath.points],
                color: this.state.currentPath.color,
                paintAction: this.PaintActions.Draw,
                blend: this.ctx.globalCompositeOperation,
                polyFill: this.polyFill.value,
                lineWidth: this.ctx.lineWidth,
            });
        }
    }


    // prototype to	start drawing on touch using canvas moveTo and lineTo
    drawTouch() {
        const startDrawing = this.startDrawing.bind(this);
        const draw = this.draw.bind(this);
        const stopDrawing = this.stopDrawing.bind(this);
        var start = function (e) {
            const x = e.changedTouches[0].pageX - e.touches[0].target.offsetLeft;
            const y = e.changedTouches[0].pageY - e.touches[0].target.offsetTop;
            startDrawing(x, y);
        };
        var move = function (e) {
            e.preventDefault();
            const x = e.changedTouches[0].pageX - e.touches[0].target.offsetLeft;
            const y = e.changedTouches[0].pageY - e.touches[0].target.offsetTop;
            draw(x, y);
        };
        var stop = function (e) {
            stopDrawing();
        };

        let numberOfTouches = 0;
        let tapInitiated = 0.0;
        var detectTaps = function(e) {
            if(e.touches.length > 1 && e.touches.length < 4) {
                numberOfTouches = e.touches.length;
                tapInitiated = Date.now();
            }
            else
            {
                numberOfTouches = 0;
            }
        }
        var tapCompleted = function(e) {
            if(numberOfTouches > 0)
            {
                const elapsedMillisec = Date.now() - tapInitiated;
                if(elapsedMillisec > 1000)
                    return;
                if(numberOfTouches == 2)
                    this.undo();
                else
                    this.redo();
            }
        }
        this.canvas.addEventListener("touchstart", start, false);
        this.canvas.addEventListener("touchmove", move, false);
        this.canvas.addEventListener("touchend", stop, false);
        document.addEventListener("touchstart", detectTaps, false);
        document.addEventListener("touchend", tapCompleted, false);
    };

    // prototype to	start drawing on pointer(microsoft ie) using canvas moveTo and lineTo
    drawPointer() {
        const startDrawing = this.startDrawing.bind(this);
        const draw = this.draw.bind(this);
        const stopDrawing = this.stopDrawing.bind(this);
        var start = function (e) {
            e = e.originalEvent;
            const x = e.offsetX;
            const y = e.offsetY;
            startDrawing(x, y);
        };
        var move = function (e) {
            e.preventDefault();
            e = e.originalEvent;
            const x = e.offsetX;
            const y = e.offsetY;
            draw(x, y);
        };
        var stop = function (e) {
            stopDrawing();
        };
        this.canvas.addEventListener("MSPointerDown", start, false);
        this.canvas.addEventListener("MSPointerMove", move, false);
        document.addEventListener("MSPointerUp", stop, false);
    };

    // prototype to	start drawing on mouse using canvas moveTo and lineTo
    drawMouse() {
        var clicked = 0;

        const startDrawing = this.startDrawing.bind(this);
        const draw = this.draw.bind(this);
        const stopDrawing = this.stopDrawing.bind(this);
        var start = function (e) {
            clicked = 1;
            startDrawing(e.offsetX, e.offsetY);
        };
        var move = function (e) {
            if (clicked) {
                draw(e.offsetX, e.offsetY);
            }
        };
        var stop = function (e) {
            clicked = 0;
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
            this.drawCompletePath(path, this.ctx);
        }

        this.selectColor();
    }

    drawCompletePath(path, ctx) {
        ctx.globalCompositeOperation = path.blend;
        if(path.paintAction === this.PaintActions.Draw) {
            ctx.lineWidth = path.lineWidth;
            ctx.strokeStyle = path.color;
            ctx.fillStyle = path.color;
            ctx.beginPath();
            for (let i = 1; i < path.points.length; i++) {
                ctx.lineTo(path.points[i].x, path.points[i].y);
            }
            ctx.stroke();
            if(path.polyFill)
                ctx.fill()
        }
        else if(path.paintAction === this.PaintActions.CanvasFill) {
            ctx.beginPath();
            ctx.fillStyle = path.color;
            ctx.rect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fill();
        }
    }

    // Remove oldest path and draw it on the history canvas
    bakeOldestPath() {
        const path = this.state.paths.shift();
        const ctx = this.historyCtx;
        this.drawCompletePath(path, ctx);        
    }
}
