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
    this.nextOutboxPage = null;
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
    let col;
    if (this.nextInboxPage === null) {
      col = await this.getObject(this.actor.inbox);
      if (!col.orderedItems && col.first) {
        col = await this.getObject(col.first);
      }
      this.nextInboxPage = col.next;
    } else if (this.nextInboxPage) {
      col = await this.getObject(this.nextInboxPage);
      this.nextInboxPage = col.next;
    }
    return col;
  }

  async outbox() {
    let col;
    if (this.nextOutboxPage === null) {
      col = await this.getObject(this.actor.outbox);
      if (!col.orderedItems && col.first) {
        col = await this.getObject(col.first);
      }
      this.nextOutboxPage = col.next;
    } else if (this.nextOutboxPage) {
      col = await this.getObject(this.nextOutboxPage);
      this.nextOutboxPage = col.next;
    }
    return col;
  }

  async inboxAsChat() {
    const inbox = await this.inbox();
    if (!inbox?.orderedItems) {
      return [];
    }
    return inbox.orderedItems.filter(activity => activity.type === "Create").map(act => Activities.ActivityAsChat(act));
  }

  async outboxAsChat() {
    const outbox = await this.outbox();
    if (!outbox?.orderedItems) {
      return [];
    }
    return outbox.orderedItems
      .filter(activity => activity.type === "Create")
      .map(act => Activities.ActivityAsChat(act, true));
  }

  async feedAsChat() {
    const messages = (await this.inboxAsChat()).concat(await this.outboxAsChat());
    return {
      messages,
      more: this.nextOutboxPage || this.nextInboxPage
    };
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

  static ActivityAsChat(activity, outbox = false) {
    const message = {
      isImmersFeed: true,
      sent: outbox,
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
