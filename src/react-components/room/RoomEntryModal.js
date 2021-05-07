import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import { Modal } from "../modal/Modal";
import { Button } from "../input/Button";
import { ReactComponent as EnterIcon } from "../icons/Enter.svg";
import { ReactComponent as VRIcon } from "../icons/VR.svg";
import { ReactComponent as ShowIcon } from "../icons/Show.svg";
import { ReactComponent as SettingsIcon } from "../icons/Settings.svg";
import { ReactComponent as WMIcon } from "../icons/wm-icon.svg";
import styles from "./RoomEntryModal.scss";
import styleUtils from "../styles/style-utils.scss";
import { useCssBreakpoints } from "react-use-css-breakpoints";
import { Column } from "../layout/Column";
import { FormattedMessage } from "react-intl";
import { ImmersIcon } from "./ImmersReact";

export function RoomEntryModal({
  appName,
  logoSrc,
  className,
  roomName,
  showLoginToImmers,
  onLoginToImmers,
  showJoinRoom,
  onJoinRoom,
  showEnterOnDevice,
  onEnterOnDevice,
  showSpectate,
  onSpectate,
  showOptions,
  onOptions,
  showMonetizationRequired,
  showMonetized,
  ...rest
}) {
  const breakpoint = useCssBreakpoints();
  return (
    <Modal className={classNames(styles.roomEntryModal, className)} disableFullscreen {...rest}>
      <Column center className={styles.content}>
        {breakpoint !== "sm" &&
          breakpoint !== "md" && (
            <div className={styles.logoContainer}>
              <img src={logoSrc} alt={appName} />
            </div>
          )}
        <div className={styles.roomName}>
          <h5>
            <FormattedMessage id="room-entry-modal.room-name-label" defaultMessage="Room Name" />
          </h5>
          <p>{roomName}</p>
        </div>
        <Column center className={styles.buttons}>
          {showLoginToImmers && (
            <Button preset="basic" onClick={onLoginToImmers}>
              <ImmersIcon button={true} />
              <span>
                <FormattedMessage id="room-entry-modal.login-to-immers-button" defaultMessage="Immers Login" />
              </span>
            </Button>
          )}
          {!showLoginToImmers && showJoinRoom && (
            <Button preset="accent4" onClick={onJoinRoom}>
              <EnterIcon />
              <span>
                <FormattedMessage id="room-entry-modal.join-room-button" defaultMessage="Join Room" />
              </span>
            </Button>
          )}
          {!showLoginToImmers && showEnterOnDevice && (
            <Button preset="accent5" onClick={onEnterOnDevice}>
              <VRIcon />
              <span>
                <FormattedMessage id="room-entry-modal.enter-on-device-button" defaultMessage="Enter On Device" />
              </span>
            </Button>
          )}
          {showSpectate && (
            <Button preset="accent2" onClick={onSpectate}>
              <ShowIcon />
              <span>
                <FormattedMessage id="room-entry-modal.spectate-button" defaultMessage="Spectate" />
              </span>
            </Button>
          )}
          <div className={styles.webmon}>
            {!showJoinRoom && <p>This space has no more free slots available.</p>}
            <WMIcon />
            {showMonetized && (
              <div>
                Thanks for paying! You can join this space even if it is full. Search for this icon in the space to find
                other premium features.
              </div>
            )}
            {showMonetizationRequired && (
              <div>
                <a href="https://web.immers.space/monetization-required/" target="_blank" rel="noopener">
                  Sign up for Web Monetization
                </a>{" "}
                to unlock premium features and join spaces even when they are full.
              </div>
            )}
          </div>

          {showOptions &&
            breakpoint !== "sm" && (
              <>
                <hr className={styleUtils.showLg} />
                <Button preset="transparent" className={styleUtils.showLg} onClick={onOptions}>
                  <SettingsIcon />
                  <span>
                    <FormattedMessage id="room-entry-modal.options-button" defaultMessage="Options" />
                  </span>
                </Button>
              </>
            )}
        </Column>
      </Column>
    </Modal>
  );
}

RoomEntryModal.propTypes = {
  appName: PropTypes.string,
  logoSrc: PropTypes.string,
  className: PropTypes.string,
  roomName: PropTypes.string.isRequired,
  showJoinRoom: PropTypes.bool,
  onJoinRoom: PropTypes.func,
  showEnterOnDevice: PropTypes.bool,
  onEnterOnDevice: PropTypes.func,
  showSpectate: PropTypes.bool,
  onSpectate: PropTypes.func,
  showOptions: PropTypes.bool,
  onOptions: PropTypes.func,
  showMonetizationRequired: PropTypes.bool,
  showMonetized: PropTypes.bool
};

RoomEntryModal.defaultProps = {
  showJoinRoom: true,
  showEnterOnDevice: true,
  showSpectate: true,
  showOptions: true
};
