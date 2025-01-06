import { ShaderUtils } from '../shaderUtils.js';

// TODO: filtering options

function validateOffset(value, min, max) {
    if (value >= min && value < max) {
        return value;
    }

    const range = max - min;
    value -= min;
    const wrapped = value - Math.floor(value / range) * range;
    return wrapped + min;
}

export class TransformTool {
    constructor() {
        this.rotation = 0; // 0, 90, 180, 270
        this.flipX = false;
        this.flipY = false;
        this.offsetX = {
            lable: "Offset X",
            value: 0,
            defaultValue: 0,
            min: -1,
            max: 1,
        };
        this.offsetY = {
            lable: "Offset Y",
            value: 0,
            defaultValue: 0,
            min: -1,
            max: 1,
        };
        this.wrapX = {
            lable: "Wrap X",
            value: true,
            defaultValue: true,
        }
        this.wrapY = {
            lable: "Wrap Y",
            value: true,
            defaultValue: true,
        }
        this.pixelSnap = {
            lable: "Pixel Snap",
            value: true,
            defaultValue: true,
        }

        this.vsSource = `
            attribute vec4 aVertexPosition;
            attribute vec2 aTextureCoord;
            varying highp vec2 vTextureCoord;
            
            uniform vec2 uTextureSize;
            uniform float uRotation; // in radians
            uniform vec2 uFlip; // x and y flip
            uniform vec2 uOffset; // x and y offset
            uniform float uPixelSnap;
            
            void main(void) {
                gl_Position = aVertexPosition;
                
                // Start with original texture coordinates
                vec2 texCoord = aTextureCoord;

                texCoord = texCoord + uOffset;
                
                // Apply flipping
                // texCoord = uFlip > 0 ? vec2(1.0, 1.0) - texCoord : texCoord;
                texCoord = uFlip * (1.0 - texCoord) + (1.0 - uFlip) * texCoord;

                // clamp to pixel grid
                texCoord = 
                    uPixelSnap * floor(texCoord * uTextureSize) / uTextureSize +
                    (1.0-uPixelSnap) * texCoord;
                
                // Apply rotation around center (0.5, 0.5)
                vec2 center = vec2(0.5, 0.5);
                vec2 centered = texCoord - center;
                float cosA = cos(uRotation);
                float sinA = sin(uRotation);
                vec2 rotated = vec2(
                    centered.x * cosA - centered.y * sinA,
                    centered.x * sinA + centered.y * cosA
                );
                texCoord = rotated + center;
                
                vTextureCoord = texCoord;
            }
        `;

        this.fsSource = `
            precision highp float;
            varying highp vec2 vTextureCoord;
            uniform vec2 uWrap;
            uniform sampler2D uSampler;
            
            void main(void) {
                vec2 uv = vTextureCoord;
                // uv = fract(uv);
                uv = uWrap * fract(uv) + (vec2(1,1)-uWrap) * clamp(uv, 0.0, 1.0);
                gl_FragColor = texture2D(uSampler, uv);// + vec4(uWrap, 0, 0);
            }
        `;
    }

    init(gl, processor) {
        this.gl = gl;
        this.program = ShaderUtils.createShaderProgram(gl, this.vsSource, this.fsSource);
        // this.updateUniforms();

        const controls = document.getElementById('controls-toolbar');

        this.toolBtn = document.createElement('button');
        this.toolBtn.innerHTML = "Transform";
        this.toolBtn.addEventListener('click', () => { 
            processor.setTool(this);
        });
    
        controls.appendChild(this.toolBtn);

        return {
            name: 'Transform',
            aliases: ['Translate', 'Offset', 'Rotate'],
            description: 'Offset and Rotate the image',
            action: () => processor.setTool(this)
        }
    }

    addSlider(o, controls, processor) {
        const slider = document.createElement('input');
        slider.id = o.lable.replace(/\s/g, "-") + "-slider";
        slider.type = 'range';
        slider.min = o.min;
        slider.max = o.max;
        slider.value = o.value;
        slider.step = 0.01;
        controls.appendChild(slider);
        slider.addEventListener('input', (value) => {
            o.value = slider.value;
            // console.log("sliders value is " + o.value);
            //  o.validate();
            this.updateUniforms();
            processor.draw();
        });
        o.reset = function() { this.value = this.defaultValue; };
        slider.addEventListener("dblclick", (event) => {
            // console.log('reseting ' + o.lable);
            o.reset();
            // o.value = o.defaultValue;
            slider.value = o.value;
            this.updateUniforms();
            processor.draw();
        });
        o.slider = slider;
    }

    addButton(o, controls, processor) {
        const btn = document.createElement('button');
        btn.innerHTML = o.lable;
        if(o.value)
            btn.classList.add("btn-enabled");

        btn.addEventListener('click', () => {
            o.value = !o.value;
            if(o.value)
                btn.classList.add("btn-enabled");
            else
                btn.classList.remove("btn-enabled");
            this.updateUniforms();
            processor.draw();
        });
        controls.appendChild(btn);
    }

    getControls(processor) {
        this.toolBtn.disabled = true;
        this.processor = processor;
        this.reset();

        const controls = document.getElementById('controls-tool-specific');
        controls.innerHTML = "";

        this.addSlider(this.offsetX, controls, processor);
        this.addSlider(this.offsetY, controls, processor);
        this.addButton(this.wrapX, controls, processor);
        this.addButton(this.wrapY, controls, processor);
        this.addButton(this.pixelSnap, controls, processor);

        const slider = document.createElement('input');
        slider.id = "rotation-slider";
        slider.type = 'range';
        slider.min = -360;
        slider.max = 360;
        slider.value = 0;
        slider.step = 90;
        controls.appendChild(slider);
        slider.addEventListener('input', (value) => {
            // console.log("rotation sliders value is " + slider.value);
            this.setRotation(slider.value);
            processor.draw();
        });
        slider.addEventListener("dblclick", (event) => {
            // console.log('reseting rotation');
            this.resetRotation();
        });

        const btnFlipX = document.createElement('button');
        btnFlipX.innerHTML = "Flip X";
        btnFlipX.addEventListener('click', () => {
                this.toggleFlipX();
                processor.draw();
        });
        controls.appendChild(btnFlipX);

        const btnFlipY = document.createElement('button');
        btnFlipY.innerHTML = "Flip Y";
        btnFlipY.addEventListener('click', () => {
                this.toggleFlipY();
                processor.draw();
        });
        controls.appendChild(btnFlipY);

        this.canvas = this.gl.canvas;
        console.log(this.canvas);
        this.moveSetup();
        

    }

    close() {
        this.canvas.removeEventListener('mousedown', this.mouseDown);
        this.canvas.removeEventListener("touchstart", this.startTouch, false);
        this.canvas.removeEventListener("touchmove", this.moveTouch, false);
    }

    getProgramInfo() {
        const width = this.gl.canvas.width;
        const height = this.gl.canvas.height;

        return {
            program: this.program,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(this.program, 'aVertexPosition'),
                textureCoord: this.gl.getAttribLocation(this.program, 'aTextureCoord'),
            },
            uniformLocations: {
                uSampler: this.gl.getUniformLocation(this.program, 'uSampler'),
                uRotation: this.gl.getUniformLocation(this.program, 'uRotation'),
                uFlip: this.gl.getUniformLocation(this.program, 'uFlip'),
                uOffset: this.gl.getUniformLocation(this.program, 'uOffset'),
                uWrap: this.gl.getUniformLocation(this.program, 'uWrap'),
                uPixelSnap: this.gl.getUniformLocation(this.program, 'uPixelSnap'),
                uTextureSize: this.gl.getUniformLocation(this.program, 'uTextureSize'),
            },
            uniforms: {
                uTextureSize: [ width,  height ],
            }
        };
    }

    updateUniforms() {
        const programInfo = this.getProgramInfo();
        this.gl.useProgram(programInfo.program);
        
        // Convert rotation to radians
        const rotationRad = (this.rotation * Math.PI) / 180;
        this.gl.uniform1f(programInfo.uniformLocations.uRotation, rotationRad);
        
        this.gl.uniform2f(
            programInfo.uniformLocations.uFlip,
            this.flipX ? 1 : 0,
            this.flipY ? 1 : 0
        );

        this.gl.uniform2f(programInfo.uniformLocations.uOffset, -this.offsetX.value, this.offsetY.value);
        this.gl.uniform2f(programInfo.uniformLocations.uWrap, this.wrapX.value, this.wrapY.value);
        this.gl.uniform1f(programInfo.uniformLocations.uPixelSnap, this.pixelSnap.value);
        // this.gl.uniform2f(programInfo.uniformLocations.uTextureSize, this.processor.canvas.width, this.processor.canvas.height);
    }

    reset() {
        this.rotation = 0;
        this.offsetX.value = this.offsetX.defaultValue;
        this.offsetY.value = this.offsetX.defaultValue;
        this.wrapX.value = this.wrapX.defaultValue;
        this.wrapY.value = this.wrapY.defaultValue;
        this.pixelSnap.value = this.pixelSnap.defaultValue; 
        this.flipX = false;
        this.flipY = false;
        this.updateUniforms();
    }

    // Control methods
    rotate90() {
        this.rotation = (this.rotation + 90) % 360;
        this.updateUniforms();
    }

    resetRotation() {
        document.getElementById('rotation-slider').value = 0;
        this.rotation = 0;
        this.updateUniforms();
    }

    setRotation(value) {
        this.rotation = Math.floor(-value / 360 * 4) / 4 * 360;
        this.updateUniforms();
    }

    toggleFlipX() {
        this.flipX = !this.flipX;
        this.updateUniforms();
    }

    toggleFlipY() {
        this.flipY = !this.flipY;
        this.updateUniforms();
    }

    moveSetup() {
        const canvas = this.canvas;
        const tool = this;
        tool.startX = 0;
        tool.startY = 0;

        const move = function(x, y) {
            const deltaX = tool.startX - x;
            const deltaY = tool.startY - y;

            tool.startX = x;
            tool.startY = y;
    
            let newX = tool.offsetX.value - (deltaX / canvas.width);
            newX = validateOffset(newX, tool.offsetX.min, tool.offsetY.max);
            tool.offsetX.value = newX;
            tool.offsetX.slider.value = newX;
    
            let newY = tool.offsetY.value + (deltaY / canvas.height);
            newY = validateOffset(newY, tool.offsetY.min, tool.offsetY.max);
            tool.offsetY.value = newY;
            tool.offsetY.slider.value = newY;
    
            tool.updateUniforms();
            tool.processor.draw();

        }
        const mouseMove = function(e) {
            move(e.clientX, e.clientY);
        }
        this.mouseMove = mouseMove;

        const mouseDown = function(e) {
            tool.startX = e.clientX;
            tool.startY = e.clientY;
            console.log(tool.startX);
            canvas.addEventListener('mousemove', mouseMove);
        };
        this.mouseDown = mouseDown;
        
        const mouseUp = function(e) {
            canvas.removeEventListener('mousemove', mouseMove);
        };
        this.mouseUp = mouseUp;
        
        document.addEventListener('mouseup', mouseUp);
        canvas.addEventListener('mousedown', mouseDown);

        var moveTouch = function (e) {
            e.preventDefault();
        };
        this.moveTouch = moveTouch;
        var startTouch = function (e) {
            move(e.changedTouches[0].pageX, e.changedTouches[0].pageY);
        };
        this.startTouch = startTouch;
        this.canvas.addEventListener("touchstart", startTouch, false);
        this.canvas.addEventListener("touchmove", moveTouch, false);
    };

    // moveTouchSetup() {
    //     const ctx = this.ctx;
    //     var start = function (e) {
    //         ctx.beginPath();
    //         const x = e.changedTouches[0].pageX - e.touches[0].target.offsetLeft;
    //         const y = e.changedTouches[0].pageY - e.touches[0].target.offsetTop;
    //         ctx.moveTo(x, y);
    //     };
    //     var move = function (e) {
    //         e.preventDefault();
    //         const x = e.changedTouches[0].pageX - e.touches[0].target.offsetLeft;
    //         const y = e.changedTouches[0].pageY - e.touches[0].target.offsetTop;
    //         ctx.lineTo(x, y);
    //         ctx.stroke();
    //     };
    //     this.canvas.addEventListener("touchstart", start, false);
    //     this.canvas.addEventListener("touchmove", move, false);
    // };
}
