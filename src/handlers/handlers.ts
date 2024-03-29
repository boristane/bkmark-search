import logger from "logger";
import { IEventMessage } from "../models/events";
import { createBookmarkNotification, createBookmarkObject, deleteBookmarkNotification, deleteBookmarkObject, editBookmarkObject } from "./bookmarks";
import {
  createUser,
  deleteUser,
  addOrganisationToUser,
  addCollectionToUser,
  removeCollectionFromUsers,
  removeCollectionFromUser,
  removeOrganisationFromUser,
} from "./users";
import { changeOrganisationMembership, deleteOrganisation, initialiseOrganisationIndex } from "./organisations";

export async function handleMessage(message: IEventMessage): Promise<boolean> {
  const data = message.data;
  logger.info("Handling the message", { message });
  let res: boolean = false;
  switch (message.type) {
    case eventType.userCreated:
      res = await createUser(data);
      break;
    case eventType.organisationCreated:
      res = await initialiseOrganisationIndex(data);
      break;
    case eventType.userInternalOrganisationJoined:
      res = await addOrganisationToUser(data);
      break;
    case eventType.userInternalOrganisationLeft:
      res = await removeOrganisationFromUser(data);
      break;
    case eventType.collectionCreated:
    case eventType.userInternalCollectionJoined:
      res = await addCollectionToUser(data);
      break;
    case eventType.userInternalCollectionLeft:
      res = await removeCollectionFromUser(data);
      break;
    case eventType.collectionDeleted:
      res = await removeCollectionFromUsers(data);
      break;
    case eventType.userDeleted:
      res = await deleteUser(data);
      break;
    case eventType.organisationDeleted:
      res = await deleteOrganisation(data);
      break;
    case eventType.organisationMembershipChanged:
      res = await changeOrganisationMembership(data);
      break;
    case eventType.bookmarkCreated:
    case eventType.bookmarkRestored:
      res = await createBookmarkObject(data);
      break;
    case eventType.bookmarkNotificationCreated:
      res = await createBookmarkNotification(data);
      break;
    case eventType.bookmarkNotificationDeleted:
      res = await deleteBookmarkNotification(data);
      break;
    case eventType.bookmarkArchived:
    case eventType.bookmarkDeleted:
      res = await deleteBookmarkObject(data);
      break;
    case eventType.bookmarkUpdated:
    case eventType.bookmarkIncremented:
      res = await editBookmarkObject(data);
      break;
    default:
      logger.error("Unexpected event type found in message. Sending to dead letter queue.", { message });
      res = false;
  }
  return res;
}

export enum eventType {
  userCreated = "USER_CREATED",
  userDeleted = "USER_DELETED",
  
  bookmarkCreated = "BOOKMARK_CREATED",
  bookmarkArchived = "BOOKMARK_ARCHIVED",
  bookmarkUpdated = "BOOKMARK_UPDATED",
  bookmarkDeleted = "BOOKMARK_DELETED",
  bookmarkRestored = "BOOKMARK_RESTORED",
  bookmarkIncremented = "BOOKMARK_INCREMENTED",
  
  organisationCreated = "ORGANISATION_CREATED",
  organisationMembershipChanged = "ORGANISATION_MEMBERSHIP_CHANGED",
  organisationDeleted = "ORGANISATION_DELETED",

  userInternalOrganisationJoined = "USER_INTERNAL_ORGANISATION_JOINED",
  userInternalCollectionJoined = "USER_INTERNAL_COLLECTION_JOINED",
  userInternalOrganisationLeft = "USER_INTERNAL_ORGANISATION_LEFT",
  userInternalCollectionLeft = "USER_INTERNAL_COLLECTION_LEFT",

  collectionCreated = "COLLECTION_CREATED",
  collectionDeleted = "COLLECTION_DELETED",

  bookmarkNotificationCreated = "BOOKMARK_NOTIFICATION_CREATED",
  bookmarkNotificationDeleted = "BOOKMARK_NOTIFICATION_DELETED",
}
