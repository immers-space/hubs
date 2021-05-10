/**
 * Registers a click handler and invokes the block method on the NAF adapter for the owner associated with its entity.
 * @namespace network
 * @component block-button
 */
AFRAME.registerComponent("block-button", {
  init() {
    this.textEl = this.el.querySelector("[text]");
    this.onClick = () => {
      this.block(this.owner);
      this.el.emit("immers-block", { clientId: this.owner });
    };
    this.onScopeChange = () => {
      if (this.el.sceneEl.states.includes("immers-scope-addBlocks")) {
        this.textEl.setAttribute("text", "value", "Block");
      } else {
        this.textEl.setAttribute("text", "value", "Hide");
      }
    };
    NAF.utils.getNetworkedEntity(this.el).then(networkedEl => {
      this.owner = networkedEl.components.networked.data.owner;
    });
    this.onScopeChange();
  },

  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
    this.el.sceneEl.addEventListener("stateadded", this.onScopeChange);
    this.el.sceneEl.addEventListener("stateremoved", this.onScopeChange);
  },

  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
    this.el.sceneEl.removeEventListener("stateremoved", this.onScopeChange);
  },

  block(clientId) {
    window.APP.hubChannel.hide(clientId);
  }
});
