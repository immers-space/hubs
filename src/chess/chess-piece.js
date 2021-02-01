import { addMedia } from "../utils/media-utils";
import { getAbsoluteHref } from "../utils/media-url-utils";
import * as PositioningUtils from "./positioning-utils";
import * as GameNetwork from "./game-network";

AFRAME.registerComponent("chess-piece", {
  schema: {
    type: { default: "" },
    color: { default: "" },
    initialSquare: { default: "" },
    model: { default: "" },
    lastPosition: { default: "" },
    lastSquare: { default: "" },
    currentPosition: { default: "" },
    moves: { default: [] },
    wasHeld: { default: false },
    pieceY: { default: 0 }
  },

  init() {
    this.detectBoard();
    this.buildPiece();
    this.el.fireResetRotation = () => {
      this.resetPieceRotation(this.el);
    };
  },

  detectBoard() {
    this.scene = this.el.sceneEl;
    this.chessGame = this.scene.querySelector("a-entity[chess-game]");
    this.squareSize = this.chessGame.getAttribute("chess-game").squareSize;
    this.halfSquare = this.squareSize / 2;
    const yCorrectionsArray = this.chessGame.getAttribute("chess-game").yCorrections.split(" ");
    this.yCorrections = {
      k: parseFloat(yCorrectionsArray[0]),
      q: parseFloat(yCorrectionsArray[1]),
      b: parseFloat(yCorrectionsArray[2]),
      n: parseFloat(yCorrectionsArray[3]),
      r: parseFloat(yCorrectionsArray[4]),
      p: parseFloat(yCorrectionsArray[5])
    };
    this.pieceY = this.squareSize * 2.4;
    this.scaleDefault = 2;
    this.invertKnights = this.chessGame.getAttribute("chess-game").invertKnights;
  },

  buildPiece() {
    const contentOrigin = 1;
    const src = getAbsoluteHref(location.href, this.data.model);
    const { entity } = addMedia(
      src,
      "#interactable-game-media",
      contentOrigin,
      null,
      !(src instanceof MediaStream),
      false,
      true,
      {},
      true,
      this.el.parentElement
    );
    this.el = entity;
    const pieceScale = this.squareSize / this.scaleDefault;
    this.el.setAttribute("scale", `${pieceScale} ${pieceScale} ${pieceScale}`);
    const file = this.data.initialSquare.substr(0, 1);
    const rank = this.data.initialSquare.substr(1, 1);
    const pieceX = PositioningUtils.getPositionFromFile(file);
    const pieceZ = PositioningUtils.getPositionFromRank(rank);
    this.data.lastPosition = this.el.getAttribute("position");
    this.data.currentPosition = this.el.getAttribute("position");
    this.data.lastSquare = this.data.initialSquare;
    this.data.moves = [];
    this.data.wasHeld = false;
    this.data.pieceY = this.pieceY + this.yCorrections[this.data.type];
    const initialPosition = `${pieceX} ${this.data.pieceY} ${pieceZ}`;
    this.el.setAttribute("position", initialPosition);
    this.resetPieceRotation(entity);
    this.el.setAttribute("listed-media", "", true);
    this.el.removeAttribute("listed-media");
    this.el.setAttribute("scalable-when-grabbed", "", true);
    this.el.removeAttribute("scalable-when-grabbed");
    this.el.setAttribute("hoverable-visuals", "", true);
    this.el.removeAttribute("hoverable-visuals");
    this.el.metadata = this.data;
    setTimeout(() => {
      const newPiece = {
        color: this.data.color,
        id: this.el.id,
        type: this.data.type,
        initialSquare: this.data.initialSquare,
        lastSquare: this.data.lastSquare
      };
      this.scene.emit("addPiece", newPiece);
      GameNetwork.broadcastData("chess::add-piece", newPiece);
    });
  },

  resetPieceRotation(piece) {
    if (this.invertKnights === true && this.data.type === "n") {
      piece.setAttribute("rotation", "0 180 0");
    } else {
      piece.setAttribute("rotation", "0 0 0");
    }
  }
});
