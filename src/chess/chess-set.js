import { GAME_MODE, COLOR } from './game-constants';
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
import animRookB from "../assets/models/chess/black_rook_anim.glb";
import animKnightB from "../assets/models/chess/black_knight_anim.glb";
import animBishopB from "../assets/models/chess/black_bishop_anim.glb";
import animQueenB from "../assets/models/chess/black_queen_anim.glb";
import animKingB from "../assets/models/chess/black_king_anim.glb";
import animPawnB from "../assets/models/chess/black_pawn_anim.glb";
import animRookW from "../assets/models/chess/white_rook_anim.glb";
import animKnightW from "../assets/models/chess/white_knight_anim.glb";
import animBishopW from "../assets/models/chess/white_bishop_anim.glb";
import animQueenW from "../assets/models/chess/white_queen_anim.glb";
import animKingW from "../assets/models/chess/white_king_anim.glb";
import animPawnW from "../assets/models/chess/white_pawn_anim.glb";

AFRAME.registerComponent("chess-set", {
  schema: {
    color: { default: "all" }
  },

  init() {
    this.detectGame();
    this.initPremium();
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

  initPremium() {
    this.el.isPremium = document.querySelectorAll('[vreign-premium-pieces]').length;
    // const isPremium = document.querySelectorAll('[chess-board]').length; // for testing
    if (this.el.isPremium) {
      this.el.setAttribute('hacky-animations', '');
    }
  },

  buildSet(color = "") {
    const currentGameMode = this.el.sceneEl.systems.state.state.gameMode;
    const allWhitePieces = [
      { type: "r", initialSquare: "a1" },
      { type: "n", initialSquare: "b1" },
      { type: "b", initialSquare: "c1" },
      { type: "q", initialSquare: "d1" },
      { type: "k", initialSquare: "e1" },
      { type: "b", initialSquare: "f1" },
      { type: "n", initialSquare: "g1" },
      { type: "r", initialSquare: "h1" },
      { type: "p", initialSquare: "a2" },
      { type: "p", initialSquare: "b2" },
      { type: "p", initialSquare: "c2" },
      { type: "p", initialSquare: "d2" },
      { type: "p", initialSquare: "e2" },
      { type: "p", initialSquare: "f2" },
      { type: "p", initialSquare: "g2" },
      { type: "p", initialSquare: "h2" }
    ];
    allWhitePieces.map(p => {
      p.color = COLOR.W;
      p.model = this.getModel(p.color, p.type);
    });
    const allBlackPieces = [
      { type: "r", initialSquare: "a8" },
      { type: "n", initialSquare: "b8" },
      { type: "b", initialSquare: "c8" },
      { type: "q", initialSquare: "d8" },
      { type: "k", initialSquare: "e8" },
      { type: "b", initialSquare: "f8" },
      { type: "n", initialSquare: "g8" },
      { type: "r", initialSquare: "h8" },
      { type: "p", initialSquare: "a7" },
      { type: "p", initialSquare: "b7" },
      { type: "p", initialSquare: "c7" },
      { type: "p", initialSquare: "d7" },
      { type: "p", initialSquare: "e7" },
      { type: "p", initialSquare: "f7" },
      { type: "p", initialSquare: "g7" },
      { type: "p", initialSquare: "h7" }
    ];
    allBlackPieces.map(p => {
      p.color = COLOR.B;
      p.model = this.getModel(p.color, p.type);
    });
    let pieces = [];
    if (currentGameMode === GAME_MODE.STANDARD) {
      pieces = (color === COLOR.WHITE) ? allWhitePieces : allBlackPieces;
    } else if (currentGameMode === GAME_MODE.FEN || currentGameMode === GAME_MODE.PGN) {
      pieces = this.getEnginePieces(color);
    }
    this.buildPieces(pieces);
    this.createCursor();
  },

  getEnginePieces(color) {
    let pieces = [];
    const c = (color === COLOR.WHITE) ? COLOR.W : COLOR.B;
    const chessEngine = this.el.sceneEl.systems["chess-arbiter"].chessEngine;
    const board = chessEngine.board();
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        if (board[row][col] && board[row][col].color === c) {
          const color = board[row][col].color;
          const type = board[row][col].type;
          const initialSquare = this.getInitialSquare(row, col);
          const model = this.getModel(color, type);
          const piece = { color, type, initialSquare, model };
          pieces.push(piece);
        }
      }
    }
    return pieces;
  },

  getInitialSquare(row, col) {
    let rank = null;
    let file = null;
    switch (row) {
      case 0:
        rank = "8";
        break;
      case 1:
        rank = "7";
        break;
      case 2:
        rank = "6";
        break;
      case 3:
        rank = "5";
        break;
      case 4:
        rank = "4";
        break;
      case 5:
        rank = "3";
        break;
      case 6:
        rank = "2";
        break;
      case 7:
        rank = "1";
        break;
    }
    switch (col) {
      case 0:
        file = "a";
        break;
      case 1:
        file = "b";
        break;
      case 2:
        file = "c";
        break;
      case 3:
        file = "d";
        break;
      case 4:
        file = "e";
        break;
      case 5:
        file = "f";
        break;
      case 6:
        file = "g";
        break;
      case 7:
        file = "h";
        break;
    }
    return `${file}${rank}`;
  },

  getModel(color, type) {
    let model = null;
    const isPremium = this.el.isPremium;
    // const isPremium = document.querySelectorAll('[chess-board]').length; // for testing
    switch (type) {
      case "r":
        if (isPremium) {
          model = (color === COLOR.B) ? animRookB : animRookW;
        } else {
          model = (color === COLOR.B) ? rookB : rookW;
        }
        break;
      case "n":
        if (isPremium) {
          model = (color === COLOR.B) ? animKnightB : animKnightW;
        } else {
          model = (color === COLOR.B) ? knightB : knightW;
        }
        break;
      case "b":
        if (isPremium) {
          model = (color === COLOR.B) ? animBishopB : animBishopW;
        } else {
          model = (color === COLOR.B) ? bishopB : bishopW;
        }
        break;
      case "q":
        if (isPremium) {
          model = (color === COLOR.B) ? animQueenB : animQueenW;
        } else {
          model = (color === COLOR.B) ? queenB : queenW;
        }
        break;
      case "k":
        if (isPremium) {
          model = (color === COLOR.B) ? animKingB : animKingW;
        } else {
          model = (color === COLOR.B) ? kingB : kingW;
        }
        break;
      case "p":
        if (isPremium) {
          model = (color === COLOR.B) ? animPawnB : animPawnW;
        } else {
          model = (color === COLOR.B) ? pawnB : pawnW;
        }
        break;
    }
    return model;
  },

  buildPieces(pieces) {
    pieces.forEach(piece => {
      const pieceMeta = `type: ${piece.type}; color: ${piece.color}; initialSquare: ${piece.initialSquare}; model: ${piece.model}; isPremium: ${this.el.isPremium}`;
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
