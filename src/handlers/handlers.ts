import logger from "logger";
import { IEventMessage } from "../models/events";
import { createBookmarkObject, deleteBookmarkObject, editBookmarkObject } from "./bookmarks";
import {
  changeUserMembership,
  initialiseUserIndex,
  deleteUserIndex,
  addUserToOrganisation,
  addUserToCollection,
} from "./users";
import { initialiseOrganisationIndex } from "./organisations";

export async function handleMessage(message: IEventMessage): Promise<boolean> {
  const data = message.data;
  logger.info("Handling the message", { message });
  let res: boolean = false;
  switch (message.type) {
    case eventType.userCreated:
      res = await initialiseUserIndex(data);
      break;
    case eventType.organisationCreated:
      res = await initialiseOrganisationIndex(data);
      break;
    case eventType.userInternalOrganisationJoined:
      res = await addUserToOrganisation(data);
      break;
    case eventType.userInternalCollectionJoined:
      res = await addUserToCollection(data);
      break;
    case eventType.userDeleted:
      res = await deleteUserIndex(data);
      break;
    case eventType.userMembeshipChanged:
      res = await changeUserMembership(data);
      break;
    case eventType.bookmarkCreated:
    case eventType.bookmarkRestored:
      res = await createBookmarkObject(data);
      break;
    case eventType.bookmarkArchived:
    case eventType.bookmarkDeleted:
      res = await deleteBookmarkObject(data);
      break;
    case eventType.bookmarkUpdated:
    case eventType.bookmarkIncremented:
    case eventType.bookmarkFavourited:
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
  userMembeshipChanged = "USER_MEMBERSHIP_CHANGED",

  bookmarkCreated = "BOOKMARK_CREATED",
  bookmarkArchived = "BOOKMARK_ARCHIVED",
  bookmarkUpdated = "BOOKMARK_UPDATED",
  bookmarkDeleted = "BOOKMARK_DELETED",
  bookmarkFavourited = "BOOKMARK_FAVOURITED",
  bookmarkRestored = "BOOKMARK_RESTORED",
  bookmarkIncremented = "BOOKMARK_INCREMENTED",

  organisationCreated = "ORGANISATION_CREATED",

  userInternalOrganisationJoined = "USER_INTERNAL_ORGANISATION_JOINED",
  userInternalCollectionJoined = "USER_INTERNAL_COLLECTION_JOINED",
}
