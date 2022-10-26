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
  }

  #resizeCanvas(width, height) {
    this.#canvas.width = width;
    this.#canvas.height = height;
  }
}

customElements.define("camera-toy", CameraToy);
