AFRAME.registerComponent("chess-notation-controls", {
  init() {
    this.el.setAttribute("hover-menu", {
      template: "#chess-notation-control-hover-menu",
      isFlat: true
    });
    this.el.classList.add("interactable");
    this.el.setAttribute("body-helper", "type: static; mass: 1; collisionFilterGroup: 1; collisionFilterMask: 1;");
    this.el.setAttribute("is-remote-hover-target", true);
    this.el.setAttribute("tags", "isStatic: true; togglesHoveredActionSet: true; inspectable: true;");
  }
});

AFRAME.registerComponent("copy-pgn-button", {
  onClick() {
    const detail = { color: "white" };
    this.el.sceneEl.emit("chess:copyPGN", detail);
  },
  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
  },
  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
  }
});

AFRAME.registerComponent("copy-fen-button", {
  onClick() {
    const detail = { color: "black" };
    this.el.sceneEl.emit("chess:copyFEN", detail);
  },
  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
  },
  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
  }
});

// inject the hover menu template so we don't have to alter hub.html
document.addEventListener(
  "DOMContentLoaded",
  () => {
    const t = document.createElement("template");
    t.setAttribute("id", "chess-notation-control-hover-menu");
    t.innerHTML = `<a-entity class="ui interactable-ui hover-container" visible="false" position="0.5 -0.5 0">
        <a-entity mixin="rounded-text-action-button ui" slice9="width: 0.75" is-remote-hover-target tags="singleActionButton: true; isHoverMenuChild: true;" copy-pgn-button position="0 0.15 0.1">
            <a-entity text="value:Copy PGN; width:1.5; align:center;" text-raycast-hack position="0 0 0.05"></a-entity>
        </a-entity>
        <a-entity mixin="rounded-text-action-button ui" slice9="width: 0.75" is-remote-hover-target tags="singleActionButton: true; isHoverMenuChild: true;" copy-fen-button position="0 -0.15 0.1">
            <a-entity text="value:Copy FEN; width:1.5; align:center;" text-raycast-hack position="0 0 0.05"></a-entity>
        </a-entity>
      </a-entity>`;
    document.querySelector("a-assets").appendChild(t);
  },
  { once: true }
);
