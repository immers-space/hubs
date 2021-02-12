import React from "react";
import PropTypes from "prop-types";
import styles from "./PeopleSidebar.scss";
import { Sidebar } from "../sidebar/Sidebar";
import { CloseButton } from "../input/CloseButton";
import { IconButton } from "../input/IconButton";
import { ReactComponent as StarIcon } from "../icons/Star.svg";
import { ReactComponent as DesktopIcon } from "../icons/Desktop.svg";
import { ReactComponent as DiscordIcon } from "../icons/Discord.svg";
import { ReactComponent as PhoneIcon } from "../icons/Phone.svg";
import { ReactComponent as VRIcon } from "../icons/VR.svg";
import { ReactComponent as VolumeOffIcon } from "../icons/VolumeOff.svg";
import { ReactComponent as VolumeHighIcon } from "../icons/VolumeHigh.svg";
import { ReactComponent as VolumeMutedIcon } from "../icons/VolumeMuted.svg";
import immersLogo from "../icons/immers_logo.png";
import { List, ButtonListItem } from "../layout/List";
import { FormattedMessage, useIntl } from "react-intl";
import { proxiedUrlFor } from "../../utils/media-url-utils";

function getDeviceLabel(ctx, intl) {
  if (ctx) {
    if (ctx.mobile) {
      return intl.formatMessage({ id: "people-sidebar.device-label.mobile", defaultMessage: "Mobile" });
    } else if (ctx.discord) {
      return intl.formatMessage({ id: "people-sidebar.device-label.discord", defaultMessage: "Discord Bot" });
    } else if (ctx.hmd) {
      return intl.formatMessage({ id: "people-sidebar.device-label.vr", defaultMessage: "VR" });
    }
  }

  return intl.formatMessage({ id: "people-sidebar.device-label.desktop", defaultMessage: "Desktop" });
}

function getDeviceIconComponent(ctx) {
  if (ctx) {
    if (ctx.mobile) {
      return PhoneIcon;
    } else if (ctx.discord) {
      return DiscordIcon;
    } else if (ctx.hmd) {
      return VRIcon;
    }
  }

  return DesktopIcon;
}

function getVoiceLabel(micPresence, intl) {
  if (micPresence) {
    if (micPresence.talking) {
      return intl.formatMessage({ id: "people-sidebar.voice-label.talking", defaultMessage: "Talking" });
    } else if (micPresence.muted) {
      return intl.formatMessage({ id: "people-sidebar.voice-label.muted", defaultMessage: "Muted" });
    }
  }

  return intl.formatMessage({ id: "people-sidebar.voice-label.not-talking", defaultMessage: "Not Talking" });
}

function getVoiceIconComponent(micPresence) {
  if (micPresence) {
    if (micPresence.muted) {
      return VolumeMutedIcon;
    } else if (micPresence.talking) {
      return VolumeHighIcon;
    }
  }

  return VolumeOffIcon;
}

function getPresenceMessage(presence, intl) {
  switch (presence) {
    case "lobby":
      return intl.formatMessage({ id: "people-sidebar.presence.in-lobby", defaultMessage: "In Lobby" });
    case "room":
      return intl.formatMessage({ id: "people-sidebar.presence.in-room", defaultMessage: "In Room" });
    case "entering":
      return intl.formatMessage({ id: "people-sidebar.presence.entering", defaultMessage: "Entering Room" });
    default:
      return undefined;
  }
}

function getLocationMessage(activity, intl) {
  switch (activity.type) {
    case "Arrive": {
      const onlineMsg = intl.formatMessage({ id: "people-sidebar.immers.online", defaultMessage: "Online at" });
      const placeUrl = activity.target?.url;
      return (
        <span>
          {onlineMsg} <a href={placeUrl}>{activity.target?.name ?? "unkown"}</a>
        </span>
      );
    }
    case "Leave":
      return intl.formatMessage({ id: "people-sidebar.immers.offline", defaultMessage: "Offline" });
    default:
      return "";
  }
}

function imageIcon(src) {
  return (
    <span className={styles.imageIconWrapper}>
      {src && <img className={styles.imageIcon} src={proxiedUrlFor(src)} />}
    </span>
  );
}

function getPersonName(person, intl) {
  const you = intl.formatMessage({
    id: "people-sidebar.person-name.you",
    defaultMessage: "You"
  });

  return person.profile.displayName + (person.isMe ? ` (${you})` : "");
}

export function PeopleSidebar({ people, onSelectPerson, onClose, showMuteAll, onMuteAll }) {
  const intl = useIntl();

  return (
    <Sidebar
      title={
        <FormattedMessage
          id="people-sidebar.title"
          defaultMessage="People ({numPeople})"
          values={{ numPeople: people.length }}
        />
      }
      beforeTitle={<CloseButton onClick={onClose} />}
      afterTitle={
        showMuteAll ? (
          <IconButton onClick={onMuteAll}>
            <FormattedMessage id="people-sidebar.mute-all-button" defaultMessage="Mute All" />
          </IconButton>
        ) : (
          undefined
        )
      }
    >
      <List>
        {people.map(person => {
          const DeviceIcon = getDeviceIconComponent(person.context);
          const VoiceIcon = getVoiceIconComponent(person.micPresence);

          return (
            <ButtonListItem
              className={styles.person}
              key={person.id}
              type="button"
              onClick={e => onSelectPerson(person, e)}
              disabled={person.remote}
            >
              {person.remote ? imageIcon(immersLogo) : <DeviceIcon title={getDeviceLabel(person.context, intl)} />}
              {person.remote
                ? imageIcon(person.friendStatus.actor.icon)
                : !person.context.discord &&
                  !person.remote &&
                  VoiceIcon && <VoiceIcon title={getVoiceLabel(person.micPresence, intl)} />}
              <p>{getPersonName(person, intl)}</p>
              {person.roles.owner && (
                <StarIcon
                  title={intl.formatMessage({ id: "people-sidebar.moderator-label", defaultMessage: "Moderator" })}
                  className={styles.moderatorIcon}
                  width={12}
                  height={12}
                />
              )}
              <p className={styles.presence}>
                {getPresenceMessage(person.presence, intl) ?? getLocationMessage(person.friendStatus, intl)}
              </p>
            </ButtonListItem>
          );
        })}
      </List>
    </Sidebar>
  );
}

PeopleSidebar.propTypes = {
  people: PropTypes.array,
  onSelectPerson: PropTypes.func,
  showMuteAll: PropTypes.bool,
  onMuteAll: PropTypes.func,
  onClose: PropTypes.func
};

PeopleSidebar.defaultProps = {
  people: [],
  onSelectPerson: () => {}
};
