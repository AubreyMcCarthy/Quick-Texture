export class ShaderUtils {
    static createShaderProgram(gl, vsSource, fsSource) {
        const vertexShader = ShaderUtils.loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = ShaderUtils.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            throw new Error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        }

        return shaderProgram;
    }

    static loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            throw new Error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        }

        return shader;
    }
}
