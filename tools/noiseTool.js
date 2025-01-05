import { ShaderUtils } from '../shaderUtils.js';

export class NoiseTool {
    constructor() {
        this.enableTiling = true;
        this.tiling = 1.0;
        this.seed = 0.0;
        this.blendStrength = 1.0;

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
        uniform float uTiling;
        uniform bool uEnableTiling;
        uniform float uSeed;
        uniform float uBlendStrength;

        float rnd(vec3 pos){
            return fract(sin(dot(pos, vec3(64.25375463, 23.27536534, 86.29678483))) * 59482.7542);
        }
        float random(vec2 st) {
            return rnd(vec3(st, uSeed));
        }

        // 2D tileable noise
        float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            
            // Four corners in 2D of a tile
            float a = random(uEnableTiling ? mod(i, uTiling) : i);
            float b = random(uEnableTiling ? mod(i + vec2(1.0, 0.0), uTiling) : (i + vec2(1.0, 0.0)));
            float c = random(uEnableTiling ? mod(i + vec2(0.0, 1.0), uTiling) : (i + vec2(0.0, 1.0)));
            float d = random(uEnableTiling ? mod(i + vec2(1.0, 1.0), uTiling) : (i + vec2(1.0, 1.0)));
            
            // Smooth interpolation
            vec2 u = f * f * (3.0 - 2.0 * f);
            
            return mix(a, b, u.x) +
                    (c - a)* u.y * (1.0 - u.x) +
                    (d - b) * u.x * u.y;
        }

        void main() {
            vec2 st = vTextureCoord * uTiling;
            
            // Generate noise
            float n = noise(st);

            vec4 color = texture2D(uSampler, vTextureCoord);
            color = mix(color, vec4(n,n,n, 1.0), uBlendStrength);
            
            // Output final color
            // gl_FragColor = vec4(vec3(n), 1.0);
            gl_FragColor = color;
        }
        `;
    }

    init(gl, processor) {
        this.gl = gl;
        this.program = ShaderUtils.createShaderProgram(gl, this.vsSource, this.fsSource);
        this.updateUniforms();

        const controls = document.getElementById('controls-toolbar');

        this.toolBtn = document.createElement('button');
        this.toolBtn.innerHTML = "Noise";
        this.toolBtn.addEventListener('click', () => { 
            processor.setTool(this);
        });
    
        controls.appendChild(this.toolBtn);

        return {
            name: 'Noise',
            aliases: ['Gaussian Noise', 'Perlin Noise', 'Simplex Noise'],
            description: 'Generate noise pattern',
            action: () => processor.setTool(this)
        }
    }

    getControls(processor) {
        this.toolBtn.disabled = true;
        this.reset();

        const controls = document.getElementById('controls-tool-specific');
        controls.innerHTML = "";

        // Tiling control
        const tilingSlider = document.createElement('input');
        tilingSlider.type = 'range';
        tilingSlider.min = 2;
        tilingSlider.max = 64;
        tilingSlider.step = 1;
        tilingSlider.value = this.tiling;
        
        const tilingLabel = document.createElement('label');
        tilingLabel.textContent = 'Tiling: ';
        
        tilingSlider.addEventListener('input', () => {
            this.tiling = parseFloat(tilingSlider.value);
            this.updateUniforms();
            processor.draw();
        });
        
        const tillingToggle = document.createElement('button');
        tillingToggle.innerHTML = "Disable Tilling"
        tillingToggle.addEventListener('click', () => { 
            this.enableTiling = !this.enableTiling;
            this.updateUniforms();
            tillingToggle.innerHTML = !this.enableTiling ? "Enable Tilling" : "Disable Tilling";
            processor.draw();
        });

        const randomSeed = document.createElement('button');
        randomSeed.innerHTML = "Randomize";
        randomSeed.addEventListener("click", () => {
            this.seed = Math.random() * 100;
            this.updateUniforms();
            processor.draw();
        });

        const blendSlider = document.createElement('input');
        blendSlider.type = 'range';
        blendSlider.min = 0.0;
        blendSlider.max = 1.0;
        blendSlider.step = 0.01;
        blendSlider.value = this.blendStrength;
        
        const blendLabel = document.createElement('label');
        blendLabel.textContent = 'Blend: ';
        
        blendSlider.addEventListener('input', () => {
            this.blendStrength = parseFloat(blendSlider.value);
            this.updateUniforms();
            processor.draw();
        });

        // Add controls to container
        controls.appendChild(tilingLabel);
        controls.appendChild(tilingSlider);
        controls.appendChild(document.createElement('br'));
        controls.appendChild(tillingToggle);
        controls.appendChild(randomSeed);
        controls.appendChild(blendLabel);
        controls.appendChild(blendSlider);
    }

    getProgramInfo() {
        return {
            program: this.program,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(this.program, 'aVertexPosition'),
                textureCoord: this.gl.getAttribLocation(this.program, 'aTextureCoord'),
            },
            uniformLocations: {
                uTiling: this.gl.getUniformLocation(this.program, 'uTiling'),
                uEnableTiling: this.gl.getUniformLocation(this.program, 'uEnableTiling'),
                uSeed: this.gl.getUniformLocation(this.program, 'uSeed'),
                uBlendStrength: this.gl.getUniformLocation(this.program, 'uBlendStrength'),
            }
        };
    }

    updateUniforms() {
        const programInfo = this.getProgramInfo();
        this.gl.useProgram(programInfo.program);
        
        // Update uniforms
        this.gl.uniform1f(programInfo.uniformLocations.uTiling, this.tiling);
        this.gl.uniform1i(programInfo.uniformLocations.uEnableTiling, this.enableTiling);
        this.gl.uniform1f(programInfo.uniformLocations.uSeed, this.seed);
        this.gl.uniform1f(programInfo.uniformLocations.uBlendStrength, this.blendStrength);
    }

    reset() {
        this.tiling = 5.0;
        this.enableTiling = true;
        this.seed = 0.0;
        this.blendStrength = 1.0;
        this.updateUniforms();
    }
}