import logger from "logger";
import { IEventMessage } from "../models/events";
import { createBookmarkObject, deleteBookmarkObject, editBookmarkObject } from "./bookmarks";
import { changeUserMembership, initialiseIndex, deleteIndex } from "./users";

export async function handleMessage(message: IEventMessage): Promise<boolean> {
  const data = message.data;
  logger.info("Handling the message", { message });
  let res: boolean = false;
  switch (message.type) {
    case eventType.userCreated:
      res = await initialiseIndex(data);
      break;
    case eventType.userDeleted:
      res = await deleteIndex(data);
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
}
