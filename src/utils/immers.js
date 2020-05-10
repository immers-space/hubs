import io from "socket.io-client";
import configs from "./configs";
const host = configs.IMMERS_SERVER;
let place;

export function getAvatarFromActor(actorObj) {
  if (!actorObj.attachment) {
    return null;
  }
  const attachments = Array.isArray(actorObj.attachment) ? actorObj.attachment : [actorObj.attachment];
  const avi = attachments.find(obj => obj.type === "Avatar");
  if (avi) {
    return avi.url || avi.content;
  }
  return null;
}

export async function getObject(IRI) {
  if (IRI.startsWith(host)) {
    const result = await window.fetch(IRI, {
      headers: { Accept: "application/activity+json" }
    });
    if (!result.ok) {
      throw new Error(`Object fetch error ${result.message}`);
    }
    return result.json();
  }
}

export async function getLocalActor(name) {
  const response = await window.fetch(`${host}/u/${name}`, {
    headers: {
      Accept: "application/activity+json"
    }
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function createLocalActor(name) {
  const response = await window.fetch(`${host}/u/${name}`, {
    method: "POST",
    headers: {
      Accept: ["application/activity+json"]
    }
  });
  if (!response.ok) {
    throw new Error("Error creating actor");
  }
  return response.json();
}

export function postActivity(outbox, activity) {
  return window.fetch(outbox, {
    method: "POST",
    headers: {
      "Content-Type": "application/activity+json"
    },
    body: JSON.stringify(activity)
  });
}

export function updateProfile(actorObj, update) {
  update.id = actorObj.id;
  const activity = {
    type: "Update",
    actor: actorObj.id,
    object: update,
    to: actorObj.followers
  };
  return postActivity(actorObj.outbox, activity);
}

export function follow(actorObj, targetId) {
  return postActivity(actorObj.outbox, {
    type: "Follow",
    actor: actorObj.id,
    object: targetId,
    to: targetId
  });
}

export function arrive(actorObj) {
  return postActivity(actorObj.outbox, {
    type: "Arrive",
    actor: actorObj.id,
    target: place,
    to: actorObj.followers
  });
}

export function leave(actorObj) {
  return postActivity(actorObj.outbox, {
    type: "Leave",
    actor: actorObj.id,
    target: place,
    to: actorObj.followers
  });
}

export async function getFriends(actorObj) {
  const response = await window.fetch(`${actorObj.id}/friends`, {
    headers: {
      Accept: "application/activity+json"
    }
  });
  if (!response.ok) {
    throw new Error("Unable to fech friends");
  }
  return response.json();
}

getObject(`${host}/o/immer`).then(immer => {
  place = immer;
  place.url = window.location.href; // adds room id
});

export function initialize(store, scene, remountUI) {
  const immerSocket = io(host);
  // arrive/leave activities
  scene.addEventListener(
    "entered",
    () => {
      const profile = store.state.profile;
      if (!profile.id) return;
      arrive(profile);
      immerSocket.emit("entered", {
        outbox: profile.outbox,
        // prepare a leave activity to be fired on disconnect
        leave: {
          type: "Leave",
          actor: profile.id,
          target: window.location.href,
          to: profile.followers
        }
      });
    },
    { once: true }
  );

  // friends list
  let friendsCol;
  const updateFriends = async () => {
    if (store.state.profile.id) {
      const profile = store.state.profile;
      friendsCol = await getFriends(profile);
      remountUI({ friends: friendsCol.orderedItems });
      // update follow button for new friends
      const players = window.APP.componentRegistry["player-info"];
      if (players) {
        players.forEach(infoComp => {
          if (friendsCol.orderedItems.some(act => act.actor.id === infoComp.data.immersId)) {
            infoComp.el.addState("friend");
          }
        });
      }
    }
  };
  immerSocket.on("friends-update", updateFriends);
  // profile
  const onImmersProfileChange = () => {
    immerSocket.emit("profile", store.state.profile.id);
    updateFriends();
  };
  store.addEventListener("profilechanged", onImmersProfileChange);
  scene.addEventListener("avatar_updated", () => {
    updateProfile(store.state.profile, {
      name: store.state.displayName,
      attachment: [
        {
          type: "Avatar",
          content: store.state.avatarId
        }
      ]
    }).catch(err => console.error("Error updating profile:", err.message));
  });
  // send profile id if it was cached, pull initial friends list
  onImmersProfileChange();

  // entity interactions
  scene.addEventListener("immers-id-changed", event => {
    if (!friendsCol) {
      return;
    }
    if (friendsCol.orderedItems.some(act => act.actor.id === event.detail)) {
      event.target.addState("friend");
    }
  });

  scene.addEventListener("immers-follow", event => {
    if (!event.detail) {
      return;
    }
    follow(store.state.profile, event.detail)
      .catch(err => console.err("Error sending follow request:", err.message));
  });
}

export async function signIn(handle, store) {
  const handleParts = handle.split("@");
  // todo: login to remote user's hosts
  // if (handleParts[1] !== window.location.host) {}
  let actorObj = await getLocalActor(handleParts[0]);
  if (!actorObj && !handleParts[1]) {
    actorObj = await createLocalActor(handleParts[0]);
    handle = `${handleParts[0]}@${window.location.host}`;
  }
  if (actorObj) {
    const initialAvi = store.state.profile.avatarId;
    store.update({
      profile: {
        handle,
        id: actorObj.id,
        avatarId: getAvatarFromActor(actorObj) || initialAvi,
        displayName: actorObj.name,
        inbox: actorObj.inbox,
        outbox: actorObj.outbox,
        followers: actorObj.followers
      }
    });
  }
}
