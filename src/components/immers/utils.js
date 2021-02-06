export function listenForMonetization (el, onMonetizationStart, onMonetizationStop) {
  el.sceneEl.addEventListener("immers-monetization-started", onMonetizationStart);
  el.sceneEl.addEventListener("immers-monetization-stopped", onMonetizationStop);
  // listen on self for monetization-networked events
  el.addEventListener("immers-monetization-started", onMonetizationStart);
  el.addEventListener("immers-monetization-stopped", onMonetizationStop);

}

export function unlistenForMonetization(el, onMonetizationStart, onMonetizationStop) {
  el.sceneEl.removeEventListener("immers-monetization-started", onMonetizationStart);
  el.sceneEl.removeEventListener("immers-monetization-stopped", onMonetizationStop);
  el.removeEventListener("immers-monetization-started", onMonetizationStart);
  el.removeEventListener("immers-monetization-stopped", onMonetizationStop);
}
