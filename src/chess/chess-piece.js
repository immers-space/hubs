import { addMedia } from "../utils/media-utils";
import { getAbsoluteHref } from "../utils/media-url-utils";
import * as PositioningUtils from "./positioning-utils";
import * as GameNetwork from "./game-network";
import * as HackyAnimationUtils from "./hacky-animation-utils";

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
    pieceY: { default: 0 },
    sendTo: { default: "" },
    isPremium: { default: false }
  },

  init() {
    this.detectGame();
    this.buildPiece();
    this.el.setAttribute("networked", "template: #static-game-avatar");
  },

  detectGame() {
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
      this.el
    );
    const pieceScale = this.squareSize / this.scaleDefault;
    entity.setAttribute("scale", `${pieceScale} ${pieceScale} ${pieceScale}`);
    const file = this.data.sendTo ? this.data.sendTo.substr(0, 1) : this.data.initialSquare.substr(0, 1);
    const rank = this.data.sendTo ? this.data.sendTo.substr(1, 1) : this.data.initialSquare.substr(1, 1);
    const pieceX = PositioningUtils.getPositionFromFile(file);
    const pieceZ = PositioningUtils.getPositionFromRank(rank);
    this.data.lastPosition = entity.getAttribute("position");
    this.data.currentPosition = entity.getAttribute("position");
    this.data.lastSquare = this.data.sendTo ? this.data.sendTo : this.data.initialSquare;
    this.data.moves = [];
    this.data.wasHeld = false;
    this.data.pieceY = this.pieceY + this.yCorrections[this.data.type];
    const initialPosition = `${pieceX} ${this.data.pieceY} ${pieceZ}`;
    entity.setAttribute("position", initialPosition);
    this.resetPieceRotation(entity);
    entity.setAttribute("listed-media", "", true);
    entity.removeAttribute("listed-media");
    entity.setAttribute("scalable-when-grabbed", "", true);
    entity.removeAttribute("scalable-when-grabbed");
    entity.setAttribute("hoverable-visuals", "", true);
    entity.removeAttribute("hoverable-visuals");
    entity.metadata = this.data;
    this.announcePiece(entity);
    this.autoSetY(entity);
    entity.fireResetRotation = () => {
      this.resetPieceRotation(entity);
    };
    if (this.data.isPremium) {
      setTimeout(() => {
        HackyAnimationUtils.pausePiece(entity);
      }, 3000);
    }
  },

  resetPieceRotation(piece) {
    if (this.invertKnights === true && this.data.type === "n") {
      piece.setAttribute("rotation", "0 180 0");
    } else {
      piece.setAttribute("rotation", "0 0 0");
    }
    // Temp hack to turn around animated pieces
    if (this.data.isPremium && this.data.color === 'w' && this.data.type !== 'n') {
      piece.setAttribute("rotation", "0 180 0");
    }
    if (this.data.isPremium && this.data.color === 'b' && this.data.type === 'n') {
      piece.setAttribute("rotation", "0 0 0");
    }
  },

  autoSetY(entity) {
    const bbox = new THREE.Box3();
    entity.addEventListener("object3dset", () => {
      bbox.setFromObject(entity.object3D);
      if (isFinite(bbox.min.y)) {
        const height = bbox.max.y/2 - bbox.min.y/2;
        const autoY = height + this.squareSize * 1.5;
        this.data.pieceY = autoY;
        entity.object3D.position.y = autoY;
      }
    });
  },

  announcePiece(piece) {
    if (piece.id) {
      const newPiece = {
        color: this.data.color,
        id: piece.id,
        type: this.data.type,
        initialSquare: this.data.initialSquare,
        lastSquare: this.data.lastSquare
      };
      this.scene.emit("addPiece", newPiece);
      GameNetwork.broadcastData("chess::add-piece", newPiece);
    } else {
      setTimeout(() => {
        this.announcePiece(piece);
      }, 500);
    }
  }
});
