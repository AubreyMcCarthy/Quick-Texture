import { ShaderUtils } from '../shaderUtils.js';

// TODO: whole pixel snapping
// TODO: filtering options

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

        this.vsSource = `
            attribute vec4 aVertexPosition;
            attribute vec2 aTextureCoord;
            varying highp vec2 vTextureCoord;
            
            uniform vec2 uTextureSize;
            uniform float uRotation; // in radians
            uniform vec2 uFlip; // x and y flip
            uniform vec2 uOffset; // x and y offset
            
            void main(void) {
                gl_Position = aVertexPosition;
                
                // Start with original texture coordinates
                vec2 texCoord = aTextureCoord;

                texCoord = texCoord + uOffset;
                
                // Apply flipping
                // texCoord = uFlip > 0 ? vec2(1.0, 1.0) - texCoord : texCoord;
                texCoord = uFlip * (1.0 - texCoord) + (1.0 - uFlip) * texCoord;

                // clamp to pixel grid
                // texCoord = floor(texCoord * uTextureSize) / uTextureSize;
                
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
        this.reset();

        const controls = document.getElementById('controls-tool-specific');
        controls.innerHTML = "";

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

        this.addSlider(this.offsetX, controls, processor);
        this.addSlider(this.offsetY, controls, processor);
        this.addButton(this.wrapX, controls, processor);
        this.addButton(this.wrapY, controls, processor);

    }

    getProgramInfo() {
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
                uTextureSize: this.gl.getUniformLocation(this.program, 'uTextureSize'),
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
        // this.gl.uniform2f(programInfo.uniformLocations.uTextureSize, this.processor.canvas.width, this.processor.canvas.height);
    }

    reset() {
        this.rotation = 0;
        // this.offsetX.reset();
        // this.offsetY.reset();
        // this.wrapX.reset();
        // this.wrapY.reset();
        // this.updateUniforms();
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
}
