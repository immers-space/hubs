import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { ChatSidebar, ChatMessageList, ChatInput, SendMessageButton } from "./ChatSidebar";
import { useMaintainScrollPosition } from "../misc/useMaintainScrollPosition";
import { FormattedMessage, useIntl } from "react-intl";
import { ImmersChatMessage, ImmersIcon, ImmersMoreHistoryButton, ImmersPermissionUpgradeButton } from "./ImmersReact";
import { ToolbarButton } from "../input/ToolbarButton";
import { ReactComponent as PublicIcon } from "../icons/Scene.svg";
import { ReactComponent as FriendsIcon } from "../icons/People.svg";
import { ReactComponent as LocalIcon } from "../icons/Home.svg";
import { IconButton } from "../input/IconButton";
import styles from "./ChatSidebar.scss";

export const ImmersFeedContext = createContext({ messageGroups: [], sendMessage: () => {} });

let uniqueMessageId = 0;

function processChatMessage(messageGroups, newMessage) {
  const { name, sent, sessionId, ...messageProps } = newMessage;

  if (messageProps.isImmersFeed) {
    // insert according to timestamp
    const newMessageGroups = messageGroups.slice();
    const i = newMessageGroups.findIndex(group => messageProps.timestamp < group.timestamp);
    newMessageGroups.splice(i === -1 ? newMessageGroups.length : i, 0, {
      id: uniqueMessageId++,
      isImmersFeed: messageProps.isImmersFeed,
      isFriend: messageProps.isFriend,
      timestamp: messageProps.timestamp,
      sent: sent,
      sender: name,
      icon: messageProps.icon,
      senderSessionId: sessionId,
      context: messageProps.context,
      immer: messageProps.immer,
      messages: [{ id: uniqueMessageId++, ...messageProps }]
    });
    return newMessageGroups;
  }
}

// Returns the new message groups array when we receive a message.
// If the message is ignored, we return the original message group array.
function updateMessageGroups(messageGroups, newMessage) {
  switch (newMessage.type) {
    case "chat":
    case "image":
    case "photo":
    case "video":
    case "activity":
      return processChatMessage(messageGroups, newMessage);
    default:
      return messageGroups;
  }
}

export function ImmersFeedContextProvider({ messageDispatch, children, permissions, reAuthorize }) {
  const [messageGroups, setMessageGroups] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(false);
  const [audience, setAudience] = useState("public");

  useEffect(
    () => {
      function onReceiveMessage(event) {
        const newMessage = event.detail;
        if (!newMessage.isImmersFeed) {
          return;
        }
        setMessageGroups(messages => updateMessageGroups(messages, newMessage));
        if (
          newMessage.type === "chat" ||
          newMessage.type === "image" ||
          newMessage.type === "photo" ||
          newMessage.type === "video"
        ) {
          setUnreadMessages(true);
        }
      }

      if (messageDispatch) {
        messageDispatch.addEventListener("message", onReceiveMessage);
      }

      return () => {
        if (messageDispatch) {
          messageDispatch.removeEventListener("message", onReceiveMessage);
        }
      };
    },
    [messageDispatch, setMessageGroups, setUnreadMessages]
  );

  const sendMessage = useCallback(
    body => {
      if (messageDispatch) {
        messageDispatch.dispatch({ type: "chat", body, audience });
      }
    },
    [messageDispatch, audience]
  );

  const setMessagesRead = useCallback(
    () => {
      setUnreadMessages(false);
    },
    [setUnreadMessages]
  );

  return (
    <ImmersFeedContext.Provider
      value={{
        messageGroups,
        unreadMessages,
        audience,
        permissions,
        sendMessage,
        setMessagesRead,
        setAudience,
        reAuthorize
      }}
    >
      {children}
    </ImmersFeedContext.Provider>
  );
}

ImmersFeedContextProvider.propTypes = {
  children: PropTypes.node,
  messageDispatch: PropTypes.object,
  permissions: PropTypes.array,
  reAuthorize: PropTypes.func
};

export function ImmersFeedSidebarContainer({ onClose }) {
  const { messageGroups, sendMessage, setMessagesRead, audience, setAudience, permissions } = useContext(
    ImmersFeedContext
  );
  const [onScrollList, listRef, scrolledToBottom] = useMaintainScrollPosition(messageGroups);
  const [message, setMessage] = useState("");
  const intl = useIntl();

  const onKeyDown = useCallback(
    e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(e.target.value);
        setMessage("");
      }
    },
    [sendMessage, setMessage]
  );

  const onSendMessage = useCallback(
    () => {
      sendMessage(message);
      setMessage("");
    },
    [message, sendMessage, setMessage]
  );

  useEffect(
    () => {
      if (scrolledToBottom) {
        setMessagesRead();
      }
    },
    [messageGroups, scrolledToBottom, setMessagesRead]
  );

  let placeholder;
  switch (audience) {
    case "local":
      placeholder = intl.formatMessage({
        id: "immersfeed-sidebar-container.input-placeholder.local",
        defaultMessage: "Post to room"
      });
      break;
    case "friends":
      placeholder = intl.formatMessage({
        id: "immersfeed-sidebar-container.input-placeholder.friends",
        defaultMessage: "Post to room and friends"
      });
      break;
    case "public":
      placeholder = intl.formatMessage({
        id: "immersfeed-sidebar-container.input-placeholder.public",
        defaultMessage: "Post publicly"
      });
      break;
  }
  const audiences = ["local", "friends", "public"];
  const audienceButton = (
    <IconButton
      className={styles.chatInputIcon}
      onClick={() => setAudience(audiences[(audiences.indexOf(audience) + 1) % 3])}
      title="Change audience"
    >
      {audience === "public" && <PublicIcon />}
      {audience === "friends" && <FriendsIcon />}
      {audience === "local" && <LocalIcon />}
    </IconButton>
  );
  const canPost = permissions.includes("creative");
  if (!canPost) {
    placeholder = intl.formatMessage({
      id: "immersfeed-sidebar-container.input-placeholder.forbidden",
      defaultMessage: "Need permission to post"
    });
  }
  return (
    <ChatSidebar onClose={onClose} title="Immers Space metaverse chat">
      <ChatMessageList ref={listRef} onScroll={onScrollList}>
        <ImmersMoreHistoryButton />
        {messageGroups.map(({ id, ...rest }) => {
          return <ImmersChatMessage key={id} {...rest} />;
        })}
      </ChatMessageList>
      <ChatInput
        id="chat-input"
        onKeyDown={onKeyDown}
        onChange={e => setMessage(e.target.value)}
        disabled={!canPost}
        placeholder={placeholder}
        value={message}
        afterInput={
          canPost ? (
            <>
              <SendMessageButton onClick={onSendMessage} disabled={message.length === 0} />
              {audienceButton}
            </>
          ) : (
            <ImmersPermissionUpgradeButton role="modAdditive" />
          )
        }
      />
    </ChatSidebar>
  );
}

ImmersFeedSidebarContainer.propTypes = {
  canSpawnMessages: PropTypes.bool,
  presences: PropTypes.object.isRequired,
  occupantCount: PropTypes.number.isRequired,
  scene: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired
};

export function ImmersFeedToolbarButtonContainer(props) {
  const { unreadMessages } = useContext(ImmersFeedContext);
  return (
    <ToolbarButton
      {...props}
      icon={<ImmersIcon />}
      statusColor={unreadMessages ? "unread" : undefined}
      preset="basic"
      small
      title="Chat across the metaverse that is saved in your profile"
      label={<FormattedMessage id="immers-feed-toolbar-button" defaultMessage="Immers Chat" />}
    />
  );
}
