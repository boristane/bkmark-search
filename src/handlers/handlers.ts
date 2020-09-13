import logger from "logger";
import { IEventMessage } from "../models/events";
import { createBookmarkObject, deleteBookmarkObject, editBookmarkObject } from "./bookmarks";
import { initialiseIndex } from "./users";

export async function handleMessage(message: IEventMessage): Promise<boolean> {
  const data = message.data;
  logger.info("Handling the message", { message });
  let res: boolean = false;
  switch (message.type) {
    case eventType.userCreated:
      res = await initialiseIndex(data);
      break;
    case eventType.bookmarkCreated:
      res = await createBookmarkObject(data);
      break;
    case eventType.bookmarkArchived:
      res = await deleteBookmarkObject(data);
      break;
    case eventType.bookmarkUpdated:
      res = await editBookmarkObject(data);
      break;
    default:
      logger.error("Unexpected event type found in message. Sending to dead letter queue.", { message });
      res = false;
  }
  return res
}

export enum eventType {
  userCreated = "USER_CREATED",
  bookmarkCreated = "BOOKMARK_CREATED",
  bookmarkArchived = "BOOKMARK_ARCHIVED",
  bookmarkUpdated = "BOOKMARK_UPDATED",
}

