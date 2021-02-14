AFRAME.registerComponent("chess-score-pad", {
    schema: {
    },
  
    init() {
        this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);
        this.chessEngine = this.el.sceneEl.systems['chess-arbiter'].chessEngine;
        window.NAF.connection.subscribeToDataChannel("chess::sync-move", (_, dataType, data) => {
            this.updateScorePad();
        });
        // text="align: center; width: 6;
        // value: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam"
        // <a-text mixin="text" font="kelsonsans" position="3 0 0" wrap-count="20"></a-text>
        console.log('>>> init: chess-score-pad')
        this.pad = document.createElement('a-plane');
        this.pad.setAttribute("color", '#ccc');
        this.pad.setAttribute("width", '2');
        this.pad.setAttribute("height", '3');
        this.pad.setAttribute('text', 'color: #fff; ');
        this.pad.setAttribute('material', 'side: double;');
        this.el.appendChild(this.pad);
    },

    updateScorePad() {
        const history = this.chessEngine.history();
        // console.log('>>> chess-score-pad: history: ', history);
        let notation = '';
        for (let i = 0; i < history.length; i++) {
            notation += `${history[i]} \n`;
        }
        this.pad.setAttribute('text', `value: ${notation}`);

    },

    tick() {
        this.updateScorePad();
    }

  });
  