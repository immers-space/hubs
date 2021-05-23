import React, { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import { getMessageComponent } from "./ChatSidebar";
import chatStyles from "./ChatSidebar.scss";
import styles from "./ImmersReact.scss";
import { FormattedRelativeTime } from "react-intl";
import { proxiedUrlFor } from "../../utils/media-url-utils";
import immersLogo from "../../assets/images/immers_logo.png";
import merge from "deepmerge";
import { ImmersFeedContext } from "./ImmersFeedSidebarContainer";

function proxyAndGetMessageComponent(message) {
  // media urls need proxy to pass CSP & CORS
  if (message.body?.src) {
    message = merge({}, message);
    message.body.src = proxiedUrlFor(message.body.src);
  }
  return getMessageComponent(message);
}

export function ImmerLink({ place }) {
  if (!place) {
    return null;
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
      const hashParams = new URLSearchParams();
      hashParams.set("me", window.APP.store.state.profile.handle);
      url.hash = hashParams.toString();
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

export function ImmersChatMessage({ sent, sender, timestamp, isFriend, icon, immer, context, messages }) {
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
        {icon && <ImmersAvatarIcon avi={icon} />}
        {sender}
        <span className={styles.immerName}>[{immer}]</span>&nbsp;|&nbsp;<ImmerLink place={context} />&nbsp;|{" "}
        <FormattedRelativeTime updateIntervalInSeconds={10} value={(timestamp - Date.now()) / 1000} />
      </p>
      <ul className={chatStyles.messageGroupMessages}>
        {messages.map(message => proxyAndGetMessageComponent(message))}
      </ul>
    </li>
  );
}

ImmersChatMessage.propTypes = {
  sent: PropTypes.bool,
  sender: PropTypes.string,
  timestamp: PropTypes.any,
  messages: PropTypes.array,
  immer: PropTypes.string,
  icon: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  isFriend: PropTypes.bool,
  context: PropTypes.object
};

export function ImmersImageIcon({ src, title, button }) {
  return (
    <span className={classNames({ [styles.imageIconWrapper]: true, [styles.buttonIcon]: button })}>
      {src && <img className={styles.imageIcon} src={proxiedUrlFor(src)} title={title} />}
    </span>
  );
}
ImmersImageIcon.propTypes = {
  src: PropTypes.string,
  title: PropTypes.string,
  button: PropTypes.bool
};

export function ImmersFriendIcon() {
  return <ImmersImageIcon src={immersLogo} title={"Immers Space Friend"} />;
}

export function ImmersIcon(props) {
  return <ImmersImageIcon src={immersLogo} {...props} />;
}

export function ImmersAvatarIcon({ avi }) {
  // support both Image objects & direct url
  const src = avi.url || avi;
  return <ImmersImageIcon src={src} />;
}
ImmersAvatarIcon.propTypes = {
  avi: PropTypes.any
};

export function ImmersMoreHistoryButton() {
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

export function ImmersPermissionUpgrade({ scope, role, children }) {
  const { permissions, reAuthorize } = useContext(ImmersFeedContext);
  if (permissions.includes(scope) || !reAuthorize) {
    return null;
  }
  return (
    <div className={styles.permissions}>
      <ImmersIcon />
      <p>
        {children}. <ImmersPermissionUpgradeButton role={role} />
      </p>
    </div>
  );
}

ImmersPermissionUpgrade.propTypes = {
  children: PropTypes.node,
  scope: PropTypes.string,
  role: PropTypes.string
};

export function ImmersPermissionUpgradeButton({ role }) {
  const { reAuthorize } = useContext(ImmersFeedContext);
  if (!reAuthorize) {
    // initial auth has not occurred
    return null;
  }
  return (
    <a href="#" className={styles.permissionsButton} onClick={() => reAuthorize(role)}>
      Reload &amp; change
    </a>
  );
}

ImmersPermissionUpgradeButton.propTypes = {
  role: PropTypes.string
};
