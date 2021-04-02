/* Handles monetization feature-checking, api, and initialization race.
 * Immers creators can listen for events on the scene that are guaranteed to
 * occur after initial scene and entity load. Monetization status is synced to
 * the room currently via player-info. This has two limitations, 1) easy to spoof
 * and 2) doesn't sync while players are still in lobby. A better implemenation 
 * would be to extend the reticulum server to support this over hubChannel.
 * 
 * Events (emitted from scene element):
 *  immers-monetization-started - local user monetization began/resumed
 *  immers-monetization-stopped - local user monetization ceased
 *  immers-monetization-progress - local user micropayment received.
 *    detail:
 *      amount: Number, amount received on this transation
 *      totalAmoint: Number, amount received so far during this session
 *      currency: String, currency of the transation
 */
import "web-monetization-polyfill";

const monetization = {
  amountPaid: 0,
  currency: undefined,
  state: undefined
};
let localPlayer;
let hubScene;
let updateUI;

// sync player's monetization status with room via player-info component
function onMonetizationStart() {
  monetization.state = "started";
  localPlayer.setAttribute("player-info", { monetized: true });
  hubScene.emit("immers-monetization-started");
  updateUI({ isMonetized: true });
}
function onMonetizationStop() {
  monetization.state = "stopped";
  localPlayer.setAttribute("player-info", { monetized: false });
  hubScene.emit("immers-monetization-stopped");
  updateUI({ isMonetized: false });
}

// tallies total amount paid during curent session
// (no cross-session tracking is permitted)
function onMonetizationProgress(event) {
  const amount = Number.parseInt(event.detail.amount) * Math.pow(10, -event.detail.assetScale);
  if (amount) {
    monetization.amountPaid += amount;
    monetization.currency = event.detail.assetCode;
    hubScene.emit("immers-monetization-progress", {
      amount,
      totalAmount: monetization.amountPaid,
      currency: monetization.currency
    });
  }
}

function onSceneLoaded() {
  if (document.monetization.state === "started") {
    onMonetizationStart();
  } else {
    onMonetizationStop();
  }
  document.monetization.addEventListener("monetizationstart", onMonetizationStart);
  document.monetization.addEventListener("monetizationstop", onMonetizationStop);
  document.monetization.addEventListener("monetizationprogress", onMonetizationProgress);
}

// wait until scene is fully loaded to trigger monetization events so creators don't
// have to worry about whether entities are loaded
export function setupMonetization(scene, player, remountUI) {
  hubScene = scene;
  localPlayer = player;
  updateUI = remountUI;
  if (hubScene.is("loaded")) {
    onSceneLoaded();
  } else {
    hubScene.addEventListener("loading_finished", onSceneLoaded, { once: true });
  }
}
