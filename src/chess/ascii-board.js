AFRAME.registerComponent("ascii-board", {
  schema: {},

  init() {
    this.tick = AFRAME.utils.throttleTick(this.tick, 2000, this);
    this.chessEngine = this.el.sceneEl.systems["chess-arbiter"].chessEngine;
    window.NAF.connection.subscribeToDataChannel("chess::sync-move", () => {
      this.updateBoard();
    });
    this.board = document.createElement("a-plane");
    this.board.setAttribute("color", "#ccc");
    this.board.setAttribute("width", "1.5");
    this.board.setAttribute("height", "1.5");
    this.board.setAttribute("text", "color: #fff; whiteSpace: pre; xOffset: 0.2;");
    this.board.setAttribute("material", "side: double;");
    this.el.appendChild(this.board);
  },

  updateBoard() {
    const ascii = this.chessEngine.ascii();
    this.board.setAttribute("text", `value: ${ascii}`);
  },

  tick() {
    this.updateBoard();
  }
});
