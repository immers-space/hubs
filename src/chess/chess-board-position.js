AFRAME.registerComponent("chess-board-position", {
  schema: {},
  init() {
    this.addChessGame = this.addChessGame.bind(this);
    this.el.sceneEl.systems["chess-arbiter"].registerBoardPosition(this);
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
    game.setAttribute("chess-game", `squareSize: ${squareSize}; hideBoard: true;`);
    game.setAttribute("networked", "template: #template-waypoint-avatar;");
    const newPos = bbox.min;
    newPos.y = newPos.y - squareSize - squareSize / 4;
    newPos.x = newPos.x + squareSize / 2;
    newPos.z = newPos.z + squareSize / 2;
    // ensure world matrix immediately available for player teleport
    game.object3D.position.copy(newPos);
    game.object3D.updateMatrixWorld(true);
    this.el.sceneEl.appendChild(game);
    return new Promise(resolve => {
      game.addEventListener("board-loaded", () => resolve(game), { once: true });
    });
  }
});
