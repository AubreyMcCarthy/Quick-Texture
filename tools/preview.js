
import { ShaderUtils } from '../shaderUtils.js';

export class PreviewTool {
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
                gl_FragColor = texture2D(uSampler, vTextureCoord);
            }
        `;
    }

    init(gl, processor) {
        this.gl = gl;
        this.program = ShaderUtils.createShaderProgram(gl, this.vsSource, this.fsSource);

        const controls = document.getElementById('controls-toolbar');
    
        this.toolBtn = document.createElement('button');
        this.toolBtn.innerHTML = "❌";
        this.toolBtn.id = 'preview-btn';
        this.toolBtn.addEventListener('click', () => { 
            processor.setTool(this);
        });
    
        controls.appendChild(this.toolBtn);
        
        return {
            name: 'Preview',
            aliases: ['Preview', 'None'],
            description: 'Just see the image',
            action: () => processor.setTool(this)
        }
    }

    getControls(processor) {
        this.toolBtn.disabled = true;
        const controls = document.getElementById('controls-tool-specific');
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
