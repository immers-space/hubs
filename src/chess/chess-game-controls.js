import { COLOR } from "./game-constants";

AFRAME.registerComponent("chess-game-controls", {
  init() {
    this.flushMenu = this.flushMenu.bind(this);
    const t = document.createElement("template");
    t.setAttribute("id", "chess-game-control-hover-menu");
    document.querySelector("a-assets").appendChild(t);
    this.flushMenu();
    this.addEventListeners();
  },

  remove() {
    this.removeMenu();
    document.querySelector("#chess-game-control-hover-menu").remove();
    this.removeEventListeners();
  },

  addEventListeners() {
    this.el.sceneEl.addEventListener("imPlaying", this.flushMenu);
    this.el.sceneEl.addEventListener("resetChessState", this.flushMenu);
    this.el.sceneEl.addEventListener("setPlayer", this.flushMenu);
  },

  removeEventListeners() {
    this.el.sceneEl.removeEventListener("imPlaying", this.flushMenu);
    this.el.sceneEl.removeEventListener("resetChessState", this.flushMenu);
    this.el.sceneEl.removeEventListener("setPlayer", this.flushMenu);
  },

  flushMenu() {
    this.buildMenu();
    this.removeMenu();
    this.addMenu();
  },

  addMenu() {
    this.el.setAttribute("hover-menu", {
      template: "#chess-game-control-hover-menu",
      isFlat: true
    });
    this.el.classList.add("interactable");
    this.el.setAttribute("body-helper", "type: static; mass: 1; collisionFilterGroup: 1; collisionFilterMask: 1;", true);
    this.el.setAttribute("is-remote-hover-target", true);
    this.el.setAttribute("tags", "isStatic: true; togglesHoveredActionSet: true; inspectable: true;", true);
  },

  removeMenu() {
    this.el.removeAttribute("hover-menu");
    this.el.classList.remove("interactable");
    this.el.removeAttribute("is-remote-hover-target");
    this.el.setAttribute("tags", "isStatic: true; togglesHoveredActionSet: false; inspectable: true;", true);
  },

  buildMenu() {
    const playWhiteButton = ` <a-entity mixin="rounded-text-action-button ui" slice9="width: 0.75" is-remote-hover-target tags="singleActionButton: true; isHoverMenuChild: true;" chess-play-white-button position="0 0.15 0.5">
                                <a-entity text="value:Play White; width:1.5; align:center;" text-raycast-hack position="0 0 0.05"></a-entity>
                              </a-entity>`;
    const playBlackButton = ` <a-entity mixin="rounded-text-action-button ui" slice9="width: 0.75" is-remote-hover-target tags="singleActionButton: true; isHoverMenuChild: true;" chess-play-black-button position="0 -0.15 0.5">
                                <a-entity text="value:Play Black; width:1.5; align:center;" text-raycast-hack position="0 0 0.05"></a-entity>
                              </a-entity>`;
    const resetButton = ` <a-entity mixin="rounded-text-action-button ui" slice9="width: 0.75" is-remote-hover-target tags="singleActionButton: true; isHoverMenuChild: true;" chess-reset-game-button position="0 0.15 0.5">
                            <a-entity text="value:Reset Game; width:1.5; align:center;" text-raycast-hack position="0 0 0.05"></a-entity>
                          </a-entity>`;
    const whiteTaken = this.el.sceneEl.systems.state.state.players.white.id !== null;
    const blackTaken = this.el.sceneEl.systems.state.state.players.black.id !== null;
    const imPlaying = this.el.sceneEl.systems.state.state.imPlaying;
    let menuHTML = "<a-entity class='ui interactable-ui hover-container' visible='false' billboard>";
    if (!whiteTaken && !imPlaying) menuHTML += playWhiteButton;
    if (!blackTaken && !imPlaying) menuHTML += playBlackButton;
    if (imPlaying) menuHTML += resetButton;
    menuHTML += "</a-entity>";
    document.querySelector("#chess-game-control-hover-menu").innerHTML = menuHTML;
  }

});

AFRAME.registerComponent("chess-play-white-button", {
  onClick() {
    const detail = { color: COLOR.WHITE };
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
    const detail = { color: COLOR.BLACK };
    this.el.sceneEl.emit("chess:playAs", detail);
  },
  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
  },
  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
  }
});

AFRAME.registerComponent("chess-reset-game-button", {
  onClick() {
    this.el.sceneEl.emit("chess:resetNetworkedGame");
  },
  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
  },
  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
  }
});
