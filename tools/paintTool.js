export class PaintTool {
    constructor() {
        this.color = '#990099';

    }

    init(gl, processor, io) {
        this.gl = gl;
        this.io = io;

        const controls = document.getElementById('controls-toolbar');


        this.toolBtn = document.createElement('button');
        this.toolBtn.innerHTML = "paint";
        this.toolBtn.addEventListener('click', () => {
            processor.setTool(this);
        });

        controls.appendChild(this.toolBtn);

        return {
            name: 'paint',
            aliases: ['Invert', 'Flip'],
            description: 'Black becomes white, white becomes black, etc',
            action: () => processor.setTool(this)
        }
    }

    getControls(processor) {
        this.toolBtn.disabled = true;
        const controls = document.getElementById('controls-tool-specific');
        controls.innerHTML = "";
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
            img.onload = function() {
                ctx.drawImage(img, 0, 0);
            };
            img.src = URL.createObjectURL(blob);
        }, 'image/png');
        this.baseCanvas.style.display = 'none';

        // setup to trigger drawing on mouse or touch
        this.drawTouch();
        // this.drawPointer();
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

    // selectColor(el){
    //     for(var i=0;i<document.getElementsByClassName("palette").length;i++){
    //         document.getElementsByClassName("palette")[i].style.borderColor = "#777";
    //         document.getElementsByClassName("palette")[i].style.borderStyle = "solid";
    //     }
    //     el.style.borderColor = "#fff";
    //     el.style.borderStyle = "dashed";
    //     color = window.getComputedStyle(el).backgroundColor;
    //     ctx.beginPath();
    //     ctx.strokeStyle = color;
    // }


    // prototype to	start drawing on touch using canvas moveTo and lineTo
    drawTouch() {
        const ctx = this.ctx;
        var start = function (e) {
            ctx.beginPath();
            const x = e.changedTouches[0].offsetX;
            const y = e.changedTouches[0].offsetY;
            ctx.moveTo(x, y);
        };
        var move = function (e) {
            e.preventDefault();
            const x = e.changedTouches[0].offsetX;
            const y = e.changedTouches[0].offsetY;
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
