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
    }

    dontDraw() { return true; }

    // function to setup a new canvas for drawing
    newCanvas() {
        const baseCanvas = this.gl.canvas;
        this.baseCanvas = baseCanvas;

        var canvas = document.createElement('canvas');
        canvas.width = baseCanvas.width;
        canvas.height = baseCanvas.height;
        canvas.id = 'drawing-canvas';
        this.canvas = canvas;
        baseCanvas.parentNode.appendChild(canvas);


        // setup canvas
        this.ctx = canvas.getContext("2d");
        const ctx = this.ctx;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 5;

        // copy base contents
        baseCanvas.toBlob(async (blob) => {
            const img = new Image();
            img.onload = function () {
                ctx.drawImage(img, 0, 0);
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
        console.log('closing paint tool');
        this.canvas.toBlob(async (blob) => {
            this.io.newImage(URL.createObjectURL(blob));
            this.close();
        }, 'image/png');

    }

    selectColor() {
        if (this.currentColor)
            this.currentColor.style.backgroundColor = this.color;
        this.ctx.globalCompositeOperation = this.blendMode;
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.color;
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

        var start = function (e) {
            clicked = 1;
            ctx.beginPath();
            ctx.moveTo(e.offsetX, e.offsetY);
        };
        var move = function (e) {
            if (clicked) {
                ctx.lineTo(e.offsetX, e.offsetY);
                ctx.stroke();
            }
        };
        var stop = function (e) {
            clicked = 0;
        };
        this.canvas.addEventListener("mousedown", start, false);
        this.canvas.addEventListener("mousemove", move, false);
        document.addEventListener("mouseup", stop, false);
    };
}
