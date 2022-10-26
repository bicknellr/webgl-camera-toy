import {loadProgram} from "./WebGLUtilities.js";

const resolve = (relative) => new URL(relative, import.meta.url).toString();

class CameraToy extends HTMLElement {
  #video;
  #canvas;
  #canvasResizeObserver;

  #gl;
  #program;
  #texture;
  #vao;
  #u_streamSize;

  #running;

  constructor() {
    super();

    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: relative;
        }

        canvas {
          position: absolute;
          top: 0px;
          left: 0px;
          width: 100%;
          height: 100%;
        }
      </style>
      <canvas id="mainCanvas"></canvas>
    `;

    this.#video = document.createElement("video");

    this.#canvas = this.shadowRoot.getElementById("mainCanvas");
    this.#running = false;
    this.#canvas.addEventListener("click", () => {
      if (!this.#running) {
        this.#running = true;
        this.#start();
      }
    });

    this.#canvasResizeObserver = new ResizeObserver((entries) => {
      const entry = entries.findLast(entry => entry.target === this.#canvas);
      if (entry) {
        const contentRect = entry.contentRect;
        this.#resizeCanvas(contentRect.width, contentRect.height);
        this.#renderFrame();
      }
    });
    this.#canvasResizeObserver.observe(this.#canvas);
  }

  #resizeCanvas(width, height) {
    this.#canvas.width = width;
    this.#canvas.height = height;
  }

  async #start() {
    // Get camera stream and start video.
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 1280,
        height: 720,
      },
    });
    const {width: streamWidth, height: streamHeight} = stream.getVideoTracks()[0].getSettings();

    this.#video.srcObject = stream;
    await this.#video.play();

    // Setup WebGL.
    const gl = this.#gl = this.#canvas.getContext("webgl2");

    const program = this.#program = await loadProgram({
      gl,
      vertexSourceURL: resolve("./camera-toy.vert.glsl"),
      fragmentSourceURL: resolve("./camera-toy.frag.glsl"),
    });

    this.#u_streamSize = gl.getUniformLocation(program, "u_streamSize");
    const a_position = gl.getAttribLocation(program, "a_position");
    const a_texcoord = gl.getAttribLocation(program, "a_texcoord");

    const points = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, points);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      1, 1,
      1, -1,
      -1, 1,

      -1, -1,
      -1, 1,
      1, -1,
    ]), gl.STATIC_DRAW);

    const texcoords = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoords);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      streamWidth, 0,
      streamWidth, streamHeight,
      0, 0,

      0, streamHeight,
      0, 0,
      streamWidth, streamHeight,
    ]), gl.STATIC_DRAW);

    const texture = this.#texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D,
      0, // level
      gl.RGBA, // internalFormat
      1, 1, // width, height
      0, // border
      gl.RGBA, // format
      gl.UNSIGNED_BYTE, // type
      new Uint8Array([0, 0, 0, 0]), // data
    );

    const vao = this.#vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, points);
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texcoords);
    gl.enableVertexAttribArray(a_texcoord);
    gl.vertexAttribPointer(a_texcoord, 2, gl.FLOAT, false, 0, 0);

    // Loop.
    const frame = () => {
      this.#renderFrame();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  #renderFrame() {
    const gl = this.#gl;
    if (!gl) {
      return;
    }

    gl.viewport(0, 0, this.#canvas.width, this.#canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.#program);

    gl.bindTexture(gl.TEXTURE_2D, this.#texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.#video);

    // These behaviors must be specified since the camera isn't going to be a
    // square with some power-of-two size. Otherwise WebGL shows a warning about
    // the texture being unrenderable.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)

    gl.uniform2f(this.#u_streamSize, this.#video.videoWidth, this.#video.videoHeight);
    gl.bindVertexArray(this.#vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

customElements.define("camera-toy", CameraToy);
