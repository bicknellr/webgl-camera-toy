import {loadProgram} from "./WebGLUtilities.js";

const resolve = (relative) => new URL(relative, import.meta.url).toString();

class CameraToy extends HTMLElement {
  #video;
  #canvas;
  #canvasResizeObserver;

  #gl;
  #program;
  #vao;

  constructor() {
    super();

    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: grid;
          place-items: center;
        }

        canvas {
          width: 100%;
          height: 100%;
        }
      </style>
      <canvas id="mainCanvas"></canvas>
    `;

    this.#video = document.createElement("video");

    this.#canvas = this.shadowRoot.getElementById("mainCanvas");
    this.#canvas.addEventListener("click", () => { this.#start(); });

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

    this.#video.srcObject = stream;
    this.#video.play();

    // Setup WebGL.
    const gl = this.#gl = this.#canvas.getContext("webgl2");

    const program = this.#program = await loadProgram({
      gl,
      vertexSourceURL: resolve("./camera-toy.vert.glsl"),
      fragmentSourceURL: resolve("./camera-toy.frag.glsl"),
    });
    const a_position = gl.getAttribLocation(program, "a_position");

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

    const vao = this.#vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

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
    gl.bindVertexArray(this.#vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

customElements.define("camera-toy", CameraToy);
