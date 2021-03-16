import { COLOR } from './game-constants';

AFRAME.registerComponent("chess-game-status", {
  schema: {
    backgroundColor: { default: "#282828" },
    textColor: { default: "#fff" },
  },
  init() {
    this.tick = AFRAME.utils.throttleTick(this.tick, 2000, this);
    this.state = this.el.sceneEl.systems.state.state;
    window.NAF.connection.subscribeToDataChannel("chess::sync-move", () => {
      this.updateGameStatus();
    });
    const baseConfigText = `color:${this.data.textColor}; width:2.5; align:left; anchor:left; baseline:top; side:double;`;
    const baseConfigMaterial = "transparent: true; opacity: 0;";
    const baseConfigMaterialBg = `side:double; color:${this.data.backgroundColor};`;
    const baseConfigGeometry = "primitive:plane; width:2; height:0.5;";
    this.statusBoard = document.createElement("a-entity");
    this.statusBoard.setAttribute("geometry", baseConfigGeometry);
    this.statusBoard.setAttribute("material", baseConfigMaterial);
    this.statusBoard.setAttribute("text", baseConfigText);
    this.statusBoard.setAttribute("position", "-0.4 0.1 0");
    this.el.appendChild(this.statusBoard);
    this.statusBoardBg = document.createElement("a-entity");
    this.statusBoardBg.setAttribute("material", baseConfigMaterialBg);
    this.statusBoardBg.setAttribute("geometry", baseConfigGeometry);
    this.statusBoardBg.setAttribute("position", "0.5 0 0");
    this.el.appendChild(this.statusBoardBg);
  },

  updateGameStatus() {
    const whiteReady = this.state.players.white.pieces.length > 0;
    const blackReady = this.state.players.black.pieces.length > 0;
    const message = whiteReady && blackReady ? this.getGameStatus() : this.getOpenStatus(whiteReady, blackReady);
    this.statusBoard.setAttribute("text", `value: ${message}`);
  },

  getGameStatus() {
    const chessEngine = this.el.sceneEl.systems["chess-arbiter"].chessEngine;
    let message = "";
    const inCheck = chessEngine.in_check();
    const inCheckmate = chessEngine.in_checkmate();
    const inDraw = chessEngine.in_draw();
    const inStalemate = chessEngine.in_stalemate();
    if (inDraw || inStalemate) {
      message = inDraw ? "Game over: draw." : "Game over: stalemate.";
    } else {
      const color = chessEngine.turn() === COLOR.W ? "White" : "Black";
      message = color;
      message += inCheck ? " (in check)" : "";
      message += inCheckmate ? " checkmated." : " to move.";
    }
    return message;
  },

  getOpenStatus(whiteReady, blackReady) {
    let message = "Chess board is currently open.";
    if (!whiteReady && !blackReady) {
      message += " Both colors are";
    } else {
      message += !whiteReady ? " White is" : " Black is";
    }
    message += " available to play.";
    return message;
  },

  tick() {
    this.updateGameStatus();
  }
});
