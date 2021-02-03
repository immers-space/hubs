AFRAME.registerComponent("chess-game", {
  schema: {
    squareSize: { default: 0.25 },
    hideBoard: { default: false },
    wireframeBoard: { default: false },
    yCorrections: { default: "0 0 0 0 0 0" /* k q b n r p */ },
    invertKnights: { default: true },
    preventThrowing: { default: true },
    snapToSquare: { default: true }
  },

  update() {
    while (this.el.firstChild) {
      this.el.removeChild(this.el.firstChild);
    }
    this.addBoard();
  },

  addBoard() {
    const board = document.createElement("a-entity");
    board.setAttribute("networked", "template: #template-waypoint-avatar;");
    board.setAttribute(
      "chess-board",
      `squareSize: ${this.data.squareSize}; hideBoard: ${this.data.hideBoard}; wireframeBoard: ${
        this.data.wireframeBoard
      }; `
    );
    this.el.appendChild(board);
  }
});
