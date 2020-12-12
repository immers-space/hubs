import io from "socket.io-client";
import configs from "./configs";
import { fetchAvatar } from "./avatar-utils";
import { setupMonetization } from "./immers/monetization";
const localImmer = configs.IMMERS_SERVER;
console.log("immers.space client v0.3.0");
// avoid race between auth and initialize code
let resolveAuth;
let rejectAuth;
const authPromise = new Promise((resolve, reject) => {
  resolveAuth = resolve;
  rejectAuth = reject;
});
let homeImmer;
let place;
let token;
let hubScene;
let localPlayer;

export function getAvatarFromActor(actorObj) {
  if (!actorObj.attachment) {
    return null;
  }
  const attachments = Array.isArray(actorObj.attachment) ? actorObj.attachment : [actorObj.attachment];
  const avi = attachments.find(obj => obj.type === "Avatar");
  if (avi) {
    return avi.url;
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
    throw new Error(`Error fetching actor ${response.status} ${response.statusText}`);
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
  // copy of URL used for sharing/authorization request
  const hubUri = new URL(window.location);
  const hashParams = new URLSearchParams(hubUri.hash.substring(1));
  const searchParams = new URLSearchParams(hubUri.search);
  let handle;

  // don't share your token!
  hubUri.hash = "";
  // users handle may be passed from previous immer
  if (searchParams.has("me")) {
    handle = searchParams.get("me");
    // remove your handle before sharing with friends
    searchParams.delete("me");
    hubUri.search = searchParams.toString();
  }
  place = await getObject(`${localImmer}/o/immer`);
  place.url = hubUri; // include room id

  if (hashParams.has("access_token")) {
    // not safe to update store here, will be saved later in initialize()
    token = hashParams.get("access_token");
    homeImmer = hashParams.get("issuer");
    window.location.hash = "";
  } else {
    token = store.state.credentials.immerToken;
    homeImmer = store.state.credentials.immerHome;
  }

  const redirectToAuth = () => {
    // send to token endpoint at local immer, it handles
    // detecting remote users and sending them on to their home to login
    const redirect = new URL(`${localImmer}/auth/authorize`);
    const redirectParams = new URLSearchParams({
      client_id: place.id,
      // hub link with room id
      redirect_uri: hubUri,
      response_type: "token"
    });
    if (handle) {
      // pass to auth to prefill login form
      redirectParams.set("me", handle);
    }
    redirect.search = redirectParams.toString();
    // hide error messages caused by interrupting loading to redirect
    try {
      document.getElementById("ui-root").style.display = "none";
    } catch (ignore) {
      /* ignore */
    }
    window.location = redirect;
  };

  // will cause re-auth when expired/invalid tokens are rejected
  authPromise.catch(redirectToAuth);
  // check token validity & get actor object
  if (!token) {
    return redirectToAuth();
  }
  try {
    resolveAuth(await getActor());
  } catch (err) {
    rejectAuth(err);
  }
}

export async function initialize(store, scene, remountUI) {
  hubScene = scene;
  localPlayer = document.getElementById("avatar-rig");
  // immers profile
  const actorObj = await authPromise;
  const initialAvi = store.state.profile.avatarId;
  store.update({
    profile: {
      id: actorObj.id,
      avatarId: getAvatarFromActor(actorObj) || initialAvi,
      displayName: actorObj.name,
      handle: `${actorObj.preferredUsername}[${new URL(homeImmer).host}]`,
      inbox: actorObj.inbox,
      outbox: actorObj.outbox,
      followers: actorObj.followers
    },
    credentials: {
      immerToken: token,
      // record user's home server in case redirected during auth
      immerHome: homeImmer
    }
  });
  const immerSocket = io(homeImmer, {
    transportOptions: {
      polling: {
        extraHeaders: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  });
  let hasArrived;
  immerSocket.on("connect", () => {
    if (hasArrived) {
      return;
    }
    hasArrived = true;
    arrive(actorObj);
    immerSocket.emit("entered", {
      // prepare a leave activity to be fired on disconnect
      outbox: actorObj.outbox,
      authorization: `Bearer ${token}`,
      leave: {
        type: "Leave",
        actor: actorObj.id,
        target: window.location.href,
        to: actorObj.followers
      }
    });
  });

  // friends list
  let friendsCol;
  const updateFriends = async () => {
    if (store.state.profile.id) {
      const profile = store.state.profile;
      friendsCol = await getFriends(profile);
      remountUI({ friends: friendsCol.orderedItems, handle: profile.handle });
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
  updateFriends();
  immerSocket.on("friends-update", updateFriends);

  scene.addEventListener("avatar_updated", async () => {
    const profile = store.state.profile;
    const avatar = await fetchAvatar(profile.avatarId);
    updateProfile(profile, {
      name: profile.displayName,
      attachment: [
        {
          type: "Avatar",
          content: profile.avatarId,
          url: avatar.gltf_url
        }
      ]
    })
      .then(() => {
        store.update({
          activity: {
            hasChangedName: true
          }
        });
      })
      .catch(err => console.error("Error updating profile:", err.message));
  });

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

  setupMonetization(hubScene, localPlayer);
}
