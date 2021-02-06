import { handleExitTo2DInterstitial } from "../../utils/vr-interstitial";
import { listenForMonetization, unlistenForMonetization } from "./utils";

// inject the hover menu template so we don't have to alter hub.html
document.addEventListener(
  "DOMContentLoaded",
  () => {
    const t = document.createElement("template");
    t.setAttribute("id", "monetization-required-hover-menu");
    t.innerHTML = `<a-entity class="ui interactable-ui hover-container" visible="false">
      <a-entity mixin="rounded-text-action-button ui" slice9="width: 0.75" is-remote-hover-target tags="singleActionButton: true; isHoverMenuChild: true;" monetization-required-button position="0 -0.03 0.001">
          <a-entity text="value:payment required; width:1.5; align:center;" text-raycast-hack position="0 0 0.02"></a-entity>
      </a-entity>
    </a-entity>`;
    document.querySelector("a-assets").appendChild(t);
  },
  { once: true }
);

AFRAME.registerComponent("monetization-required", {
  init() {
    this.el.setAttribute("hover-menu", {
      template: "#monetization-required-hover-menu",
      isFlat: true
    });
    this.el.classList.add("interactable");
    this.el.setAttribute("body-helper", "type: static; mass: 1; collisionFilterGroup: 1; collisionFilterMask: 1;");
    this.el.setAttribute("is-remote-hover-target", true);
    this.el.setAttribute("tags", "isStatic: true; togglesHoveredActionSet: true; inspectable: true;");
  }
});

AFRAME.registerComponent("monetization-required-button", {
  init() {
    this.onMonetizationStart = this.onMonetizationStart.bind(this);
    this.onMonetizationStop = this.onMonetizationStop.bind(this);
    this.label = this.el.querySelector("[text]");
    this.monetized = false;
    this.onClick = async () => {
      if (this.monetized) {
        return;
      }
      await handleExitTo2DInterstitial(false, () => {}, true);
      window.open("https://web.immers.space/monetization-required/");
    };
  },
  play() {
    listenForMonetization(this.el, this.onMonetizationStart, this.onMonetizationStop);
    this.el.object3D.addEventListener("interact", this.onClick);
  },

  pause() {
    unlistenForMonetization(this.el, this.onMonetizationStart, this.onMonetizationStop);
    this.el.object3D.removeEventListener("interact", this.onClick);
  },
  onMonetizationStart() {
    this.monetized = true;
    this.label.setAttribute("text", "value", "thanks for paying!");
  },
  onMonetizationStop() {
    this.monetized = false;
    this.label.setAttribute("text", "value", "payment required");
  }
});
