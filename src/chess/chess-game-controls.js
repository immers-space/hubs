AFRAME.registerComponent("chess-game-controls", {
  init() {
    this.el.setAttribute("hover-menu", {
      template: "#chess-game-control-hover-menu",
      isFlat: true
    });
    this.el.classList.add("interactable");
    this.el.setAttribute("body-helper", "type: static; mass: 1; collisionFilterGroup: 1; collisionFilterMask: 1;");
    this.el.setAttribute("is-remote-hover-target", true);
    this.el.setAttribute("tags", "isStatic: true; togglesHoveredActionSet: true; inspectable: true;");
  }
});

AFRAME.registerComponent("chess-play-white-button", {
  onClick() {
    const detail = { color: "white" };
    this.el.sceneEl.emit("chess:playAs", detail);
  },
  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
  },
  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
  }
});

AFRAME.registerComponent("chess-play-black-button", {
  onClick() {
    const detail = { color: "black" };
    this.el.sceneEl.emit("chess:playAs", detail);
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
    t.setAttribute("id", "chess-game-control-hover-menu");
    t.innerHTML = `<a-entity class="ui interactable-ui hover-container" visible="false" billboard>
        <a-entity mixin="rounded-text-action-button ui" slice9="width: 0.75" is-remote-hover-target tags="singleActionButton: true; isHoverMenuChild: true;" chess-play-white-button position="0 0.15 0.5">
            <a-entity text="value:Play White; width:1.5; align:center;" text-raycast-hack position="0 0 0.05"></a-entity>
        </a-entity>
        <a-entity mixin="rounded-text-action-button ui" slice9="width: 0.75" is-remote-hover-target tags="singleActionButton: true; isHoverMenuChild: true;" chess-play-black-button position="0 -0.15 0.5">
            <a-entity text="value:Play Black; width:1.5; align:center;" text-raycast-hack position="0 0 0.05"></a-entity>
        </a-entity>
      </a-entity>`;
    document.querySelector("a-assets").appendChild(t);
  },
  { once: true }
);
