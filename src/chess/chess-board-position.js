AFRAME.registerComponent("chess-board-position", {
  schema: {},
  update() {
    const bbox = new THREE.Box3();
    bbox.setFromObject(this.el.object3D);
    const size = new THREE.Vector3();
    const pos = new THREE.Vector3();
    bbox.center(pos);
    bbox.size(size);
    const game = document.createElement("a-entity");
    game.setAttribute(
      "chess-game",
      `squareSize: ${size.x /
        8}; hideBoard: false; yCorrections: 0.25 -0.5 -1.15 -1.3 -2.2 -2.5; teleportPlayers: true;`
    );
    game.setAttribute("networked", "template: #template-waypoint-avatar;");
    game.setAttribute("position", v3);
    this.el.sceneEl.appendChild(game);
  }
});
