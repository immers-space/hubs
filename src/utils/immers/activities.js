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
    return inbox.orderedItems.filter(activity => activity.type === "Create").map(Activities.ActivityAsChat);
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

  note(content, to, isPublic, summary) {
    const obj = {
      content,
      type: "Note",
      attributedTo: this.actor.id,
      context: this.place,
      to: [this.actor.followers, ...to]
    };
    if (summary) {
      obj.summary = summary;
    }
    if (isPublic) {
      obj.to.push(Activities.PublicAddress);
    }
    return this.postActivity(obj);
  }

  image(url, to, isPublic, summary) {
    const obj = {
      url,
      type: "Image",
      attributedTo: this.actor.id,
      context: this.place,
      to: [this.actor.followers, ...to]
    };
    if (summary) {
      obj.summary = summary;
    }
    if (isPublic) {
      obj.to.push(Activities.PublicAddress);
    }
    return this.postActivity(obj);
  }

  video(url, to, isPublic, summary) {
    const obj = {
      url,
      type: "Video",
      attributedTo: this.actor.id,
      context: this.place,
      to: [this.actor.followers, ...to]
    };
    if (summary) {
      obj.summary = summary;
    }
    if (isPublic) {
      obj.to.push(Activities.PublicAddress);
    }
    return this.postActivity(obj);
  }

  static ActivityAsChat(activity) {
    const message = {
      isImmersFeed: true,
      sent: false,
      context: activity.object.context,
      timestamp: new Date(activity.published).getTime(),
      name: activity.actor.name,
      sessionId: activity.actor.id,
      icon: activity.actor.icon,
      immer: new URL(activity.actor.id).hostname
    };
    switch (activity.object.type) {
      case "Note":
        message.type = "chat";
        message.body = activity.object.content;
        break;
      case "Image":
        message.type = "photo";
        message.body = { src: activity.object.url };
        break;
      case "Video":
        message.type = "video";
        message.body = { src: activity.object.url };
        break;
    }
    return message;
  }
}
