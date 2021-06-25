import { readFileSync, existsSync } from "fs";
// use env due to complications of reading $ in payment pointer via cli
const { domain: immer, monetizationPointer: wallet } = process.env;
if (!immer || !wallet) {
  console.log("Missing required ENV: domain, monetizationPointer");
  process.exit(1);
}
if (!existsSync(".ret.credentials")) {
  console.log("Not logged in, so cannot configure. To log in, run npm run login.");
  process.exit(1);
}
const { host, token } = JSON.parse(readFileSync(".ret.credentials"));

(async () => {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
  // server settings
  const cfg = {
    extra_csp: {
      // connect to home immer
      connect_src: "https: wss:"
    },
    security: {
      // fetch remote avatars
      cors_origins: "*"
    },
    uploads: {
      // keep media for 6 months so it remains in chat history
      ttl: 15778476
    },
    extra_html: {}
  };
  // add local immers server env variable and web monetization payment pointer to all pages
  const extraHeader = `<meta name="env:immers_server" content="https://${immer}"><meta name="monetization" content="${wallet}">`;
  ["extra_avatar_html", "extra_index_html", "extra_room_html", "extra_scene_html"].forEach(setting => {
    cfg.extra_html[setting] = extraHeader;
  });
  await fetch(`https://${host}/api/ita/configs/reticulum`, {
    headers,
    method: "PATCH",
    body: JSON.stringify(cfg)
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Response ${res.status}`);
      }
    })
    .catch(err => console.log("Error updating server config: ", err.message));

  // App Settings
  await fetch(`https://${host}/api/v1/app_configs`, {
    headers,
    method: "POST",
    body: JSON.stringify({
      features: {
        // disallow hubs/reticulum accounts to enforce monetized features and avoid confusion with immers accounts
        disable_sign_up: true
      }
    })
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Response ${res.status}`);
      }
    })
    .catch(err => console.log("Error updating server config: ", err.message));
  process.exit(0);
})();
