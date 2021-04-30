AFRAME.registerComponent("immers-visible-if-permitted", {
  schema: {
    type: "string",
    oneOf: ["viewFriends", "postLocation", "viewPrivate", "creative", "addFriends", "addBlocks", "destructive"]
  },
  init() {
    this.updateVisibility = this.updateVisibility.bind(this);
    this.el.sceneEl.addEventListener("stateadded", this.updateVisibility);
    this.el.sceneEl.addEventListener("stateremoved", this.updateVisibility);
    this.updateVisibility();
  },
  updateVisibility() {
    this.el.object3D.visible = this.el.sceneEl.states.includes(`immers-scope-${this.data}`);
  },
  remove() {
    this.el.sceneEl.removeEventListener("stateadded", this.updateVisibility);
    this.el.sceneEl.removeEventListener("stateremoved", this.updateVisibility);
  }
});
