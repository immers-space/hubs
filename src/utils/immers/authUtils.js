export const allScopes = [
  "viewProfile",
  "viewPublic",
  "viewFriends",
  "postLocation",
  "viewPrivate",
  "creative",
  "addFriends",
  "addBlocks",
  "destructive"
];

export function catchToken() {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  if (hashParams.has("access_token")) {
    // not safe to update store here, will be saved later in initialize()
    const token = hashParams.get("access_token");
    const homeImmer = hashParams.get("issuer");
    const authorizedScopes = hashParams.get("scope")?.split(" ") || [];
    window.location.hash = "";
    // If this is an oauth popup, pass the results back up and close
    // todo check origin
    if (window.opener) {
      window.opener.postMessage({
        type: "ImmersAuth",
        token,
        homeImmer,
        authorizedScopes
      });
    }
  }
}
