import { PreviewView } from './previewView.js';

export class ImageProcessor {
    constructor(canvas, bg) {
        this.canvas = canvas;
        this.bg = bg;
        this.gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
        if (!this.gl) {
            throw new Error("WebGL not available");
        }
        
        this.initBuffers();
        this.texture = this.gl.createTexture();
        this.currentTool = null;
        this.controls = document.getElementById('controls-toolbar');

        this.previewView = new PreviewView(canvas);
        this.createFramebuffers(canvas.width, canvas.height); 
    }

    initBuffers() {
        const gl = this.gl;
        
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = [
            -1.0,  1.0,
             1.0,  1.0,
            -1.0, -1.0,
             1.0, -1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        const textureCoordinates = [
            0.0,  0.0,
            1.0,  0.0,
            0.0,  1.0,
            1.0,  1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

        this.buffers = {
            position: positionBuffer,
            textureCoord: textureCoordBuffer,
        };
    }

    

    setTool(tool) {
        const buttons = this.controls.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = false;
        });
        this.currentTool = tool;
        tool.getControls(this);
        this.draw();
    }
    
    initTool(tool) {
        tool.init(this.gl, this);
    }

    createFramebuffers(width, height) {
        const gl = this.gl;

        // Create two framebuffers and textures for ping-pong rendering
        this.framebuffers = [0, 1].map(() => {
            const fbo = gl.createFramebuffer();
            const tex = gl.createTexture();

            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

            return { fbo, tex };
        });
    }

    resizeFramebuffers(width, height) {
        // Delete old framebuffers and textures
        this.framebuffers.forEach(({fbo, tex}) => {
            this.gl.deleteFramebuffer(fbo);
            this.gl.deleteTexture(tex);
        });
        
        // Create new ones at the right size
        this.createFramebuffers(width, height);
    }

    loadImage(image) {
        const gl = this.gl;
        this.canvas.width = image.width;
        this.canvas.height = image.height;
        gl.viewport(0, 0, image.width, image.height);

        // Resize framebuffers to match new image size
        this.resizeFramebuffers(image.width, image.height);

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        
        this.draw();
    }

    draw() {
        if (!this.currentTool) return;

        const gl = this.gl;
        const tool = this.currentTool;
        
        // Check if tool supports multi-pass rendering
        if (tool.renderPasses) {
            let inputTexture = this.texture;
            let passes = tool.renderPasses();

            // Execute each pass
            passes.forEach((pass, index) => {
                const isLastPass = index === passes.length - 1;
                const outputTarget = isLastPass ? null : this.framebuffers[index % 2].fbo;
                
                gl.bindFramebuffer(gl.FRAMEBUFFER, outputTarget);
                
                if (isLastPass) {
                    // Final pass renders to canvas
                    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
                }

                this.renderPass(pass, inputTexture);
                
                // Use the output as input for next pass
                if (!isLastPass) {
                    inputTexture = this.framebuffers[index % 2].tex;
                }
            });
        } else {
            // Single pass rendering (original behavior)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            this.renderPass(tool.getProgramInfo(), this.texture);
        }

        this.previewView.render(4,4);
    }

    renderPass(programInfo, inputTexture) {
        const gl = this.gl;
        
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.textureCoord);
        gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

        gl.useProgram(programInfo.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, inputTexture);
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

        // Set any additional uniforms provided by the pass
        if (programInfo.uniforms) {
            for (const [name, value] of Object.entries(programInfo.uniforms)) {
                if (programInfo.uniformLocations[name]) {
                    if (Array.isArray(value)) {
                        const setter = `uniform${value.length}fv`;
                        gl[setter](programInfo.uniformLocations[name], value);
                    } else {
                        gl.uniform1f(programInfo.uniformLocations[name], value);
                    }
                }
            }
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}
