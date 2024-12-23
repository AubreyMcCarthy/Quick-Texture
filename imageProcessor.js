
export class ImageProcessor {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
        if (!this.gl) {
            throw new Error("WebGL not available");
        }
        
        this.initBuffers();
        this.texture = this.gl.createTexture();
        this.currentTool = null;
        this.controls = document.getElementById('controls-tools');
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

    loadImage(image) {
        const gl = this.gl;
        this.canvas.width = image.width;
        this.canvas.height = image.height;
        gl.viewport(0, 0, image.width, image.height);

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        
        this.draw();
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

    draw() {
        if (!this.currentTool) return;

        const gl = this.gl;
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const programInfo = this.currentTool.getProgramInfo();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.textureCoord);
        gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

        gl.useProgram(programInfo.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}
