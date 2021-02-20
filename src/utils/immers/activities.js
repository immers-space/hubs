export default class Activities {
  static JSONLDMime = "application/activity+json";
  static PublicAddress = "as:Public";
  constructor(localImmer) {
    this.localImmer = localImmer;
    this.homeImmer = null;
    this.token = null;
    this.actor = null;
    this.place = null;
    this.nextInboxPage = null;
  }

  trustedIRI(IRI) {
    return IRI.startsWith(this.localImmer) || IRI.startsWith(this.homeImmer);
  }

  async getObject(IRI) {
    if (this.trustedIRI(IRI)) {
      const headers = { Accept: Activities.JSONLDMime };
      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }
      const result = await window.fetch(IRI, { headers });
      if (!result.ok) {
        throw new Error(`Object fetch error ${result.message}`);
      }
      return result.json();
    } else {
      throw new Error("Object fetch proxy not implemented");
    }
  }

  async inbox() {
    const col = await this.getObject(this.actor.inbox);
    if (!col.orderedItems && col.first) {
      return this.getObject(col.first);
    }
    return col;
  }

  async inboxAsChat() {
    const inbox = await this.inbox();
    if (!inbox.orderedItems) {
      return [];
    }
    return inbox.orderedItems.filter(activity => activity.object?.content).map(activity => ({
      isImmersFeed: true,
      sent: false,
      type: "chat",
      body: activity.object.content,
      context: activity.object.context,
      timestamp: new Date(activity.published).getTime(),
      name: activity.actor.name,
      sessionId: activity.actor.id,
      icon: activity.actor.icon,
      immer: new URL(activity.actor.id).hostname
    }));
  }

  postActivity(activity) {
    if (!this.trustedIRI(this.actor.outbox)) {
      throw new Error("Inavlid outbox address");
    }
    return window.fetch(this.actor.outbox, {
      method: "POST",
      headers: {
        "Content-Type": Activities.JSONLDMime,
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify(activity)
    });
  }

  note(content, isPublic, summary) {
    const obj = {
      content,
      type: "Note",
      attributedTo: this.actor.id,
      context: this.place,
      to: [this.actor.followers]
    };
    if (summary) {
      obj.summary = summary;
    }
    if (isPublic) {
      obj.to.push(Activities.PublicAddress);
    }
    return this.postActivity(obj);
  }
}
