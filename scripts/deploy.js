import { createReadStream, readFileSync, existsSync, unlinkSync } from "fs";
import { exec } from "child_process";
import rmdir from "rimraf";
import ncp from "ncp";
import tar from "tar";
import ora from "ora";
import FormData from "form-data";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
const { skipCI, noBuild, noUpload, envPlaceholders, replacePlaceholders } = yargs(hideBin(process.argv)).argv;

let host;
let token;

if (!existsSync(".ret.credentials")) {
  if (!noUpload && !envPlaceholders) {
    console.log("Not logged in, so cannot deploy. To log in, run npm run login.");
    process.exit(1);
  }
} else {
  ({ host, token } = JSON.parse(readFileSync(".ret.credentials")));
}

console.log(`Deploying to ${host}.`);
const step = ora({ indent: 2 }).start();

const getTs = (() => {
  const p = n => (n < 10 ? `0${n}` : n);
  return () => {
    const d = new Date();
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(
      d.getSeconds()
    )}`;
  };
})();

(async () => {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
  let buildEnv = {};
  let hubsConfigs
  if (envPlaceholders) {
    buildEnv = {
      CORS_PROXY_SERVER: "__IMMERS_PLACEHOLDER_CORS_PROXY_SERVER",
      BASE_ASSETS_PATH: "__IMMERS_PLACEHOLDER_BASE_ASSETS_PATH",
      SHORTLINK_DOMAIN: "__IMMERS_PLACEHOLDER_SHORTLINK_DOMAIN",
      SENTRY_DSN: "__IMMERS_PLACEHOLDER_SENTRY_DSN",
      GA_TRACKING_ID: "__IMMERS_PLACEHOLDER_GA_TRACKING_ID",
      RETICULUM_SERVER: "__IMMERS_PLACEHOLDER_RETICULUM_SERVER",
      THUMBNAIL_SERVER: "__IMMERS_PLACEHOLDER_THUMBNAIL_SERVER",
      NON_CORS_PROXY_DOMAINS: "__IMMERS_PLACEHOLDER_NON_CORS_PROXY_DOMAINS",
    };
  } else {
    const res = await fetch(`https://${host}/api/ita/configs/hubs`, { headers });
    hubsConfigs = await res.json();
    for (const [k, v] of Object.entries(hubsConfigs.general)) {
      buildEnv[k.toUpperCase()] = v;
    }
  }

  const version = getTs();

  buildEnv.BUILD_VERSION = `${process.env.npm_package_version}.${version}`;
  buildEnv.ITA_SERVER = "";
  buildEnv.POSTGREST_SERVER = "";
  buildEnv.CONFIGURABLE_SERVICES = "janus-gateway,reticulum,hubs,spoke";

  const env = Object.assign(process.env, buildEnv);
  if (!noBuild) {
    for (const d in ["./dist", "./admin/dist"]) {
      rmdir(d, err => {
        if (err) {
          console.error(err);
          process.exit(1);
        }
      });
    }

    step.text = "Building Client.";

    await new Promise((resolve, reject) => {
      if (skipCI) {
        return resolve();
      }
      exec("npm ci", {}, err => {
        if (err) reject(err);
        resolve();
      });
    });

    await new Promise((resolve, reject) => {
      exec("npm run build", { env }, err => {
        if (err) reject(err);
        resolve();
      });
    });

    step.text = "Building Admin Console.";

    await new Promise((resolve, reject) => {
      if (skipCI) {
        return resolve();
      }
      exec("npm ci", { cwd: "./admin" }, err => {
        if (err) reject(err);
        resolve();
      });
    });

    await new Promise((resolve, reject) => {
      exec("npm run build", { cwd: "./admin", env }, err => {
        if (err) reject(err);
        resolve();
      });
    });

    await new Promise(res => {
      ncp("./admin/dist", "./dist", err => {
        if (err) {
          console.error(err);
          process.exit(1);
        }

        res();
      });
    });
  }
  if (replacePlaceholders) {
    // update prebuilt bundle placeholders with server-specific values
    for (const [k, v] of Object.entries(hubsConfigs.general)) {
      await new Promise((resolve, reject) => {
        const ph = v.endsWith("/")
          // avoid double slash on substitution
          ? `__IMMERS_PLACEHOLDER_${k.toUpperCase()}/\\?`
          : `__IMMERS_PLACEHOLDER_${k.toUpperCase()}`;
        exec(`find ./dist -iregex ".*\\.\\(js\\|html\\|css\\|map\\)" -print0 | xargs -0 sed -i -e 's|${ph}|${v}|g'`, { env }, err => {
          if (err) reject(err);
          resolve();
        });
      });
    }
  }
  if (noUpload) {
    step.text = `Skipping deploy.`;
    step.succeed();
    process.exit(0);
  }
  step.text = "Preparing Deploy.";

  step.text = "Packaging Build.";
  tar.c({ sync: true, gzip: true, C: path.join(__dirname, "..", "dist"), file: "_build.tar.gz" }, ["."]);
  step.text = `Uploading Build ${buildEnv.BUILD_VERSION}.`;

  let uploadedUrl;

  const runUpload = async attempt => {
    if (attempt > 3) {
      throw new Error("Upload failed.");
    }

    const formData = new FormData();
    formData.append("media", createReadStream("_build.tar.gz"));
    formData.append("promotion_mode", "with_token");

    try {
      const res = await fetch(`https://${host}/api/v1/media`, { method: "POST", body: formData });
      const payload = await res.json();
      const url = new URL(payload.origin);
      url.searchParams.set("token", payload.meta.access_token);
      uploadedUrl = url.toString();
    } catch (e) {
      step.text = `Upload failed. Retrying attempt #${attempt + 1}/3`;
      await runUpload(attempt + 1);
    }
  };

  await runUpload(0);
  unlinkSync("_build.tar.gz");

  step.text = "Build uploaded, deploying.";

  // Wait for S3 flush, kind of a hack.
  await new Promise(res => setTimeout(res, 5000));

  await fetch(`https://${host}/api/ita/deploy/hubs`, {
    headers,
    method: "POST",
    body: JSON.stringify({ url: uploadedUrl, version })
  });

  step.text = `Deployed to ${host}.`;
  step.succeed();
  process.exit(0);
})();
