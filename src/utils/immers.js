import io from "socket.io-client";
import configs from "./configs";
import { fetchAvatar } from "./avatar-utils";
import { setupMonetization } from "./immers/monetization";
import Activities from "./immers/activities";
const localImmer = configs.IMMERS_SERVER;
console.log("immers.space client v0.4.1");
const jsonldMime = "application/activity+json";
// avoid race between auth and initialize code
let resolveAuth;
let rejectAuth;
const authPromise = new Promise((resolve, reject) => {
  resolveAuth = resolve;
  rejectAuth = reject;
});
const activities = new Activities(localImmer);
let homeImmer;
let place;
let token;
let hubScene;
let localPlayer;
let actorObj;
let avatarsCollection;
// map of avatar urls to model objects to avoid recreating their AP representation
// when donned from personal avatars collection
const myAvatars = {};

export function getUrlFromAvatar(avatar) {
  const links = Array.isArray(avatar.url) ? avatar.url : [avatar.url];
  // prefer gltf
  const gltfUrl = links.find(link => link.mediaType === "model/gltf+json" || link.mediaType === "model/gltf-binary");
  if (gltfUrl) {
    return gltfUrl.href;
  }
  // gamble on a url of unkown type
  return links.find(link => typeof link === "string");
}

export function getAvatarFromActor(actorObj) {
  if (!actorObj.avatar) {
    return null;
  }
  const avatar = Array.isArray(actorObj.avatar) ? actorObj.avatar[0] : actorObj.avatar;
  return getUrlFromAvatar(avatar);
}

export async function getObject(IRI) {
  if (IRI.startsWith(localImmer) || IRI.startsWith(homeImmer)) {
    const headers = { Accept: jsonldMime };
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
      Accept: jsonldMime,
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
      "Content-Type": jsonldMime,
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

// Adds a new avatar to an immerser's inventory
export async function createAvatar(actorObj, hubsAvatarId) {
  const hubsAvatar = await fetchAvatar(hubsAvatarId);
  const immersAvatar = {
    type: "Model",
    name: hubsAvatar.name,
    url: {
      type: "Link",
      href: hubsAvatar.gltf_url,
      mediaType: hubsAvatar.gltf_url.includes(".glb") ? "model/gltf-binary" : "model/gltf+json"
    },
    to: actorObj.followers,
    generator: place
  };
  if (hubsAvatar.files.thumbnail) {
    immersAvatar.icon = hubsAvatar.files.thumbnail;
  }
  if (hubsAvatar.attributions) {
    immersAvatar.attributedTo = Object.values(hubsAvatar.attributions).map(name => ({
      name,
      type: "Person"
    }));
  }
  const createResult = await postActivity(actorObj.outbox, immersAvatar);
  if (!createResult.ok) {
    throw new Error("Error creating avatar", createResult.status, createResult.body);
  }
  const created = await getObject(createResult.headers.get("Location"));
  if (actorObj.streams?.avatars) {
    const addResult = await postActivity(actorObj.outbox, {
      type: "Add",
      actor: actorObj.id,
      to: actorObj.followers,
      object: created.id,
      target: actorObj.streams.avatars
    });
    if (!addResult.ok) {
      throw new Error("Error adding avatar to collection", addResult.status, addResult.body);
    }
  }
  return created;
}

export async function fetchMyImmersAvatars(page) {
  let collectionPage;
  let items;
  const hubsResult = {
    meta: {
      source: "avatar",
      next_cursor: null
    },
    entries: [],
    suggestions: null
  };
  if (!actorObj.streams?.avatars) {
    return hubsResult;
  }
  try {
    if (!avatarsCollection) {
      // cache base collection object
      avatarsCollection = await getObject(actorObj.streams.avatars);
    }
    // check if the collection is not paginated
    items = avatarsCollection.orderedItems;
    if (!items && avatarsCollection.first) {
      // otherwise get page
      collectionPage = await getObject(page || avatarsCollection.first);
      items = collectionPage.orderedItems;
      hubsResult.meta.next_cursor = collectionPage.next;
    }
    items.forEach(createActivity => {
      const avatar = createActivity.object;
      const avatarGltfUrl = getUrlFromAvatar(avatar);
      // cache results for lookup by url when donned
      myAvatars[avatarGltfUrl] = avatar;
      // form object for Hubs MediaBrowser
      let preview = Array.isArray(avatar.icon) ? avatar.icon[0] : avatar.icon;
      // if link/image object instead of direct link
      if (typeof preview === "object") {
        preview = preview.href || preview.url;
      }
      hubsResult.entries.push({
        type: "avatar",
        name: avatar.name,
        // id used by hubs to set the avatar, put model url here
        id: avatarGltfUrl,
        images: {
          preview: {
            // width/height ignored for avatar media
            url: preview
          }
        },
        // display source immer name & link in description field
        attributions: { publisher: { name: avatar.generator?.name } },
        url: avatar.generator?.url || avatar.id
      });
    });
  } catch (err) {
    console.error("Cannot fetch avatar collection", err);
  }
  return hubsResult;
}

export async function getFriends(actorObj) {
  const response = await window.fetch(`${actorObj.id}/friends`, {
    headers: {
      Accept: jsonldMime,
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
  activities.place = place;
  if (hashParams.has("access_token")) {
    // not safe to update store here, will be saved later in initialize()
    token = hashParams.get("access_token");
    homeImmer = hashParams.get("issuer");
    window.location.hash = "";
  } else {
    token = store.state.credentials.immerToken;
    homeImmer = store.state.credentials.immerHome;
  }
  activities.token = token;
  activities.homeImmer = homeImmer;

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

export async function initialize(store, scene, remountUI, messageDispatch) {
  hubScene = scene;
  localPlayer = document.getElementById("avatar-rig");
  // immers profile
  actorObj = await authPromise;
  activities.actor = actorObj;
  const initialAvi = store.state.profile.avatarId;
  const actorAvi = getAvatarFromActor(actorObj);
  // cache current avatar so doesn't get recreated during a profile update
  myAvatars[actorAvi] = Array.isArray(actorObj.avatar) ? actorObj.avatar[0] : actorObj.avatar;
  store.update({
    profile: {
      id: actorObj.id,
      avatarId: actorAvi || initialAvi,
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
        target: place,
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
  // news feed
  const updateFeed = async () => {
    const inboxItems = await activities.inboxAsChat();
    inboxItems.forEach(detail => {
      messageDispatch.dispatchEvent(new CustomEvent("message", { detail }));
    });
  };
  updateFeed();
  scene.addEventListener("avatar_updated", async () => {
    const profile = store.state.profile;
    const update = {};
    if (profile.displayName !== actorObj.name) {
      update.name = profile.displayName;
    }
    if (getAvatarFromActor(actorObj) !== profile.avatarId) {
      update.avatar = myAvatars[profile.avatarId] || (await createAvatar(actorObj, profile.avatarId)).object;
      update.icon = update.avatar.icon;
    }
    // only publish update if something changed
    if (Object.keys(update).length) {
      await updateProfile(actorObj, update).catch(err => console.error("Error updating profile:", err.message));
    }
    // disable the first-time entry name & avatar prompt
    store.update({
      activity: {
        hasChangedName: true
      }
    });
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

  // chat integration
  messageDispatch.addEventListener("message", ({ detail: message }) => {
    // check if it was sent by me
    if (!message.sent) {
      return;
    }
    // send activity
    let task;
    switch (message.type) {
      case "chat":
        task = activities.note(message.body, true, null);
        break;
      case "image":
      case "photo":
        task = activities.image(message.body.src, true, null);
        break;
      case "video":
        task = activities.video(message.body.src, true, null);
        break;
      default:
        console.log("Chat message not shared", message);
    }
    task.catch(err => console.error(`Error sharing chat: ${err.message}`));
  });
}
