/* Simple use case for room monetization status. Certain Spoke entities are
 * shown or hiden based on whether anyone in the room is monetized.
 *
 * To use without additional client customisation, add entities or groups in Spoke
 * with the name "monetization-visible", and this
 * component will attach to it and make it invisible unless someone in the
 * room is monetized.
 *
 * For elements created via custom client extension,
 * give them the "monetization-visible" component to enable to same behavior.
 */
const players = {};

AFRAME.registerSystem("monetization-visible", {
  init() {
    this.mo = new MutationObserver(this.onMutation);
    this.mo.observe(this.el, { subtree: true, childList: true });
    this.onMonetizationChange = this.onMonetizationChange.bind(this);
    this.entities = [];
    this.el.addEventListener("immers-player-monetization", this.onMonetizationChange);
  },
  play() {
    this.el.addEventListener("immers-player-monetization", this.onMonetizationChange);
  },
  pause() {
    this.el.removeEventListener("immers-player-monetization", this.onMonetizationChange);
  },
  registerMe(el) {
    this.entities.push(el);
  },

  unregisterMe(el) {
    const index = this.entities.indexOf(el);
    this.entities.splice(index, 1);
  },
  // inject component into spoke scene entities (spoke saves names as classes)
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
  },
  onMonetizationChange(event) {
    players[event.detail.immersId] = event.detail.monetized;
    const numMonetized = Object.values(players).reduce((a, b) => a + b, 0);
    for (const entity of this.entities) {
      entity.components["monetization-visible"].checkMonetization(numMonetized);
    }
  }
});

AFRAME.registerComponent("monetization-visible", {
  schema: {
    monetized: { type: "boolean", default: false }
  },
  checkMonetization(count) {
    this.el.setAttribute("visible", count > 0);
  },
  init() {
    this.el.setAttribute("visible", false);
    this.system.registerMe(this.el);
  },
  remove() {
    this.system.unregisterMe(this.el);
  }
});
