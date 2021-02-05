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

AFRAME.registerSystem("monetization-networked", {
  init() {
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
  onMonetizationChange(event) {
    players[event.detail.immersId] = event.detail.monetized;
    const numMonetized = Object.values(players).reduce((a, b) => a + b, 0);
    for (const entity of this.entities) {
      entity.components["monetization-networked"].shareMonetization(numMonetized);
    }
  }
});

AFRAME.registerComponent("monetization-networked", {
  shareMonetization(count) {
    const monetized = !!count;
    if (monetized !== this.lastMonetized) {
      this.el.emit(`immers-monetization-${monetized ? "started" : "stopped"}`, undefined, false);
    }
  },
  init() {
    this.lastMonetized = false;
    this.system.registerMe(this.el);
  },
  remove() {
    this.system.unregisterMe(this.el);
  }
});
