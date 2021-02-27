AFRAME.registerComponent("chess-board", {
  schema: {
    squareSize: { default: 0.25 },
    hideBoard: { default: false },
    wireframeBoard: { default: false },
    yCorrections: { default: "0 0 0 0 0 0" /* k q b n r p */ },
    invertKnights: { default: true },
    preventThrowing: { default: true }
  },

  update() {
    while (this.el.firstChild) {
      this.el.removeChild(this.el.firstChild);
    }
    this.buildBoard();
  },

  buildBoard() {
    let offset = 0;
    const ranks = ["a", "b", "c", "d", "e", "f", "g", "h"];
    for (let i = 0, ranksLen = ranks.length; i < ranksLen; i++) {
      const altColor = i % 2 !== 0;
      const rank = this.buildRank(ranks[i], offset, altColor);
      this.el.appendChild(rank);
      offset = offset + parseFloat(this.data.squareSize);
    }
  },

  buildRank(rank, offset, altColor) {
    offset = offset || 0;
    const files = [1, 2, 3, 4, 5, 6, 7, 8];
    const rankContainer = document.createElement("a-entity");
    let z = 0;
    for (let i = 0, filesLen = files.length; i < filesLen; i++) {
      const position = offset + " " + this.data.squareSize + " " + z;
      const box = this.buildSquare(i, position, altColor, rank);
      rankContainer.appendChild(box);
      z = z + parseFloat(this.data.squareSize);
    }
    rankContainer.setAttribute("id", rank);
    return rankContainer;
  },

  buildSquare(index, position, altColor, rank) {
    const box = document.createElement("a-box");
    box.setAttribute("position", position);
    box.setAttribute("height", this.data.squareSize);
    box.setAttribute("width", this.data.squareSize);
    box.setAttribute("depth", this.data.squareSize);
    box.setAttribute("square", rank + (index + 1));
    box.setAttribute("rank", rank);
    box.setAttribute("file", index + 1);
    this.applyStyle(box, altColor, index);
    return box;
  },

  applyStyle(box, altColor, index) {
    if (this.data.wireframeBoard) {
      box.setAttribute("wireframe", "true");
    } else if (this.data.hideBoard) {
      box.setAttribute("material", "transparent: true; opacity: 0;");
    } else if (altColor) {
      box.setAttribute("color", index % 2 === 0 ? "black" : "white");
    } else {
      box.setAttribute("color", index % 2 === 0 ? "white" : "black");
    }
  }
});
