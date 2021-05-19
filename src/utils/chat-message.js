import React from "react";
import linkifyHtml from "linkifyjs/html";
import { toArray as toEmojis } from "react-emoji-render";
import sanitize from "sanitize-html";

const emojiRegex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/;

const sanitizeOpts = {
  allowedTags: sanitize.defaults.allowedTags.concat(["img"]),
  allowedAttributes: {
    a: ["href", "name", "target", "rel"]
  },
  transformTags: {
    // convert any existing links safe new tabs
    a: sanitize.simpleTransform("a", { rel: "noopener referrer", target: "_blank" })
  }
};

const linkifyOpts = {
  defaultProtocol: "https",
  // also any newly created links are safe new tabs
  attributes: {
    rel: "noopener referrer"
  },
  target: {
    url: "_blank"
  }
};

function safeHTML(text) {
  return {
    __html: linkifyHtml(sanitize(text, sanitizeOpts), linkifyOpts)
  };
}

export function formatMessageBody(body, { emojiClassName } = {}) {
  // Support wrapping text in ` to get monospace, and multiline.
  const monospace = body.startsWith("`") && body.endsWith("`");
  const cleanedBody = (monospace ? body.substring(1, body.length - 1) : body).trim();

  const messages = cleanedBody
    .split("\n")
    .map((message, i) => (
      <p key={i}>
        {toEmojis(message, { className: emojiClassName }).map(
          (node, i) => (typeof node === "string" ? <span key={i} dangerouslySetInnerHTML={safeHTML(node)} /> : node)
        )}
      </p>
    ));

  const multiline = messages.length > 1;

  let emoji = false;

  if (messages.length === 1) {
    const emojiComponents = toEmojis(cleanedBody);

    emoji =
      emojiComponents.length === 1 &&
      emojiComponents[0].props &&
      emojiComponents[0].props.children.match &&
      emojiComponents[0].props.children.match(emojiRegex);
  }

  return {
    formattedBody: <>{messages}</>,
    multiline,
    monospace,
    emoji
  };
}
