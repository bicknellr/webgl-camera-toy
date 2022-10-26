class CameraToy extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          border: 8px solid red;
          box-sizing: border-box;
        }
      </style>
      camera-toy
    `;
  }
}

customElements.define("camera-toy", CameraToy);
