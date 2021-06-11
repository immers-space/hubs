import * as PositioningUtils from "./positioning-utils";
import * as HackyAnimationUtils from "./hacky-animation-utils";

function setPieceClaimed(pieceData) {
  // TODO: Retries may no longer be needed with new state system.
  if (!pieceData.retryCount) {
    pieceData.retryCount = 1;
  }
  const piece = document.querySelector(`#${pieceData.id}`);
  if (piece) {
    piece.setAttribute("listed-media", "", true);
    piece.removeAttribute("listed-media");
    piece.setAttribute("floaty-object", "", true);
    piece.removeAttribute("floaty-object");
    piece.setAttribute("set-unowned-body-kinematic", "", true);
    piece.removeAttribute("set-unowned-body-kinematic");
    piece.setAttribute("is-remote-hover-target", "", true);
    piece.removeAttribute("is-remote-hover-target");
    piece.setAttribute("is-not-remote-hover-target", "");
    piece.setAttribute("matrix-auto-update", "", true);
    piece.removeAttribute("matrix-auto-update");
    piece.setAttribute("scalable-when-grabbed", "", true);
    piece.removeAttribute("scalable-when-grabbed");
    piece.setAttribute("hoverable-visuals", "", true);
    piece.removeAttribute("hoverable-visuals");
    piece.setAttribute(
      "body-helper",
      "type: kinematic; mass: 1000; collisionFilterGroup: 0; collisionFilterMask: 0; disableCollision: true; emitCollisionEvents: false; linearDamping: 1; angularDamping: 1;"
    );
    piece.classList.remove("interactable");
    setTimeout(() => {
      HackyAnimationUtils.pausePiece(piece);
    }, 3000);
  } else if (pieceData.retryCount < 5) {
    setTimeout(() => {
      pieceData.retryCount += 1;
      setPieceClaimed(pieceData);
    }, 1000);
  }
}

function setupNetwork(scene) {
  const state = scene.systems.state.state;
  window.NAF.connection.onConnect(() => {
    // Networked State Broadcasts
    window.NAF.connection.subscribeToDataChannel("chess::set-game-mode", (_, dataType, data) => {
      scene.emit("setGameMode", data);
    });
    window.NAF.connection.subscribeToDataChannel("chess::set-player", (_, dataType, data) => {
      scene.emit("setPlayer", data);
      if (state.imPlaying && state.opponentColor === data.color) {
        state.opponentId = data.id;
      }
      if (data.pieces && data.id !== NAF.clientId) {
        for (const p of data.pieces) {
          setPieceClaimed(p);
        }
      }
    });
    window.NAF.connection.subscribeToDataChannel("chess::add-piece", (_, dataType, data) => {
      scene.emit("addPiece", data);
      setPieceClaimed(data);
    });
    window.NAF.connection.subscribeToDataChannel("chess::update-piece", (_, dataType, data) => {
      scene.emit("updatePiece", data);
    });
    window.NAF.connection.subscribeToDataChannel("chess::remove-piece", (_, dataType, oldPiece) => {
      scene.emit("removePiece", oldPiece);
    });
    window.NAF.connection.subscribeToDataChannel("chess::reset-game", (_, dataType, data) => {
      scene.emit("resetChessState");
      const fen = (data.fen) ? data.fen : '';
      scene.systems["chess-arbiter"].resetGame(fen);
    });
    window.NAF.connection.subscribeToDataChannel("chess::load-pgn", (_, dataType, data) => {
      scene.systems["chess-arbiter"].loadPGN(data.pgn);
    });
    window.NAF.connection.subscribeToDataChannel("chess::sync-animation", (_, dataType, data) => {
      const piece = document.querySelector(`#${data.pieceId}`);
      HackyAnimationUtils[data.method](piece);
    });
    // Chess Engine Broadcasts
    window.NAF.connection.subscribeToDataChannel("chess::sync-move", (_, dataType, data) => {
      scene.systems["chess-arbiter"].chessEngine.move(data);
      scene.emit("sync-move");
    });
    window.NAF.connection.subscribeToDataChannel("chess::capture-piece", (_, dataType, data) => {
      if (state.imPlaying) {
        const piece = PositioningUtils.getPieceFromSquare(data.square);
        const pieceParent = piece.parentNode;
        pieceParent.removeChild(piece);
        pieceParent.parentNode.removeChild(pieceParent);
        scene.emit("removePiece", { id: piece.id, color: piece.metadata.color });
        window.NAF.connection.broadcastDataGuaranteed("chess::remove-piece", {
          id: piece.id,
          color: piece.metadata.color
        });
      }
    });
  });
}

function broadcastData(key, value) {
  if (window.NAF.connection.isConnected()) {
    window.NAF.connection.broadcastDataGuaranteed(key, value);
  }
}

function sendData(to, key, value) {
  if (window.NAF.connection.isConnected()) {
    window.NAF.connection.sendDataGuaranteed(to, key, value);
  }
}

function getMyId() {
  return window.NAF.clientId;
}

export { setupNetwork, broadcastData, sendData, getMyId };
