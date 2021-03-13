import { COLOR } from './game-constants';

function getHalfSquare() {
  const scene = window.AFRAME.scenes[0];
  const chessBoard = scene.querySelector("a-entity[chess-board]");
  const squareSize = chessBoard.getAttribute("chess-board").squareSize;
  const halfSquare = squareSize / 2;
  return halfSquare;
}

function getRankFile(square) {
  let rank = null;
  let file = null;
  if (typeof square === "string") {
    const validSquare = /[a-h][1-8]/.test(square);
    if (!validSquare) return false;
    rank = square.substr(1, 1);
    file = square.substr(0, 1);
  } else if (square && square.hasOwnProperty("file") && square.hasOwnProperty("rank")) {
    rank = square.rank;
    file = square.file;
  } else {
    return false;
  }
  return { rank, file };
}

function getPositionFromFile(file) {
  const halfSquare = getHalfSquare();
  let destinationX = null;
  switch (file) {
    case "a":
      destinationX = 0;
      break;
    case "b":
      destinationX = 2 * halfSquare;
      break;
    case "c":
      destinationX = 4 * halfSquare;
      break;
    case "d":
      destinationX = 6 * halfSquare;
      break;
    case "e":
      destinationX = 8 * halfSquare;
      break;
    case "f":
      destinationX = 10 * halfSquare;
      break;
    case "g":
      destinationX = 12 * halfSquare;
      break;
    case "h":
      destinationX = 14 * halfSquare;
      break;
  }
  return destinationX;
}

function getPositionFromRank(rank) {
  const halfSquare = getHalfSquare();
  let destinationZ = null;
  rank = rank.toString();
  switch (rank) {
    case "8":
      destinationZ = 0;
      break;
    case "7":
      destinationZ = 2 * halfSquare;
      break;
    case "6":
      destinationZ = 4 * halfSquare;
      break;
    case "5":
      destinationZ = 6 * halfSquare;
      break;
    case "4":
      destinationZ = 8 * halfSquare;
      break;
    case "3":
      destinationZ = 10 * halfSquare;
      break;
    case "2":
      destinationZ = 12 * halfSquare;
      break;
    case "1":
      destinationZ = 14 * halfSquare;
      break;
  }
  return destinationZ;
}

function getPieceFromSquare(square) {
  const scene = window.AFRAME.scenes[0];
  const players = scene.systems.state.state.players;
  const whitePieces = players.white.pieces.map(p => {
    p.color = COLOR.W;
    return p;
  });
  const blackPieces = players.black.pieces.map(p => {
    p.color = COLOR.B;
    return p;
  });
  const allPieces = whitePieces.concat(blackPieces);
  const pieceMeta = allPieces.filter(p => p.lastSquare === square)[0];
  const piece = scene.querySelector(`#${pieceMeta.id}`);
  if (!piece.pieceData) {
    piece.pieceData = { color: pieceMeta.color };
  }
  return piece;
}

function isOnBoard(piece) {
  const halfSquare = getHalfSquare();
  const position = piece.getAttribute("position");
  if (
    position.x < 0 - halfSquare ||
    position.z < 0 - halfSquare ||
    position.x > halfSquare * 15 ||
    position.z > halfSquare * 15
  ) {
    return false;
  }
  return true;
}

function getRankFromPosition(position) {
  const halfSquare = getHalfSquare();
  const z = position.z;
  let rank = null;
  if (z < halfSquare) {
    rank = "8";
  } else if (z < 3 * halfSquare) {
    rank = "7";
  } else if (z < 5 * halfSquare) {
    rank = "6";
  } else if (z < 7 * halfSquare) {
    rank = "5";
  } else if (z < 9 * halfSquare) {
    rank = "4";
  } else if (z < 11 * halfSquare) {
    rank = "3";
  } else if (z < 13 * halfSquare) {
    rank = "2";
  } else if (z < 15 * halfSquare) {
    rank = "1";
  }
  return rank;
}

function getFileFromPosition(position) {
  const halfSquare = getHalfSquare();
  const x = position.x;
  let file = null;
  if (x < halfSquare) {
    file = "a";
  } else if (x < 3 * halfSquare) {
    file = "b";
  } else if (x < 5 * halfSquare) {
    file = "c";
  } else if (x < 7 * halfSquare) {
    file = "d";
  } else if (x < 9 * halfSquare) {
    file = "e";
  } else if (x < 11 * halfSquare) {
    file = "f";
  } else if (x < 13 * halfSquare) {
    file = "g";
  } else if (x < 15 * halfSquare) {
    file = "h";
  }
  return file;
}

function getSquareFromPosition(position) {
  const file = getFileFromPosition(position);
  const rank = getRankFromPosition(position);
  const square = `${file}${rank}`;
  return {
    square,
    file,
    rank
  };
}

export { getRankFile, getPositionFromFile, getPositionFromRank, getSquareFromPosition, getPieceFromSquare, isOnBoard };
