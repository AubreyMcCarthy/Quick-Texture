import { ShaderUtils } from '../shaderUtils.js';

export class LevelsTool {
    constructor() {
        this.black =        0.0;
        this.grey =         0.5;
        this.white =        1.0;
        this.blackOutput =  0.0;
        this.whiteOutput =  1.0;
        this.toolsCreated = false;

        this.vsSource = `
            attribute vec4 aVertexPosition;
            attribute vec2 aTextureCoord;
            varying highp vec2 vTextureCoord;
            void main(void) {
                gl_Position = aVertexPosition;
                vTextureCoord = aTextureCoord;
            }
        `;

        this.fsSource = `
            precision highp float;
            varying highp vec2 vTextureCoord;
            uniform sampler2D uSampler;

            // Levels controls
            uniform vec3 inputLevels;  // (black point, mid point, white point) in range [0,1]
            uniform vec2 outputLevels; // (black output, white output) in range [0,1]

            float adjustLevels(float value) {
                // Normalize the input value based on input black and white points
                float normalized = (value - inputLevels.x) / (inputLevels.z - inputLevels.x);
                
                // Apply gamma correction using the mid point
                float gamma = log(0.5) / log(inputLevels.y);
                float adjusted = pow(max(0.0, normalized), gamma);
                
                // Remap to output levels
                return mix(outputLevels.x, outputLevels.y, adjusted);
            }

            void main() {
                vec4 color = texture2D(uSampler, vTextureCoord);
                
                // Apply levels adjustment to RGB channels
                vec3 adjusted = vec3(
                    adjustLevels(color.r),
                    adjustLevels(color.g),
                    adjustLevels(color.b)
                );
                
                gl_FragColor = vec4(adjusted, color.a);
            }
        `;
    }

    init(gl, processor) {
        this.gl = gl;
        this.program = ShaderUtils.createShaderProgram(gl, this.vsSource, this.fsSource);
        this.updateUniforms();

        const controls = document.getElementById('controls-tools');

        this.toolBtn = document.createElement('button');
        this.toolBtn.innerHTML = "Levels";
        this.toolBtn.addEventListener('click', () => { 
            processor.setTool(this);
        });
    
        controls.appendChild(this.toolBtn);
    }

    getControls(processor) {
        this.toolBtn.disabled = true;
        this.reset();

        const controls = document.getElementById('controls-tool-controls');
        controls.innerHTML = "";

        const blackSlider = document.createElement('input');
        blackSlider.id = "black-slider";
        blackSlider.type = 'range';
        blackSlider.min = 0.0;
        blackSlider.max = 1.0;
        blackSlider.step = 0.01;
        blackSlider.value = 0.0;
        controls.appendChild(blackSlider);
        blackSlider.addEventListener('input', (value) => {
            this.black = blackSlider.value;
            this.updateUniforms();
            processor.draw();
        });
        blackSlider.addEventListener("dblclick", (event) => {
            blackSlider.value = 0.0;
            this.black = 0.0;
            this.updateUniforms();
            processor.draw();
        });

        const greySlider = document.createElement('input');
        greySlider.id = "grey-slider";
        greySlider.type = 'range';
        greySlider.min = 0.0;
        greySlider.max = 1.0;
        greySlider.step = 0.01;
        greySlider.value = this.grey;
        controls.appendChild(greySlider);
        greySlider.addEventListener('input', (value) => {
            this.grey = greySlider.value;
            this.updateUniforms();
            processor.draw();
        });
        greySlider.addEventListener("dblclick", (event) => {
            greySlider.value = 0.5;
            this.grey = 0.5;
            this.updateUniforms();
            processor.draw();
        });

        const whiteSlider = document.createElement('input');
        whiteSlider.id = "white-slider";
        whiteSlider.type = 'range';
        whiteSlider.min = 0.0;
        whiteSlider.max = 1.0;
        whiteSlider.step = 0.01;
        whiteSlider.value = 1.0;
        controls.appendChild(whiteSlider);
        whiteSlider.addEventListener('input', (value) => {
            this.white = whiteSlider.value;
            this.updateUniforms();
            processor.draw();
        });
        whiteSlider.addEventListener("dblclick", (event) => {
            whiteSlider.value = 1.0;
            this.white = 1.0;
            this.updateUniforms();
            processor.draw();
        });

        const blackOutputSlider = document.createElement('input');
        blackOutputSlider.id = "black-output-slider";
        blackOutputSlider.type = 'range';
        blackOutputSlider.min = 0.0;
        blackOutputSlider.max = 1.0;
        blackOutputSlider.step = 0.01;
        blackOutputSlider.value = 0.0;
        controls.appendChild(blackOutputSlider);
        blackOutputSlider.addEventListener('input', (value) => {
            this.blackOutput = blackOutputSlider.value;
            this.updateUniforms();
            processor.draw();
        });
        blackOutputSlider.addEventListener("dblclick", (event) => {
            blackOutputSlider.value = 0.0;
            this.blackOutput = 0.0;
            this.updateUniforms();
            processor.draw();
        });

        const whiteOutputSlider = document.createElement('input');
        whiteOutputSlider.id = "white-output-slider";
        whiteOutputSlider.type = 'range';
        whiteOutputSlider.min = 0.0;
        whiteOutputSlider.max = 1.0;
        whiteOutputSlider.step = 0.01;
        whiteOutputSlider.value = 1.0;
        controls.appendChild(whiteOutputSlider);
        whiteOutputSlider.addEventListener('input', (value) => {
            this.whiteOutput = whiteOutputSlider.value;
            this.updateUniforms();
            processor.draw();
        });
        whiteOutputSlider.addEventListener("dblclick", (event) => {
            whiteOutputSlider.value = 1.0;
            this.whiteOutput = 1.0;
            this.updateUniforms();
            processor.draw();
        });

        this.resetBtn = document.createElement('button');
        this.resetBtn.innerHTML = "❌";
        this.resetBtn.addEventListener('click', () => { 
            this.reset();
            processor.draw();
        });
    
        controls.appendChild(this.resetBtn);
        this.toolsCreated = true;
    }

    getProgramInfo() {
        return {
            program: this.program,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(this.program, 'aVertexPosition'),
                textureCoord: this.gl.getAttribLocation(this.program, 'aTextureCoord'),
            },
            uniformLocations: {
                inputLevels: this.gl.getUniformLocation(this.program, 'inputLevels'),
                outputLevels: this.gl.getUniformLocation(this.program, 'outputLevels'),
            }
        };
    }

    updateUniforms() {
        const programInfo = this.getProgramInfo();
        this.gl.useProgram(programInfo.program);
        
        this.gl.uniform3f(programInfo.uniformLocations.inputLevels, this.black, this.grey, this.white); 
        this.gl.uniform2f(programInfo.uniformLocations.outputLevels, this.blackOutput, this.whiteOutput); 
    }

    reset() {
        this.black =        0.0;
        this.grey =         0.5;
        this.white =        1.0;
        this.blackOutput =  0.0;
        this.whiteOutput =  1.0;
        this.updateUniforms();
        
    }

    // Control methods
    rotate90() {
        this.rotation = (this.rotation + 90) % 360;
        this.updateUniforms();
    }

    
}
