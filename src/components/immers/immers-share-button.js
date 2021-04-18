import immersMessageDispatch from "../../utils/immers/immers-message-dispatch";

AFRAME.registerComponent("immers-share-button", {
  schema: { type: "string", oneOf: ["public", "friends", "local"], default: "public" },
  init() {
    this.textEl = this.el.querySelector("[text]");
    NAF.utils
      .getNetworkedEntity(this.el)
      .then(networkedEl => {
        this.targetEl = networkedEl;
      })
      .catch(() => {
        // Non-networked, do not handle for now, and hide button.
        this.el.object3D.visible = false;
      });

    this.onClick = () => {
      if (this.shared) {
        return;
      }
      const { src, contentSubtype } = this.targetEl.components["media-loader"].data;
      immersMessageDispatch.dispatch({
        type: contentSubtype.split(/[-/ ]/)[0],
        body: { src },
        audience: this.data
      });
      this.shared = true;
      this.textEl.setAttribute("text", "value", "shared");
    };
  },

  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
  },

  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
  }
});
