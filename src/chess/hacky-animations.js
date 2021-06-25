import * as GameNetwork from "./game-network";
import * as HackyAnimationUtils from "./hacky-animation-utils";


AFRAME.registerComponent("hacky-animations", {
    schema: {
        color: {
            default: "all"
        }
    },

    init() {
        this.addEventListeners();
        setTimeout(() => {
            this.idleInit();
        }, 10000);
    },

    addEventListeners() {
        this.el.sceneEl.addEventListener("chess-piece-held", this.onHeld);
        this.el.sceneEl.addEventListener("chess-piece-moved", this.onMoved);
        this.el.sceneEl.addEventListener("chess-piece-died", this.onDeath);
    },

    onHeld(ev) {
        const piece = ev.detail.piece;
        if (piece.metadata.isPremium && !piece.metadata.wasHeld) {
            GameNetwork.broadcastData("chess::sync-animation", { method: "doHeld", pieceId: piece.id, metadata: piece.metadata });
            HackyAnimationUtils.doHeld(piece);
        }
    },

    onMoved(ev) {
        const piece = ev.detail.piece;
        if (piece.metadata.isPremium) {
            GameNetwork.broadcastData("chess::sync-animation", { method: "doMoved", pieceId: piece.id, metadata: piece.metadata });
            HackyAnimationUtils.doMoved(piece);
        }
    },

    onDeath(ev) {
        const piece = ev.detail.piece;
        console.log(">>>> piece died: ", piece);
    },

    idleInit() {
        const minSeconds = 2;
        const maxSeconds = 7;
        const randomSeconds = (Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds)) * 1000;
        setTimeout(() => {
            this.idleInit();
        }, randomSeconds);
        if (this.el.sceneEl.systems.state.state.imPlaying) {
            const piece = this.pickRandomPiece();
            GameNetwork.broadcastData("chess::sync-animation", { method: "doIdle", pieceId: piece.id, metadata: piece.metadata });
            HackyAnimationUtils.doIdle(piece);
        }
    },

    pickRandomPiece() {
        const myColor = this.el.sceneEl.systems.state.state.myColor;
        const randomIndex = (Math.floor(Math.random() * 16));
        const randomPieceId = this.el.sceneEl.systems.state.state.players[myColor].pieces[randomIndex].id;
        const randomPiece = document.querySelector(`#${randomPieceId}`);
        return randomPiece;
    },

});