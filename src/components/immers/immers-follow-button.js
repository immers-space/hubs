/**
 * Registers a click handler publishes a follow request
 * @namespace immers
 * @component immers-follow-button
 */
AFRAME.registerComponent("immers-follow-button", {
  schema: { relation: { type: "string", default: "none" } },
  init() {
    NAF.utils.getNetworkedEntity(this.el).then(networkedEl => {
      this.playerEl = networkedEl;
      this.playerEl.addEventListener("stateadded", this.onState);
      if (this.playerEl.is("immers-follow-friend")) {
        this.el.setAttribute("immers-follow-button", { relation: "friend" });
      }
    });
    this.textEl = this.el.querySelector("[text]");
    // avoid accidental double clicks
    let lastClickTime = 0;
    this.onClick = () => {
      const now = Date.now();
      if (now - lastClickTime < 500) {
        return;
      }
      lastClickTime = now;
      switch (this.data.relation) {
        case "none":
          this.action("immers-follow", "pending");
          break;
        case "request":
          this.action("immers-follow-accept", "friend");
          break;
        case "friend":
          // TODO: unfriend
          // this.action("immers-follow-reject", "none");
          break;
      }
    };
    this.onState = event => {
      const friendState = event.detail.split("immers-follow-")[1];
      if (friendState) {
        this.el.setAttribute("immers-follow-button", { relation: friendState });
      }
    };
  },

  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
    if (this.playerEl) {
      this.playerEl.addEventListener("stateadded", this.onState);
    }
  },

  update() {
    let newText;
    switch (this.data.relation) {
      case "request":
        newText = "Accept friend";
        break;
      case "pending":
        newText = "Reqest sent";
        break;
      case "friend":
        newText = "Unfriend";
        break;
      default:
        newText = "Add friend";
    }
    this.textEl.setAttribute("text", "value", newText);
  },

  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
    if (this.playerEl) {
      this.playerEl.removeEventListener("stateadded", this.onState);
    }
  },

  action(eventName, newRelation) {
    const targetId = this.playerEl.getAttribute("player-info").immersId;
    this.el.emit(eventName, targetId);
    this.el.setAttribute("immers-follow-button", { relation: newRelation });
  }
});
