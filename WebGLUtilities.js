export const loadProgram = async ({gl, vertexSourceURL, fragmentSourceURL}) => {
  const vertexShader = await loadShader(gl, gl.VERTEX_SHADER, vertexSourceURL);
  const fragmentShader = await loadShader(gl, gl.FRAGMENT_SHADER, fragmentSourceURL);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }

  return program;
};

const loadShader = async (gl, type, sourceURL) => {
  const resp = await fetch(sourceURL);
  const source = await resp.text();

  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }

  return shader;
};
