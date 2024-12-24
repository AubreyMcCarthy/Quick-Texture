export class PreviewView {
    constructor(originalCanvas) {
        this.originalCanvas = originalCanvas;
        // Create shader programs
        this.vertexShaderSource = `
        attribute vec4 position;
        attribute vec2 texcoord;
        varying vec2 v_texcoord;

        void main() {
            gl_Position = position;
            v_texcoord = texcoord;
        }`;

        this.fragmentShaderSource = `
        precision mediump float;

        uniform sampler2D u_texture;
        uniform vec2 u_resolution;
        uniform vec2 u_tileCount; // How many times to repeat the texture

        varying vec2 v_texcoord;

        void main() {
            // Calculate the tiled texture coordinates
            float aspect = u_resolution.y / u_resolution.x;
            vec2 tiled_texcoord = v_texcoord;
            tiled_texcoord.y *= aspect;
            tiled_texcoord = fract(tiled_texcoord * u_tileCount);
            vec4 c = texture2D(u_texture, tiled_texcoord);
            // c.a = 1.0;
            gl_FragColor = c;
        }`;
        
        // Create background canvas
        const bgCanvas = document.createElement('canvas');
        this.bgCanvas = bgCanvas;
        bgCanvas.style.position = 'fixed';
        bgCanvas.style.top = '0';
        bgCanvas.style.left = '0';
        bgCanvas.style.width = '100%';
        bgCanvas.style.height = '100%';
        bgCanvas.style.zIndex = '-1';
        bgCanvas.classList.add("fadeable");
        bgCanvas.classList.add("fade");
        bgCanvas.addEventListener('click', () => {
            this.toggleFade();
        });
        document.body.appendChild(bgCanvas);

        this.fadeableContainer = document.getElementById('fadeable-container');

        // Initialize WebGL
        const gl = bgCanvas.getContext('webgl');
        this.gl = gl;
        if (!gl) {
            console.error('WebGL not supported');
            return;
        }

        // Create shaders and program
        this.vertexShader = this.createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
        this.fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        const program = this.createProgram(gl, this.vertexShader, this.fragmentShader);
        this.program = program;

        // Set up buffers
        const positions = new Float32Array([
            -1, -1,
            1, -1,
            -1,  1,
            -1,  1,
            1, -1,
            1,  1,
        ]);

        const texcoords = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            0, 1,
            1, 0,
            1, 1,
        ]);

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        this.texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);

        // Create texture from original canvas
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Get attribute and uniform locations
        this.positionLocation = gl.getAttribLocation(program, 'position');
        this.texcoordLocation = gl.getAttribLocation(program, 'texcoord');
        this.resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
        this.textureLocation = gl.getUniformLocation(program, 'u_texture');
        this.tileCountLocation = gl.getUniformLocation(program, 'u_tileCount');

        

        // Handle window resize
        window.addEventListener('resize', () => render());
    }

    createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    }


    render(tileX = 4, tileY = 4) {
        const gl = this.gl;
        const bgCanvas = this.bgCanvas;
        // Update canvas size to match window
        const width = window.innerWidth;
        const height = window.innerHeight;
        bgCanvas.width = width;
        bgCanvas.height = height;
        gl.viewport(0, 0, width, height);

        // Use our program
        gl.useProgram(this.program);

        // Set up attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.enableVertexAttribArray(this.texcoordLocation);
        gl.vertexAttribPointer(this.texcoordLocation, 2, gl.FLOAT, false, 0, 0);

        // Update texture from original canvas
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.originalCanvas);

        // Set uniforms
        gl.uniform2f(this.resolutionLocation, width, height);
        gl.uniform1i(this.textureLocation, 0);
        gl.uniform2f(this.tileCountLocation, tileX, tileY);

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }   

    toggleFade() {
        this.bgCanvas.classList.toggle("fade");
        this.fadeableContainer.classList.toggle("fade");
    } 
}
