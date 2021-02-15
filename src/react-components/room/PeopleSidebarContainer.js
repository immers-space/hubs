import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { PeopleSidebar } from "./PeopleSidebar";
import { getMicrophonePresences } from "../../utils/microphone-presence";
import ProfileEntryPanel from "../profile-entry-panel";
import { UserProfileSidebarContainer } from "./UserProfileSidebarContainer";

export function userFromPresence(sessionId, presence, micPresences, mySessionId) {
  const meta = presence.metas[presence.metas.length - 1];
  const micPresence = micPresences.get(sessionId);
  return { id: sessionId, isMe: mySessionId === sessionId, micPresence, ...meta };
}
// sometimes the mic presence timeout fails to clear
let lastTimeout;
function usePeopleList(presences, mySessionId, friends, micUpdateFrequency = 500) {
  const [people, setPeople] = useState([]);
  useEffect(
    () => {
      clearTimeout(lastTimeout);
      let timeout;

      const friendsAndPresences = Object.assign({}, presences);
      const presenceFriendLookup = Object.fromEntries(
        Object.entries(presences).map(([, presence]) => [
          presence.metas[presence.metas.length - 1].profile.id,
          presence
        ])
      );
      friends.sort((a, b) => {
        if (a.type === b.type) {
          return 0;
        }
        if (a.type === "Leave") {
          return 1;
        }
        return -1;
      });
      friends.forEach(friend => {
        const localPresence = presenceFriendLookup[friend.actor.id];
        if (localPresence) {
          localPresence.metas[localPresence.metas.length - 1].friendStatus = friend;
        } else {
          friendsAndPresences[friend.id] = {
            id: friend.actor.id,
            metas: [
              {
                context: {},
                profile: {
                  displayName: friend.actor.name
                },
                roles: {},
                friendStatus: friend,
                remote: true
              }
            ]
          };
        }
      });
      function updateMicrophoneState() {
        const micPresences = getMicrophonePresences();

        setPeople(
          Object.entries(friendsAndPresences).map(([id, presence]) => {
            return userFromPresence(id, presence, micPresences, mySessionId);
          })
        );

        timeout = setTimeout(updateMicrophoneState, micUpdateFrequency);
        lastTimeout = timeout;
      }

      updateMicrophoneState();

      return () => {
        clearTimeout(timeout);
      };
    },
    [presences, friends, micUpdateFrequency, setPeople, mySessionId]
  );

  return people;
}

function PeopleListContainer({ hubChannel, people, onSelectPerson, onClose }) {
  const onMuteAll = useCallback(
    () => {
      for (const person of people) {
        if (person.presence === "room" && person.permissions && !person.permissions.mute_users) {
          hubChannel.mute(person.id);
        }
      }
    },
    [people, hubChannel]
  );

  return (
    <PeopleSidebar
      people={people}
      onSelectPerson={onSelectPerson}
      onClose={onClose}
      onMuteAll={onMuteAll}
      showMuteAll={hubChannel.can("mute_users")}
    />
  );
}

PeopleListContainer.propTypes = {
  onSelectPerson: PropTypes.func.isRequired,
  hubChannel: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  people: PropTypes.array.isRequired
};

export function PeopleSidebarContainer({
  hubChannel,
  presences,
  friends,
  mySessionId,
  displayNameOverride,
  store,
  mediaSearchStore,
  performConditionalSignIn,
  onCloseDialog,
  showNonHistoriedDialog,
  onClose
}) {
  const people = usePeopleList(presences, mySessionId, friends);
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const selectedPerson = people.find(person => person.id === selectedPersonId);
  const setSelectedPerson = useCallback(
    person => {
      setSelectedPersonId(person.id);
    },
    [setSelectedPersonId]
  );

  if (selectedPerson) {
    if (selectedPerson.id === mySessionId) {
      return (
        <ProfileEntryPanel
          containerType="sidebar"
          displayNameOverride={displayNameOverride}
          store={store}
          mediaSearchStore={mediaSearchStore}
          finished={() => setSelectedPersonId(null)}
          history={history}
          showBackButton
          onBack={() => setSelectedPersonId(null)}
        />
      );
    } else {
      return (
        <UserProfileSidebarContainer
          user={selectedPerson}
          hubChannel={hubChannel}
          performConditionalSignIn={performConditionalSignIn}
          showBackButton
          onBack={() => setSelectedPersonId(null)}
          onCloseDialog={onCloseDialog}
          showNonHistoriedDialog={showNonHistoriedDialog}
        />
      );
    }
  }

  return (
    <PeopleListContainer onSelectPerson={setSelectedPerson} onClose={onClose} hubChannel={hubChannel} people={people} />
  );
}

PeopleSidebarContainer.propTypes = {
  displayNameOverride: PropTypes.string,
  store: PropTypes.object.isRequired,
  mediaSearchStore: PropTypes.object.isRequired,
  hubChannel: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  mySessionId: PropTypes.string.isRequired,
  presences: PropTypes.object.isRequired,
  friends: PropTypes.array.isRequired,
  performConditionalSignIn: PropTypes.func.isRequired,
  onCloseDialog: PropTypes.func.isRequired,
  showNonHistoriedDialog: PropTypes.func.isRequired
};
