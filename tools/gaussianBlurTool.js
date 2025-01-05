import { ShaderUtils } from '../shaderUtils.js';

export class GaussianBlurTool {
    constructor() {
        this.sigma = 4.0;  // Blur strength
        this.kernelSize = 15;  // Must be odd number
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
            
            void main(void) {
                gl_Position = aVertexPosition;
                vTextureCoord = aTextureCoord;
            }
        `;

        this.fsSourceH = `
            precision highp float;
            varying highp vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform float uKernel[${this.kernelSize}];
            uniform float uPixelSize;  // 1/width for horizontal pass
            uniform vec2 uWrap;
            
            void main(void) {
                vec4 sum = vec4(0.0);
                float offset = floor(float(${this.kernelSize}/2));
                
                for (int i = 0; i < ${this.kernelSize}; i++) {
                    float off = float(i) - offset;
                    vec2 samplePos = vec2(vTextureCoord.x + off * uPixelSize, vTextureCoord.y);
                    samplePos = uWrap * fract(samplePos) + (vec2(1,1)-uWrap) * clamp(samplePos, 0.0, 1.0);
                    sum += texture2D(uSampler, samplePos) * uKernel[i];
                }
                
                gl_FragColor = sum;
            }
        `;

        // Vertical blur shader
        this.fsSourceV = `
            precision highp float;
            varying highp vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform float uKernel[${this.kernelSize}];
            uniform float uPixelSize;  // 1/height for vertical pass
            uniform vec2 uWrap;
            
            void main(void) {
                vec4 sum = vec4(0.0);
                float offset = floor(float(${this.kernelSize}/2));
                
                for (int i = 0; i < ${this.kernelSize}; i++) {
                    float off = float(i) - offset;
                    vec2 samplePos = vec2(vTextureCoord.x, vTextureCoord.y + off * uPixelSize);
                    samplePos = uWrap * fract(samplePos) + (vec2(1,1)-uWrap) * clamp(samplePos, 0.0, 1.0);
                    sum += texture2D(uSampler, samplePos) * uKernel[i];
                }
                
                gl_FragColor = sum;
            }
        `;

        this.fsSourceF = `
            precision highp float;
            varying highp vec2 vTextureCoord;
            uniform sampler2D uSampler;
            
            void main(void) {
                vec2 uv = vTextureCoord;
                gl_FragColor = texture2D(uSampler, uv);
            }
        `;
    }

    init(gl, processor) {
        this.gl = gl;
        
        this.programH = ShaderUtils.createShaderProgram(this.gl, this.vsSource, this.fsSourceH);
        this.programV = ShaderUtils.createShaderProgram(gl, this.vsSource, this.fsSourceV);
        this.programF = ShaderUtils.createShaderProgram(gl, this.vsSource, this.fsSourceF);
        this.updateKernel();

        const controls = document.getElementById('controls-toolbar');

        this.toolBtn = document.createElement('button');
        this.toolBtn.innerHTML = "Blur";
        this.toolBtn.addEventListener('click', () => { 
            processor.setTool(this);
        });
    
        controls.appendChild(this.toolBtn);

        return {
            name: 'Blur',
            aliases: ['Gaussian Blur', 'Soften'],
            description: 'Blur the image',
            action: () => processor.setTool(this)
        }
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
            processor.draw();
        });
        controls.appendChild(btn);
    }

    getControls(processor) {
        this.toolBtn.disabled = true;

        const controls = document.getElementById('controls-tool-specific');
        controls.innerHTML = "";

        const slider = document.createElement('input');
        slider.id = "blur-slider";
        slider.type = 'range';
        slider.min = 0;
        slider.max = 40;
        slider.value = this.sigma;
        slider.step = 0.01;
        controls.appendChild(slider);
        slider.addEventListener('input', (value) => {
                this.sigma = slider.value;
                this.updateKernel();
                processor.draw();
        });
        slider.addEventListener("dblclick", (event) => {
            console.log('reseting blur');
            this.sigma = 4.0;
            slider.value = this.sigma;
        });

        this.addButton(this.wrapX, controls, processor);
        this.addButton(this.wrapY, controls, processor);

    }

    updateKernel() {
        // Generate 1D Gaussian kernel
        const kernel = new Float32Array(this.kernelSize);
        const sigma2 = this.sigma * this.sigma;
        const scale = 1 / (Math.sqrt(2 * Math.PI) * this.sigma);
        let sum = 0;

        for (let i = 0; i < this.kernelSize; i++) {
            const x = i - (this.kernelSize - 1) / 2;
            kernel[i] = scale * Math.exp(-(x * x) / (2 * sigma2));
            sum += kernel[i];
        }

        // Normalize
        for (let i = 0; i < this.kernelSize; i++) {
            kernel[i] /= sum;
        }

        this.kernel = kernel;
    }

    renderPasses() {
        const width = this.gl.canvas.width;
        const height = this.gl.canvas.height;
        
        if(this.sigma == 0) {
            return [
                {
                    program: this.programF,
                    attribLocations: {
                        vertexPosition: this.gl.getAttribLocation(this.programF, 'aVertexPosition'),
                        textureCoord: this.gl.getAttribLocation(this.programF, 'aTextureCoord'),
                    },
                    uniformLocations: {
                        uSampler: this.gl.getUniformLocation(this.programF, 'uSampler'),
                    }
                }
            ];
        }
        else {
            return [
                // Horizontal pass
                {
                    program: this.programH,
                    attribLocations: {
                        vertexPosition: this.gl.getAttribLocation(this.programH, 'aVertexPosition'),
                        textureCoord: this.gl.getAttribLocation(this.programH, 'aTextureCoord'),
                    },
                    uniformLocations: {
                        uSampler: this.gl.getUniformLocation(this.programH, 'uSampler'),
                        uKernel: this.gl.getUniformLocation(this.programH, 'uKernel'),
                        uPixelSize: this.gl.getUniformLocation(this.programH, 'uPixelSize'),
                        uWrap: this.gl.getUniformLocation(this.programH, 'uWrap'),
                    },
                    uniforms: {
                        uKernel: this.kernel,
                        uPixelSize: 1.0 / width,
                        uWrap: [ this.wrapX.value, this.wrapY.value ],
                    }
                },
                // Vertical pass
                {
                    program: this.programV,
                    attribLocations: {
                        vertexPosition: this.gl.getAttribLocation(this.programV, 'aVertexPosition'),
                        textureCoord: this.gl.getAttribLocation(this.programV, 'aTextureCoord'),
                    },
                    uniformLocations: {
                        uSampler: this.gl.getUniformLocation(this.programV, 'uSampler'),
                        uKernel: this.gl.getUniformLocation(this.programV, 'uKernel'),
                        uPixelSize: this.gl.getUniformLocation(this.programV, 'uPixelSize'),
                        uWrap: this.gl.getUniformLocation(this.programV, 'uWrap'),
                    },
                    uniforms: {
                        uKernel: this.kernel,
                        uPixelSize: 1.0 / height,
                        uWrap: [ this.wrapX.value, this.wrapY.value ],
                    }
                },
                {
                    program: this.programF,
                    attribLocations: {
                        vertexPosition: this.gl.getAttribLocation(this.programF, 'aVertexPosition'),
                        textureCoord: this.gl.getAttribLocation(this.programF, 'aTextureCoord'),
                    },
                    uniformLocations: {
                        uSampler: this.gl.getUniformLocation(this.programF, 'uSampler'),
                    }
                }
            ];
        }
    }

    getProgramInfo() {
        return { // I don't think this is needed
            program: this.programF,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(this.programF, 'aVertexPosition'),
                textureCoord: this.gl.getAttribLocation(this.programF, 'aTextureCoord'),
            },
            uniformLocations: {
                uSampler: this.gl.getUniformLocation(this.programF, 'uSampler'),
            }
        };
    }

    setBlurStrength(sigma) {
        this.sigma = sigma;
        this.updateKernel();
    }
}