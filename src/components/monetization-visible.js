AFRAME.registerSystem("monetization-visible-system", {
  init() {
    this.mo = new MutationObserver(this.onMutation);
    this.mo.observe(this.el, { subtree: true, childList: true });
  },
  onMutation(records) {
    const mv = "monetization-visible";
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!node.nodeType === document.ELEMENT_NODE) continue;
        if (node.classList.contains(mv)) node.setAttribute(mv, {});
        for (const descendant of node.querySelectorAll(`.${mv}`)) {
          descendant.setAttribute(mv, {});
        }
      }
    }
  }
});

AFRAME.registerComponent("monetization-visible", {
  schema: {
    monetized: { type: "boolean", default: false }
  },
  init() {
    this.monetize = this.monetize.bind(this);
    this.unmonetize = this.unmonetize.bind(this);
  },
  play() {
    this.el.sceneEl.addEventListener("monetizationstarted", this.monetize);
    this.el.sceneEl.addEventListener("monetizationstopped", this.unmonetize);
    this.el.setAttribute("visible", this.monetized);
  },
  pause() {
    this.el.sceneEl.removeEventListener("monetizationstarted", this.monetize);
    this.el.sceneEl.removeEventListener("monetizationstopped", this.unmonetize);
    this.el.setAttribute("visible", this.monetized);
  },
  monetize() {
    this.monetized = true;
    this.el.setAttribute("visible", true);
  },
  unmonetize() {
    this.monetized = false;
    this.el.setAttribute("visible", false);
  }
});
