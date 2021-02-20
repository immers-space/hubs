import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import { getMessageComponent } from "./ChatSidebar";
import chatStyles from "./ChatSidebar.scss";
import styles from "./ImmersReact.scss";
import { FormattedRelativeTime } from "react-intl";
import { proxiedUrlFor } from "../../utils/media-url-utils";
import immersLogo from "../../assets/images/immers_logo.png";

export function ImmerLink({ place }) {
  if (!place) {
    return;
  }
  let placeUrl = place.url;
  // inject user handle into desintation url so they don't have to type it
  try {
    const url = new URL(placeUrl);
    const search = new URLSearchParams(url.search);
    search.set("me", window.APP.store.state.profile.handle);
    url.search = search.toString();
    placeUrl = url.toString();
  } catch (ignore) {
    /* if fail, leave original url unchanged */
  }
  return <a href={placeUrl}>{place.name ?? "unkown"}</a>;
}

ImmerLink.propTypes = {
  place: PropTypes.object
};

export function ImmerChatMessage({ sent, sender, timestamp, icon, immer, context, messages }) {
  return (
    <li className={classNames(chatStyles.messageGroup, { [chatStyles.sent]: sent })}>
      <p className={classNames(chatStyles.messageGroupLabel, styles.immerChatLabel)}>
        <ImmerImageIcon src={immersLogo} />
        {icon && <ImmerImageIcon src={icon} />}
        {sender}
        <span className={styles.immerName}>[{immer}]</span>&nbsp;|&nbsp;<ImmerLink place={context} />&nbsp;|{" "}
        <FormattedRelativeTime updateIntervalInSeconds={10} value={(timestamp - Date.now()) / 1000} />
      </p>
      <ul className={chatStyles.messageGroupMessages}>{messages.map(message => getMessageComponent(message))}</ul>
    </li>
  );
}

ImmerChatMessage.propTypes = {
  sent: PropTypes.bool,
  sender: PropTypes.string,
  timestamp: PropTypes.any,
  messages: PropTypes.array,
  immer: PropTypes.string,
  icon: PropTypes.string,
  context: PropTypes.object
};

export function ImmerImageIcon({ src }) {
  return (
    <span className={styles.imageIconWrapper}>
      {src && <img className={styles.imageIcon} src={proxiedUrlFor(src)} />}
    </span>
  );
}
ImmerImageIcon.propTypes = {
  src: PropTypes.string
};
