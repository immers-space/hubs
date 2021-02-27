import rookB from "../assets/models/chess/black_rook.glb";
import knightB from "../assets/models/chess/black_knight.glb";
import bishopB from "../assets/models/chess/black_bishop.glb";
import queenB from "../assets/models/chess/black_queen.glb";
import kingB from "../assets/models/chess/black_king.glb";
import pawnB from "../assets/models/chess/black_pawn.glb";
import rookW from "../assets/models/chess/white_rook.glb";
import knightW from "../assets/models/chess/white_knight.glb";
import bishopW from "../assets/models/chess/white_bishop.glb";
import queenW from "../assets/models/chess/white_queen.glb";
import kingW from "../assets/models/chess/white_king.glb";
import pawnW from "../assets/models/chess/white_pawn.glb";

AFRAME.registerComponent("chess-set", {
  schema: {
    color: { default: "all" }
  },

  init() {
    this.detectGame();
    this.buildSet(this.data.color);
    this.el.queenB = queenB;
    this.el.queenW = queenW;
  },

  detectGame() {
    this.scene = this.el.sceneEl;
    this.chessGame = this.scene.querySelector("a-entity[chess-game]");
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

  buildSet(color = "all") {
    const whitePieces = [
      { type: "r", color: "w", initialSquare: "a1", model: rookW },
      { type: "n", color: "w", initialSquare: "b1", model: knightW },
      { type: "b", color: "w", initialSquare: "c1", model: bishopW },
      { type: "q", color: "w", initialSquare: "d1", model: queenW },
      { type: "k", color: "w", initialSquare: "e1", model: kingW },
      { type: "b", color: "w", initialSquare: "f1", model: bishopW },
      { type: "n", color: "w", initialSquare: "g1", model: knightW },
      { type: "r", color: "w", initialSquare: "h1", model: rookW },
      { type: "p", color: "w", initialSquare: "a2", model: pawnW },
      { type: "p", color: "w", initialSquare: "b2", model: pawnW },
      { type: "p", color: "w", initialSquare: "c2", model: pawnW },
      { type: "p", color: "w", initialSquare: "d2", model: pawnW },
      { type: "p", color: "w", initialSquare: "e2", model: pawnW },
      { type: "p", color: "w", initialSquare: "f2", model: pawnW },
      { type: "p", color: "w", initialSquare: "g2", model: pawnW },
      { type: "p", color: "w", initialSquare: "h2", model: pawnW }
    ];
    const blackPieces = [
      { type: "r", color: "b", initialSquare: "a8", model: rookB },
      { type: "n", color: "b", initialSquare: "b8", model: knightB },
      { type: "b", color: "b", initialSquare: "c8", model: bishopB },
      { type: "q", color: "b", initialSquare: "d8", model: queenB },
      { type: "k", color: "b", initialSquare: "e8", model: kingB },
      { type: "b", color: "b", initialSquare: "f8", model: bishopB },
      { type: "n", color: "b", initialSquare: "g8", model: knightB },
      { type: "r", color: "b", initialSquare: "h8", model: rookB },
      { type: "p", color: "b", initialSquare: "a7", model: pawnB },
      { type: "p", color: "b", initialSquare: "b7", model: pawnB },
      { type: "p", color: "b", initialSquare: "c7", model: pawnB },
      { type: "p", color: "b", initialSquare: "d7", model: pawnB },
      { type: "p", color: "b", initialSquare: "e7", model: pawnB },
      { type: "p", color: "b", initialSquare: "f7", model: pawnB },
      { type: "p", color: "b", initialSquare: "g7", model: pawnB },
      { type: "p", color: "b", initialSquare: "h7", model: pawnB }
    ];
    let pieces = [];
    if (color === "white") {
      pieces = whitePieces;
    } else if (color === "black") {
      pieces = blackPieces;
    } else if (color === "all") {
      pieces = whitePieces.concat(blackPieces);
    } else {
      return false;
    }
    this.buildPieces(pieces);
    this.createCursor();
  },
  buildPieces(pieces) {
    pieces.forEach(piece => {
      const pieceMeta = `type: ${piece.type}; color: ${piece.color}; initialSquare: ${piece.initialSquare}; model: ${
        piece.model
      };`;
      const tempPiece = document.createElement("a-entity");
      tempPiece.setAttribute("chess-piece", pieceMeta);
      this.el.appendChild(tempPiece);
    });
  },
  createCursor() {
    const cursor = document.createElement("a-entity");
    cursor.setAttribute("chess-cursor", "");
    cursor.setAttribute("radius", this.data.squareSize / 8);
    this.el.appendChild(cursor);
  }
});
