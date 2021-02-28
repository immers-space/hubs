import React, { useEffect, useState } from "react";
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
    if (
      `${url.host}${url.pathname}${url.search}` ===
      `${window.location.host}${window.location.pathname}${window.location.search}`
    ) {
      placeUrl = null;
    } else {
      const search = new URLSearchParams(url.search);
      search.set("me", window.APP.store.state.profile.handle);
      url.search = search.toString();
      placeUrl = url.toString();
    }
  } catch (ignore) {
    /* if fail, leave original url unchanged */
  }
  return placeUrl ? <a href={placeUrl}>{place.name ?? "unkown"}</a> : "here";
}

ImmerLink.propTypes = {
  place: PropTypes.object
};

export function ImmerChatMessage({ sent, sender, timestamp, isFriend, icon, immer, context, messages }) {
  if (messages[0].type === "activity") {
    return (
      <li className={classNames(chatStyles.messageGroup, { [chatStyles.sent]: sent })}>
        <p className={classNames(chatStyles.messageGroupLabel, styles.immerChatLabel)}>
          {messages[0].body} |{" "}
          <FormattedRelativeTime updateIntervalInSeconds={10} value={(timestamp - Date.now()) / 1000} />
        </p>
      </li>
    );
  }
  return (
    <li className={classNames(chatStyles.messageGroup, { [chatStyles.sent]: sent })}>
      <p className={classNames(chatStyles.messageGroupLabel, styles.immerChatLabel)}>
        {isFriend && <ImmersFriendIcon />}
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
  isFriend: PropTypes.bool,
  context: PropTypes.object
};

export function ImmerImageIcon({ src, title }) {
  return (
    <span className={styles.imageIconWrapper}>
      {src && <img className={styles.imageIcon} src={proxiedUrlFor(src)} title={title} />}
    </span>
  );
}
ImmerImageIcon.propTypes = {
  src: PropTypes.string,
  title: PropTypes.string
};

export function ImmersFriendIcon() {
  return <ImmerImageIcon src={immersLogo} title={"Immers Space Friend"} />;
}

export function ImmerMoreHistoryButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  useEffect(
    () => {
      const onMoreHistory = evt => {
        setIsLoading(false);
        setHasMore(evt.detail);
      };
      window.addEventListener("immers-more-history-loaded", onMoreHistory);
      return () => window.removeEventListener("immers-more-history-loaded", onMoreHistory);
    },
    [setIsLoading, setHasMore]
  );
  const handleClick = evt => {
    evt.preventDefault();
    setIsLoading(true);
    window.dispatchEvent(new CustomEvent("immers-load-more-history"));
  };
  return (
    hasMore && (
      <div className={styles.historyButton}>
        {isLoading ? (
          <span>Loading...</span>
        ) : (
          <a onClick={handleClick} href="#">
            Load more
          </a>
        )}
      </div>
    )
  );
}
