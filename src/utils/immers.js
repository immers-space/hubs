import io from "socket.io-client";
import configs from "./configs";
import { fetchAvatar } from "./avatar-utils";
import { SOUND_CHAT_MESSAGE } from "../systems/sound-effects-system";
import { setupMonetization } from "./immers/monetization";
import immersMessageDispatch from "./immers/immers-message-dispatch";
import Activities from "./immers/activities";
import { allScopes } from "./immers/authUtils";
const replaceArrays = { arrayMerge: (destinationArray, sourceArray) => sourceArray };
const localImmer = configs.IMMERS_SERVER;
// immer can set a requested scope, but user can override
const preferredScope = configs.IMMERS_SCOPE;
console.log("immers.space client v1.1.0");
const jsonldMime = "application/activity+json";

const activities = new Activities(localImmer);
let homeImmer;
let place;
let token;
let authorizedScopes;
let hubScene;
let localPlayer;
let actorObj;
let handle;
let avatarsCollection;
let blockList;
// map of avatar urls to model objects to avoid recreating their AP representation
// when donned from personal avatars collection
const myAvatars = {};

// copy of URL used for sharing/authorization request
const hashParams = new URLSearchParams(window.location.hash.substring(1));
if (hashParams.has("me")) {
  handle = hashParams.get("me");
  // remove your handle before sharing with friends
  window.location.hash = "";
}
const hubUri = new URL(window.location);

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

export function arrive(actorObj) {
  return postActivity(actorObj.outbox, {
    type: "Arrive",
    actor: actorObj.id,
    target: place,
    to: actorObj.followers,
    summary: `${actorObj.name} arrived at ${place.name}.`
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
    immersAvatar.icon = {
      type: "Image",
      mediaType: "image/png",
      url: hubsAvatar.files.thumbnail
    };
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
    throw new Error(`Unable to fech friends: ${response.statusText}`);
  }
  return response.json();
}

// perform oauth flow to get access token for local or remote user
export async function auth(store, scope) {
  // check if we're already logged in
  token = store.state.credentials.immerToken;
  homeImmer = store.state.credentials.immerHome;
  authorizedScopes = store.state.credentials.immerScopes;
  if (token && homeImmer && authorizedScopes) {
    const loggedInActor = await getActor().catch(() => null);
    if (loggedInActor) {
      return {
        authPromise: Promise.resolve(loggedInActor)
      };
    }
  }
  // send to token endpoint at local immer, it handles
  // detecting remote users and sending them on to their home to login
  const redirect = new URL(`${localImmer}/auth/authorize`);
  const redirectParams = new URLSearchParams({
    client_id: place.id,
    // redirect to homepage to catch token
    redirect_uri: hubUri.origin,
    response_type: "token",
    scope: scope || preferredScope
  });
  // users handle may be passed from previous immer or cached but with expired token
  if (handle || store.state.profile.handle) {
    // pass to auth to prefill login form
    redirectParams.set("me", handle || store.state.profile.handle);
  }
  redirect.search = redirectParams.toString();
  // center the popup
  const width = 730;
  const height = 785;
  const left = (window.innerWidth - width) / 2 + window.screenLeft;
  const top = (window.innerHeight - height) / 2 + window.screenTop;
  const features = `toolbar=no, menubar=no, width=${width}, height=${height}, top=${top}, left=${left}`;
  let popup;
  return {
    authPromise: new Promise((resolve, reject) => {
      const handler = ({ data }) => {
        if (data?.type !== "ImmersAuth") {
          return;
        }
        if (!data.token) {
          return reject("Not authorized");
        }
        token = data.token;
        homeImmer = data.homeImmer;
        authorizedScopes = data.authorizedScopes[0] === "*" ? allScopes : data.authorizedScopes;
        window.removeEventListener("message", handler);
        // have to close the popup in this thread because, in chrome, having the popup close itself crashes the browser
        popup?.close();
        resolve(getActor());
      };
      window.addEventListener("message", handler);
    }),
    startImmersAuth: () => {
      popup = window.open(redirect, "immersLoginPopup", features);
    }
  };
}

// force re-login to change authorized scopes
async function resetAuth(store, remountUI, scope) {
  token = undefined;
  store.update({
    credentials: {
      immerToken: null,
      immerHome: null,
      immerScopes: null
    }
  });
  const { authPromise, startImmersAuth } = await auth(store, scope);
  startImmersAuth();
  await authPromise;
  store.update({
    credentials: {
      immerToken: token,
      immerHome: homeImmer,
      immerScopes: authorizedScopes
    }
  });
  // could, in theory, handle scope upgrades without reloading, but it would be a lot of work
  return window.location.reload();
}

export async function initialize(store, scene, remountUI, messageDispatch, createInWorldLogMessage) {
  hubScene = scene;
  localPlayer = document.getElementById("avatar-rig");
  place = await getObject(`${localImmer}/o/immer`);
  place.url = hubUri; // include room id
  activities.place = place;
  const { authPromise, startImmersAuth } = await auth(store);
  remountUI({ isImmersConnected: false, startImmersAuth });
  actorObj = await authPromise;
  activities.token = token;
  activities.homeImmer = homeImmer;
  activities.authorizedScopes = authorizedScopes;
  activities.actor = actorObj;
  const initialAvi = store.state.profile.avatarId;
  const actorAvi = getAvatarFromActor(actorObj);
  // cache current avatar so doesn't get recreated during a profile update
  myAvatars[actorAvi] = Array.isArray(actorObj.avatar) ? actorObj.avatar[0] : actorObj.avatar;
  store.update(
    {
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
        immerHome: homeImmer,
        immerScopes: authorizedScopes
      }
    },
    // don't accumulate scopes
    replaceArrays
  );
  authorizedScopes.forEach(scope => hubScene.addState(`immers-scope-${scope}`));
  const immerSocket = io(homeImmer, {
    transportOptions: {
      polling: {
        extraHeaders: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  });
  immerSocket.on("connect", () => {
    // will also send on reconnect to ensure you show as online
    arrive(actorObj);
    immerSocket.emit("entered", {
      // prepare a leave activity to be fired on disconnect
      outbox: actorObj.outbox,
      authorization: `Bearer ${token}`,
      leave: {
        type: "Leave",
        actor: actorObj.id,
        target: place,
        to: actorObj.followers,
        summary: `${actorObj.name} left ${place.name}.`
      }
    });
  });

  // friends list
  let friendsCol;
  const setFriendState = (immersId, el) => {
    // friends not loaded or is myself
    if (!friendsCol || immersId === actorObj.id) {
      return;
    }
    const friendStatus = friendsCol.orderedItems.find(act => act.actor.id === immersId);
    // inReplyTo on a follow means it is a followback, don't show accept prompt (already a friend)
    if (friendStatus?.type === "Follow" && !friendStatus?.inReplyTo) {
      el.removeState("immers-follow-friend");
      el.removeState("immers-follow-none");
      el.addState("immers-follow-request");
    } else if (friendStatus && friendStatus.type !== "Reject") {
      el.removeState("immers-follow-request");
      el.removeState("immers-follow-none");
      el.addState("immers-follow-friend");
    } else {
      el.removeState("immers-follow-request");
      el.removeState("immers-follow-friend");
      el.addState("immers-follow-none");
    }
  };
  const updateFriends = async () => {
    if (store.state.profile.id) {
      const profile = store.state.profile;
      try {
        friendsCol = await getFriends(profile);
        activities.friends = friendsCol.orderedItems;
        remountUI({ friends: friendsCol.orderedItems.filter(act => act.type !== "Reject"), handle: profile.handle });
      } catch (err) {
        console.warn(err.message);
        remountUI({ friends: [], handle: profile.handle });
      }
      // update follow button for new friends
      const players = window.APP.componentRegistry["player-info"];
      players?.forEach(infoComp => setFriendState(infoComp.data.immersId, infoComp.el));
    }
  };
  updateFriends();
  immerSocket.on("friends-update", updateFriends);

  blockList = await activities.blockList();
  // hide any blocked users currently in the room
  Object.entries(window.APP.hubChannel.presence.state).forEach(([clientId, presence]) => {
    const immersId = presence.metas[presence.metas.length - 1]?.profile.id;
    if (blockList.includes(immersId)) {
      window.APP.hubChannel.hide(clientId);
    }
  });
  // hide blocked users as soon as they connect
  scene.addEventListener("presence_updated", ({ detail: { sessionId, profile } }) => {
    if (blockList.includes(profile.id)) {
      window.APP.hubChannel.hide(sessionId);
    }
  });

  scene.addEventListener("avatar_updated", async () => {
    const profile = store.state.profile;
    const update = {};
    // disable the first-time entry name & avatar prompt
    store.update({
      activity: {
        hasChangedName: true
      }
    });
    if (!authorizedScopes.includes("creative")) {
      return;
    }
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
  });

  // entity interactions
  scene.addEventListener("immers-id-changed", event => setFriendState(event.detail, event.target));

  scene.addEventListener("immers-follow", event => {
    if (!event.detail) {
      return;
    }
    activities.follow(event.detail).catch(err => console.error("Error sending follow request:", err.message));
  });
  scene.addEventListener("immers-follow-accept", event => {
    const follow = friendsCol.orderedItems.find(act => act.actor.id === event.detail && act.type === "Follow");
    if (!follow) {
      return;
    }
    activities.accept(follow).catch(err => console.err("Error sending follow accept:", err.message));
  });
  // unfriend
  scene.addEventListener("immers-follow-reject", event => {
    // server converts actorId to followId for reject object
    activities.reject(event.detail, event.detail).catch(err => console.error("Error sending unfollow:", err.message));
  });
  // blocked
  scene.addEventListener("immers-block", ({ detail: { clientId } }) => {
    const presence = window.APP.hubChannel.presence.state[clientId];
    const immersId = presence?.metas[presence.metas.length - 1]?.profile.id;
    if (immersId) {
      activities.block(immersId);
      // update local copy in case blocked user reconnects
      blockList.push(immersId);
    }
  });

  setupMonetization(hubScene, localPlayer, remountUI);

  // news feed and chat integration, behind a feature switch as it needs the new hubs ui
  if (createInWorldLogMessage) {
    // fetch news feed
    const updateFeed = async () => {
      const { messages, more } = await activities.feedAsChat();
      messages.forEach(detail => {
        immersMessageDispatch.dispatchEvent(new CustomEvent("message", { detail }));
      });
      return more;
    };
    updateFeed();
    // event from "load more" button at top of in chat sidebar
    window.addEventListener("immers-load-more-history", async () => {
      const more = await updateFeed();
      window.dispatchEvent(new CustomEvent("immers-more-history-loaded", { detail: more }));
    });

    // stream new activity while in room
    immerSocket.on("inbox-update", activity => {
      activity = JSON.parse(activity);
      const message = activities.activityAsChat(activity);
      if (message.body) {
        if (message.type !== "activity") {
          // play sound for chat/image/video updates
          scene.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(SOUND_CHAT_MESSAGE);
        }
        immersMessageDispatch.dispatchEvent(new CustomEvent("message", { detail: message }));
        if (scene.is("vr-mode")) {
          createInWorldLogMessage(message);
        }
      }
    });
    immersMessageDispatch.setDispatchHandler(message => {
      // include local room occupants
      const localAudience = Object.values(window.APP.hubChannel.presence.state)
        .map(presence => presence.metas[presence.metas.length - 1]?.profile.id)
        .filter(id => id && id !== actorObj.id);
      // send activity
      let task;
      switch (message.type) {
        case "chat":
          task = activities.note(message.body, localAudience, message.audience, null);
          break;
        case "image":
        case "photo":
          task = activities.image(message.body.src, localAudience, message.audience, null);
          break;
        case "video":
          task = activities.video(message.body.src, localAudience, message.audience, null);
          break;
        default:
          return console.log("Chat message not shared", message);
      }
      task
        .then(async postResult => {
          if (!postResult.ok) {
            throw new Error(postResult.status);
          }
          // fetch the newly created activity and feed it back into chat system so your outgoing messages appear in panel
          const chat = activities.activityAsChat(await getObject(postResult.headers.get("Location")), true);
          immersMessageDispatch.dispatchEvent(new CustomEvent("message", { detail: chat }));
        })
        .catch(err => console.error(`Error sharing chat: ${err.message}`));
    });
    const immersReAuth = scope => resetAuth(store, remountUI, scope);
    remountUI({ immersMessageDispatch, immersScopes: authorizedScopes, isImmersConnected: true, immersReAuth });
  }
}
