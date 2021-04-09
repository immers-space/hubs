import { readFileSync, existsSync } from "fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
const { immer, wallet } = yargs(hideBin(process.argv)).argv;
if (!immer || !wallet) {
  console.log("Missing required CLI arguments: immer, wallet");
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
      connect_src: "https: wss:",
      // allow Coil WebMon browser plugin
      script_src:
        "'sha256-W5yaJ6UM3/kOJa12aRVSLOEOKdAUYAWZPM1bUuaTJYQ='  'sha256-XpyxuqRQmj1o8ovYZlIA71UXSYTvYdV8kOb55p+lrNo=' 'sha256-tie542PGbiDGOm9MefVIzDBZf4Nt5wTagAHT/BKEB94=' 'sha256-9QLzkf1LE5s0CtnpqUvwkWr7DV4GRfQLGt/tFNT19h0='"
    },
    security: {
      // fetch remote avatars
      cors_origins: "*"
    },
    extra_html: {}
  };
  // add local immers server env variable and web monetizatoin payment pointer to all pages
  const extraHeader = `<meta name="env:immers_server" content="${immer}"><meta name="monetization" content="${wallet}">`;
  ["extra_avatar_html", "extra_index_html", "extra_room_html", "extra_scene_html"].forEach(setting => {
    cfg[setting] = extraHeader;
  });

  await fetch(`https://${host}/api/ita/configs/reticulum`, {
    headers,
    method: "PATCH",
    body: JSON.stringify(cfg)
  });

  // App Settings
  await fetch(`https://${host}/api/v1/app_configs`, {
    headers,
    method: "POST",
    body: JSON.stringify({
      features: {
        // disallow hubs/reticulum accounts to enfore monetized features and avoid confusion with immers accounts
        disable_sign_up: true
      }
    })
  });
})();
