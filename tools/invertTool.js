
import { ShaderUtils } from '../shaderUtils.js';

export class InvertTool {
    constructor() {
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
            void main(void) {
                vec4 color = texture2D(uSampler, vTextureCoord);
                gl_FragColor = vec4(1.0 - color.rgb, color.a);
            }
        `;
    }

    init(gl, processor) {
        this.gl = gl;
        this.program = ShaderUtils.createShaderProgram(gl, this.vsSource, this.fsSource);

        const controls = document.getElementById('controls-tools');
    
    
        this.toolBtn = document.createElement('button');
        this.toolBtn.innerHTML = "Invert";
        this.toolBtn.addEventListener('click', () => { 
            processor.setTool(this);
        });
    
        controls.appendChild(this.toolBtn);
    }

    getControls(processor) {
        this.toolBtn.disabled = true;
        const controls = document.getElementById('controls-tool-controls');
        controls.innerHTML = "";

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
            }
        };
    }
}
