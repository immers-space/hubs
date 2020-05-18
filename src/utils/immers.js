import io from "socket.io-client";
import configs from "./configs";
const localImmer = configs.IMMERS_SERVER;
let homeImmer;
let place;
let token;

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
  if (IRI.startsWith(localImmer) || IRI.startsWith(homeImmer)) {
    const headers = { Accept: "application/activity+json" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
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

export async function getActor() {
  const response = await window.fetch(`${homeImmer}/auth/me`, {
    headers: {
      Accept: "application/activity+json",
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export function postActivity(outbox, activity) {
  return window.fetch(outbox, {
    method: "POST",
    headers: {
      "Content-Type": "application/activity+json",
      Authorization: `Bearer ${token}`
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
      Accept: "application/activity+json",
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error("Unable to fech friends");
  }
  return response.json();
}

// perform oauth flow to get access token for local or remote user
export async function auth(store) {
  const loc = new URL(window.location);
  const params = loc.searchParams;
  const hashParams = new URLSearchParams(loc.hash.substring(1));
  const hubUri = new URL(window.location);
  hubUri.seach = new URLSearchParams({ hub_id: params.get("hub_id") }).toString();
  hubUri.hash = "";
  place = await getObject(`${localImmer}/o/immer`);
  place.url = hubUri; // include room id

  if (hashParams.has("access_token")) {
    // record user's home server in case redirected during auth
    let home;
    try {
      home = new URL(document.referrer);
      home = `${home.protocol}//${home.host}`;
    } catch (ignore) {
      home = null;
    }
    store.update({
      immerCredentials: {
        token: hashParams.get("access_token"),
        home
      }
    });
    window.location.hash = "";
  }

  if (!store.state.immerCredentials.token) {
    const redirect = new URL(`${localImmer}/auth/authorize`);
    redirect.search = new URLSearchParams({
      client_id: place.id,
      redirect_uri: hubUri,
      response_type: "token"
    }).toString();
    window.location = redirect;
    return;
  } else {
    token = store.state.immerCredentials.token;
    homeImmer = store.state.immerCredentials.home;
  }
}
// TODO: ensure socket.profile happens even if profile cached
// TODO: arrive activity should happen earlier; on authorized connection
export async function initialize(store, scene, remountUI) {
  // immers profile
  const actorObj = await getActor();
  if (actorObj) {
    const initialAvi = store.state.profile.avatarId;
    store.update({
      profile: {
        id: actorObj.id,
        avatarId: getAvatarFromActor(actorObj) || initialAvi,
        displayName: actorObj.name,
        inbox: actorObj.inbox,
        outbox: actorObj.outbox,
        followers: actorObj.followers
      },
      activity: {
        hasChangedName: true
      }
    });
  }
  const immerSocket = io(homeImmer, {
    transportOptions: {
      polling: {
        extraHeaders: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  });
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
    const profile = store.state.profile;
    updateProfile(profile, {
      name: profile.displayName,
      attachment: [
        {
          type: "Avatar",
          content: profile.avatarId
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
    follow(store.state.profile, event.detail).catch(err => console.err("Error sending follow request:", err.message));
  });
}
