AFRAME.registerComponent("chess-board-position", {
  schema: {},
  init() {
    this.addChessGame = this.addChessGame.bind(this);
    this.networkCheck = this.networkCheck.bind(this);
    this.networkCheck();
  },
  networkCheck() {
    const entitiesObj = NAF.connection.entities.entities;
    const entitiesArray = Object.keys(entitiesObj).map(key => entitiesObj[key]);
    const sanityCheck = entitiesArray.filter(el => el.id === "avatar-rig").length === 1;
    if (window.NAF.connection.isConnected() && sanityCheck) {
      const gameRequired = entitiesArray.filter(el => el.hasAttribute("chess-game")).length === 0;
      if (gameRequired) {
        this.addChessGame();
      }
    } else {
      setTimeout(() => {
        this.networkCheck();
      }, 1000);
    }
  },
  addChessGame() {
    const bbox = new THREE.Box3();
    bbox.setFromObject(this.el.object3D);
    const size = new THREE.Vector3();
    const pos = new THREE.Vector3();
    bbox.center(pos);
    bbox.size(size);
    const squareSize = size.x / 8;
    const game = document.createElement("a-entity");
    game.setAttribute(
      "chess-game",
      `squareSize: ${squareSize}; hideBoard: true; wireframeBoard:true; teleportPlayers: true;`
    );
    game.setAttribute("networked", "template: #template-waypoint-avatar;");
    let newPos = bbox.min;
    newPos.y = newPos.y - squareSize - squareSize / 4;
    newPos.x = newPos.x + squareSize / 2;
    newPos.z = newPos.z + squareSize / 2;
    game.setAttribute("position", newPos);
    this.el.sceneEl.appendChild(game);
  }
});
