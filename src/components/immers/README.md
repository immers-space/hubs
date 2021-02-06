# Immers Space Hubs components

## spoke-tagger
System allows you to encode interactivity when editing scenes in Spoke.
Add names to entities in spoke that begin with `st-` followed by a component name
and `spoke-tagger` will add that component to the entity in Hubs.
Separate multiple components with a space, prefixing each with `st-`.
Any terms in the name not starting with `st-` will be ignored.

E.g. name an object `bonus-content st-monetization-visible st-monetization-networked`
and `spoke-tagger` will add `monetization-visible` and `monetization-networked`
to the entity, making it visible for everyone in the room when at least one immerser
is monetized.

## monetization-interactable

Add this to an entity that would normally be interactable (e.g. a link) to make it
only interactable for users that are monetized

## monetization-visible

Only appear for users that are monetized

## monetization-invisible

Only appear for uses that are not monetized

## monetization-required

Add to an object to turn it into a monetization explainer.
It adds a hover menu that shows either "payment required" button
with a link to info about how to sign up
or a "thanks for paying!" button that does nothing.

## monetization-networked

Add this to an entity to make any of the above monetization features apply
for everyone in the room if at least one immerser is monetized.