import { listenForMonetization, unlistenForMonetization } from "./utils";

AFRAME.registerComponent("monetization-visible", {
  init() {
    this.onMonetizationStart = this.onMonetizationStart.bind(this);
    this.onMonetizationStop = this.onMonetizationStop.bind(this);
  },
  play() {
    listenForMonetization(this.el, this.onMonetizationStart, this.onMonetizationStop);
  },
  pause() {
    unlistenForMonetization(this.el, this.onMonetizationStart, this.onMonetizationStop);
  },
  onMonetizationStart() {
    this.el.setAttribute("visible", true);
  },
  onMonetizationStop() {
    this.el.setAttribute("visible", false);
  }
});
