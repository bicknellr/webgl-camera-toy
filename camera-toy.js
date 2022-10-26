class CameraToy extends HTMLElement {
  #canvas = undefined;
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

    this.#canvas = this.shadowRoot.getElementById("mainCanvas");
    this.#canvasResizeObserver = new ResizeObserver((entries) => {
      const entry = entries.findLast(entry => entry.target === this.#canvas);
      if (entry) {
        const contentRect = entry.contentRect;
        this.#resizeCanvas(contentRect.width, contentRect.height);
      }
    });
    this.#canvasResizeObserver.observe(this.#canvas);

    this.#canvas.addEventListener("click", () => { this.#start(); });
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

    const video = document.createElement("video");
    video.srcObject = stream;
    video.play();

    const ctx = this.#canvas.getContext("2d");

    const frame = () => {
      ctx.drawImage(video, 0, 0);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

customElements.define("camera-toy", CameraToy);
