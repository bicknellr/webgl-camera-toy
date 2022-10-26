class CameraToy extends HTMLElement {
  #video = undefined;
  #canvas = undefined;
  #ctx = undefined;
  #canvasResizeObserver = undefined;

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

    this.#ctx = this.#canvas.getContext("2d");

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
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 1280,
        height: 720,
      },
    });

    this.#video.srcObject = stream;
    this.#video.play();

    const frame = () => {
      this.#renderFrame();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  #renderFrame() {
    this.#ctx.drawImage(this.#video, 0, 0);
  }
}

customElements.define("camera-toy", CameraToy);
