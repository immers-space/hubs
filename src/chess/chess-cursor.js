AFRAME.registerComponent("chess-cursor", {
  schema: {
    validColor: { default: "#00cc00" },
    invalidColor: { default: "#cc0000" }
  },
  init() {
    this.addEventListeners = this.addEventListeners.bind(this);
    this.removeEventListeners = this.removeEventListeners.bind(this);
    this.eventHandler = this.eventHandler.bind(this);
    this.detectBoard();
    this.createVisual();
    this.addEventListeners();
  },
  remove() {
    this.removeEventListeners();
  },
  detectBoard() {
    this.scene = this.el.sceneEl;
    this.chessGame = this.scene.querySelector("a-entity[chess-game]");
    this.squareSize = this.chessGame.getAttribute("chess-game").squareSize;
  },
  createVisual() {
    const sphere = document.createElement("a-sphere");
    sphere.setAttribute("radius", this.squareSize / 8);
    this.el.appendChild(sphere);
  },
  addEventListeners() {
    this.el.sceneEl.addEventListener("chess-cursor", this.eventHandler);
  },
  removeEventListeners() {
    this.el.sceneEl.removeEventListener("chess-cursor", this.eventHandler);
  },
  eventHandler(ev) {
    if (ev.detail.enabled) {
      this.enableCursor(ev.detail.position);
      if (ev.detail.valid) {
        this.validCursor();
      } else {
        this.invalidCursor();
      }
    } else {
      this.disableCursor();
    }
  },
  enableCursor(position) {
    const sphere = this.el.querySelector("a-sphere");
    const cursorHeight = this.squareSize * 1.6;
    sphere.setAttribute("position", `${position.x} ${cursorHeight} ${position.z}`);
    sphere.setAttribute("visible", "true");
  },
  disableCursor() {
    const sphere = this.el.querySelector("a-sphere");
    sphere.setAttribute("visible", "false");
  },
  validCursor() {
    const sphere = this.el.querySelector("a-sphere");
    sphere.setAttribute("color", this.data.validColor);
  },
  invalidCursor() {
    const sphere = this.el.querySelector("a-sphere");
    sphere.setAttribute("color", this.data.invalidColor);
  }
});
