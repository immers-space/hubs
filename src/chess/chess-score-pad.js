AFRAME.registerComponent("chess-score-pad", {
  schema: {
    textColor: { default: "#fff" },
    backgroundColor: { default: "#282828" }
  },

  init() {
    this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);
    window.NAF.connection.subscribeToDataChannel("chess::sync-move", () => {
      this.updateScorePad();
    });
    const baseConfigText = `color:${this.data.textColor}; width:2.5; align:left; anchor:left; baseline:top; side:double;`;
    const baseConfigMaterial = "transparent: true; opacity: 0;";
    const baseConfigMaterialBg = `side:double; color:${this.data.backgroundColor};`;
    const baseConfigGeometry = "primitive:plane; width:1; height:2;";
    this.whiteNotation = document.createElement("a-entity");
    this.whiteNotation.setAttribute("text", baseConfigText);
    this.whiteNotation.setAttribute("material", baseConfigMaterial);
    this.whiteNotation.setAttribute("geometry", baseConfigGeometry);
    this.whiteNotation.setAttribute("position", "-0.3 0.8 0.001");
    this.el.appendChild(this.whiteNotation);
    this.whiteNotationBg = document.createElement("a-entity");
    this.whiteNotationBg.setAttribute("material", baseConfigMaterialBg);
    this.whiteNotationBg.setAttribute("geometry", baseConfigGeometry);
    this.el.appendChild(this.whiteNotationBg);
    this.blackNotation = document.createElement("a-entity");
    this.blackNotation.setAttribute("text", baseConfigText);
    this.blackNotation.setAttribute("material", baseConfigMaterial);
    this.blackNotation.setAttribute("geometry", baseConfigGeometry);
    this.blackNotation.setAttribute("position", "0.7 0.8 0.001");
    this.el.appendChild(this.blackNotation);
    this.blackNotationBg = document.createElement("a-entity");
    this.blackNotationBg.setAttribute("material", baseConfigMaterialBg);
    this.blackNotationBg.setAttribute("geometry", baseConfigGeometry);
    this.blackNotationBg.setAttribute("position", "1 0 0");
    this.el.appendChild(this.blackNotationBg);
  },

  updateScorePad() {
    const chessEngine = this.el.sceneEl.systems["chess-arbiter"].chessEngine;
    const history = chessEngine.history();
    const whiteDisplayName = this.el.sceneEl.systems.state.state.players.white.profile.displayName
      ? this.el.sceneEl.systems.state.state.players.white.profile.displayName
      : "Open";
    const blackDisplayName = this.el.sceneEl.systems.state.state.players.black.profile.displayName
      ? this.el.sceneEl.systems.state.state.players.black.profile.displayName
      : "Open";
    let whiteNotation = `White - ${whiteDisplayName}\n`;
    let blackNotation = `Black - ${blackDisplayName}\n`;
    for (let i = 0; i < history.length; i++) {
      const moveNotation = history[i];
      if (i % 2 === 0) {
        const moveNumber = i / 2 + 1;
        whiteNotation += `${moveNumber}. ${moveNotation} \n`;
      } else {
        const moveNumber = (i - 1) / 2 + 1;
        blackNotation += `${moveNumber}. ${moveNotation} \n`;
      }
    }
    this.whiteNotation.setAttribute("text", `value: ${whiteNotation}`);
    this.blackNotation.setAttribute("text", `value:${blackNotation};`);
  },

  tick() {
    this.updateScorePad();
  }
});
