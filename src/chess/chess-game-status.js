AFRAME.registerComponent("chess-game-status", {
    schema: {
        backgroundColor: { default: '#282828' },
        textColor: { default: '#fff' },
        width: { default: '0.2' },
        height: { default: '0.5' },
    },
    init() {
        this.tick = AFRAME.utils.throttleTick(this.tick, 2000, this);
        this.chessEngine = this.el.sceneEl.systems['chess-arbiter'].chessEngine;
        this.state = this.el.sceneEl.systems.state.state;
        window.NAF.connection.subscribeToDataChannel("chess::sync-move", (_, dataType, data) => {
            this.updateGameStatus();
        });
        this.statusBoard = document.createElement('a-plane');
        this.statusBoard.setAttribute("color", this.data.backgroundColor);
        this.statusBoard.setAttribute("width", this.data.width);
        this.statusBoard.setAttribute("height", this.data.height);
        this.statusBoard.setAttribute('text', `color: ${this.data.textColor};`);
        this.statusBoard.setAttribute('material', 'side: double;');
        this.el.appendChild(this.statusBoard);
    },

    updateGameStatus() {
        const whiteReady = this.state.players.white.pieces.length > 0;
        const blackReady = this.state.players.black.pieces.length > 0;
        const message = (whiteReady && blackReady) ? this.getGameStatus() : this.getOpenStatus(whiteReady, blackReady);
        this.statusBoard.setAttribute('text', `value: ${message}`);
    },

    getGameStatus() {
        let message = '';
        const inCheck = this.chessEngine.in_check();
        const inCheckmate = this.chessEngine.in_checkmate();
        const inDraw = this.chessEngine.in_draw();
        const inStalemate = this.chessEngine.in_stalemate();
        if (inDraw || inStalemate) {
            message = (inDraw) ? 'Game over: draw.' : 'Game over: stalemate.';
        } else {
            const color = (this.chessEngine.turn() === 'w') ? 'White' : 'Black';
            message = color;
            message += (inCheck) ? ' (in check)' : '';
            message += (inCheckmate) ? ' checkmated.' : ' to move.';
        }
        return message;
    },

    getOpenStatus(whiteReady, blackReady) {
        let message = 'Chess board is currently open.';
        if (!whiteReady && !blackReady) {
            message += ' Both colors are';
        } else {
            message += (!whiteReady) ? ' White is' : ' Black is';
        }
        message += ' available to play.';
        return message;
    },

    tick() {
        this.updateGameStatus();
    }
  });
  