import {loadProgram} from "./WebGLUtilities.js";

const resolve = (relative) => new URL(relative, import.meta.url).toString();

class CameraToy extends HTMLElement {
  #errorPane;
  #video;
  #canvas;
  #canvasResizeObserver;
  #settings;

  #gl;
  #program;
  #texture;
  #vao;

  #u_time;
  #u_streamSize;
  #u_flipX;
  #u_xWaveAmp;
  #u_xWaveFreq;
  #u_xWaveOscAmp;
  #u_xWaveOscFreq;

  #running;

  constructor() {
    super();

    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: relative;
          font-family: sans-serif;
        }

        #mainCanvas {
          position: absolute;
          top: 0px;
          left: 0px;
          width: 100%;
          height: 100%;
        }

        #settingsPane {
          position: absolute;
          overflow: auto;
          box-sizing: border-box;
          top: 1em;
          left: 1em;
          max-width: calc(100vw - 2em);
          max-height: calc(100vh - 2em);

          padding: 0.5em;
          border: 2px solid #808080;
          border-radius: 0.5em;
          background-color: #222222;

          user-select: none;

          opacity: 0.25;
          transition: opacity 0.1s;
        }
        #settingsPane:hover {
          opacity: 1;
        }

        #settingsPane summary:hover {
          cursor: pointer;
          color: cyan;
        }

        #settingsGrid {
          display: grid;
          grid: 1fr / auto 1fr;
          gap: 0.5em;
        }

        #startButton {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        #errorPane {
          overflow: auto;

          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);

          max-width: 80vw;
          max-height: 80vh;

          border: 2px solid #800000;
          border-radius: 0.5em;
          padding: 0.5em;

          background-color: #200000;
          font-family: monospace;
          white-space: pre;
        }
      </style>
      <canvas id="mainCanvas"></canvas>
      <details id="settingsPane">
        <summary>Settings</summary>
        <hr>
        <div id="settingsGrid">
          <div>Flip X</div>
          <input type="checkbox" setting-name="flipX" checked>
          <div>Wave Amplitude</div>
          <input type="range" setting-name="xWaveAmp" min="0" max="20" value="0">
          <div>Wave Frequency</div>
          <input type="range" setting-name="xWaveFreq" min="0" max="100" value="10">
          <div>Wave Oscillation Amplitude</div>
          <input type="range" setting-name="xWaveOscAmp" min="0" max="1" value="0" step="0.001">
          <div>Wave Oscillation Frequency</div>
          <input type="range" setting-name="xWaveOscFreq" min="0" max="5" value="1" step="0.001">
        </div>
      </details>
      <button id="startButton">Click to start.</button>
      <div id="errorPane" hidden><b>Reload and try again.</b><hr></div>
    `;

    this.#errorPane = this.shadowRoot.getElementById("errorPane");
    const showError = (message) => {
      this.#errorPane.hidden = false;
      this.#errorPane.append(new Text(message));
    };
    window.addEventListener("error", (e) => {
      const {lineno, colno, message, filename, error} = e;
      showError(
        `Error at ${filename}:${lineno}:${colno}` +
        `\n\n${message}` +
        `\n\n${error.stack}`
      );
    });
    window.addEventListener("unhandledrejection", (e) => {
      const {reason} = e;
      showError(
        `Promise rejection at ${reason.sourceURL}:${reason.line}:${reason.column}` +
        `\n\n${reason.message}` +
        `\n\n${reason.stack}`
      );
    });

    this.#video = document.createElement("video");

    this.#canvas = this.shadowRoot.getElementById("mainCanvas");
    this.#running = false;

    const startButton = this.shadowRoot.getElementById("startButton");
    startButton.addEventListener("click", () => {
      if (!this.#running) {
        this.#running = true;
        this.#start();
        startButton.remove();
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

    this.#settings = new Map(
      Array.from(this.shadowRoot.querySelectorAll("[setting-name]")).map(element => {
        return [element.getAttribute("setting-name"), element];
      })
    );
    this.#restoreSettings(location.search);
  }

  #settingsSaveThrottleDuration = 100;
  #settingsSaveLastTime = 0;
  #settingsSaveTimeoutToken = undefined;
  #saveSettings() {
    const lastSave = performance.now() - this.#settingsSaveLastTime;
    if (lastSave < this.#settingsSaveThrottleDuration) {
      if (this.#settingsSaveTimeoutToken === undefined) {
        this.#settingsSaveTimeoutToken = setTimeout(() => {
          this.#settingsSaveTimeoutToken = undefined;
          this.#saveSettings();
        }, this.#settingsSaveThrottleDuration - lastSave);
      }
      return;
    }
    this.#settingsSaveLastTime = performance.now();

    const params = new URLSearchParams();

    for (const [name, element] of this.#settings) {
      switch (element.type) {
        case "range": {
          params.set(name, element.value);
        } break;
        case "checkbox": {
          params.set(name, element.checked);
        } break;
        default: {
          throw new Error("Unrecognized setting element type.");
        } break;
      }
    }

    history.replaceState(undefined, "", "?" + params.toString());
  }

  #restoreSettings(search) {
    const params = new URLSearchParams(search);

    for (const [name, element] of this.#settings) {
      switch (element.type) {
        case "range": {
          element.value = params.get(name) ?? element.defaultValue;
        } break;
        case "checkbox": {
          if (params.has(name)) {
            element.checked = params.get(name) === "true";
          }
        } break;
        default: {
          throw new Error("Unrecognized setting element type.");
        } break;
      }
    }
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

    this.#u_time = gl.getUniformLocation(program, "u_time");
    this.#u_streamSize = gl.getUniformLocation(program, "u_streamSize");
    this.#u_flipX = gl.getUniformLocation(program, "u_flipX");
    this.#u_xWaveAmp = gl.getUniformLocation(program, "u_xWaveAmp");
    this.#u_xWaveFreq = gl.getUniformLocation(program, "u_xWaveFreq");
    this.#u_xWaveOscAmp = gl.getUniformLocation(program, "u_xWaveOscAmp");
    this.#u_xWaveOscFreq = gl.getUniformLocation(program, "u_xWaveOscFreq");

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
      this.#saveSettings();
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

    gl.uniform1f(this.#u_time, performance.now());
    gl.uniform2f(this.#u_streamSize, this.#video.videoWidth, this.#video.videoHeight);
    gl.uniform1i(this.#u_flipX, Number(this.#settings.get("flipX").checked));
    gl.uniform1f(this.#u_xWaveAmp, Number(this.#settings.get("xWaveAmp").value));
    gl.uniform1f(this.#u_xWaveFreq, Number(this.#settings.get("xWaveFreq").value));
    gl.uniform1f(this.#u_xWaveOscAmp, Number(this.#settings.get("xWaveOscAmp").value));
    gl.uniform1f(this.#u_xWaveOscFreq, Number(this.#settings.get("xWaveOscFreq").value));

    gl.bindVertexArray(this.#vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

customElements.define("camera-toy", CameraToy);
