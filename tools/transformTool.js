import { ShaderUtils } from '../shaderUtils.js';

export class TransformTool {
    constructor() {
        this.rotation = 0; // 0, 90, 180, 270
        this.flipX = false;
        this.flipY = false;

        this.vsSource = `
            attribute vec4 aVertexPosition;
            attribute vec2 aTextureCoord;
            varying highp vec2 vTextureCoord;
            
            uniform float uRotation; // in radians
            uniform vec2 uFlip; // x and y flip
            
            void main(void) {
                gl_Position = aVertexPosition;
                
                // Start with original texture coordinates
                vec2 texCoord = aTextureCoord;
                
                // Apply flipping
                // texCoord = uFlip > 0 ? vec2(1.0, 1.0) - texCoord : texCoord;
                texCoord = uFlip * (1.0 - texCoord) + (1.0 - uFlip) * texCoord;
                
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
            uniform sampler2D uSampler;
            
            void main(void) {
                // Check if texture coordinates are within bounds
                // if (vTextureCoord.x < 0.0 || vTextureCoord.x > 1.0 ||
                    // vTextureCoord.y < 0.0 || vTextureCoord.y > 1.0) {
                    // gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                // } else {
                    gl_FragColor = texture2D(uSampler, vTextureCoord);
                // }
            }
        `;
    }

    init(gl, processor) {
        this.gl = gl;
        this.program = ShaderUtils.createShaderProgram(gl, this.vsSource, this.fsSource);
        this.updateUniforms();

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
                this.setRotation(slider.value);
                processor.draw();
        });
        slider.addEventListener("dblclick", (event) => {
            console.log('reseting rotation');
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
    }

    reset() {
        this.rotation = 0;
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
}
