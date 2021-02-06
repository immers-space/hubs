AFRAME.registerSystem("spoke-tagger", {
  init() {
    this.tag = this.tag.bind(this);
    this.onMutation = this.onMutation.bind(this);

    this.mo = new MutationObserver(this.onMutation);
    this.mo.observe(this.el, { subtree: true, childList: true });
  },

  // inject components into spoke scene entities (spoke saves names as classes)
  onMutation(records) {
    for (const record of records) {
      for (const node of record.addedNodes) {
        this.tag(node);
      }
    }
  },

  tag(el) {
    if (!(el.nodeType === document.ELEMENT_NODE) || !el.classList.length) {
      return;
    }
    // spoke converts spaces in names to _ in class
    const tags = el.classList.value.split("_");
    for (const tag of tags) {
      if (!tag.startsWith("st-")) {
        continue;
      }
      el.setAttribute(tag.substring(3), "");
    }
    // recurse children of added node
    el.childNodes.forEach(this.tag);
  }
});
