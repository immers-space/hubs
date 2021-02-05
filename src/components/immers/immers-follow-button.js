/**
 * Registers a click handler publishes a follow request
 * @namespace immers
 * @component immers-follow-button
 */
AFRAME.registerComponent("immers-follow-button", {
  init() {
    NAF.utils.getNetworkedEntity(this.el).then(networkedEl => {
      this.playerEl = networkedEl;
      this.playerEl.addEventListener("stateadded", this.onState);
      if (this.playerEl.is("friend")) {
        this.setFriend();
      }
    });
    this.textEl = this.el.querySelector("[text]");
    this.onClick = () => {
      this.follow(this.playerEl.components["player-info"].data.immersId);
    };
    this.onState = event => {
      if (event.detail === "friend") {
        this.setFriend();
      }
    };
  },

  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
    if (this.playerEl) {
      this.playerEl.addEventListener("stateadded", this.onState);
    }
  },

  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
    if (this.playerEl) {
      this.playerEl.removeEventListener("stateadded", this.onState);
    }
  },

  follow(targetId) {
    if (!this.playerEl.is("friend")) {
      this.el.emit("immers-follow", targetId);
      this.textEl.setAttribute("text", "value", "Pending");
    }
  },

  setFriend() {
    this.textEl.setAttribute("text", "value", "Unfollow");
  }
});
