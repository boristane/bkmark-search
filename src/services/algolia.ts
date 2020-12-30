
import logger from "logger";
import { IBookmarkRequest } from "../schemas/bookmark";
import { initialiseAlgolia } from "../utils/algolia-helpers";
import Exception from "../utils/error";
import { omit } from "../utils/utils";

async function createUserIndex(userId: string) {
  const client = initialiseAlgolia();

  const index = client.initIndex(`user#${userId}`);
  try {
    await index.setSettings({
      customRanking: ["desc(created)"],
      searchableAttributes: [
        "notes",
        "metadata.title",
        "metadata.description",
        "tags.name",
        "fullPage.body",
      ]
    });
  } catch (error) {
    logger.error("There was an error initialising the Algolia index", { error, userId });
    throw error;
  }
}


async function createBookmark(bookmark: IBookmarkRequest): Promise<string> {
  const client = initialiseAlgolia();
  const index = client.initIndex(`user#${bookmark.userId}`);

  try {
    const { objectID } = await index.saveObject(bookmark, {
      autoGenerateObjectIDIfNotExist: true,
    });
    return objectID;
  } catch (error) {
    logger.error("There was an error creating an object in algolia", { error, bookmark });
    throw error;
  }
}

async function updateBookmark(bookmark: IBookmarkRequest, objectID: string): Promise<void> {
  const client = initialiseAlgolia();
  const index = client.initIndex(`user#${bookmark.userId}`);

  try {
    await index.partialUpdateObject({ ...bookmark, objectID });
  } catch (error) {
    logger.error("There was an error udating an object in algolia", { error, bookmark });
    throw error;
  }
}

async function deleteBookmark(bookmark: IBookmarkRequest, objectId: string) {
  const client = initialiseAlgolia();
  const index = client.initIndex(`user#${bookmark.userId}`);

  try {
    await index.deleteObject(objectId);
  } catch (error) {
    logger.error("There was an error deleting a bookmark object from an indices", { error, bookmark, objectId });
    throw error;
  }
}

async function search(userId: string, query: string) {
  const client = initialiseAlgolia();
  try {
    const index = client.initIndex(`user#${userId}`);
    const hits = (await index.search(query)).hits.map(h => omit(["_highlightResult", "fullPage"], h));
    return hits;
  } catch (error) {
    logger.error("There was an error running a search request on Algolia", { error, userId, query });
    throw Exception("Unkown Error", 500);
  }
}

export default {
  createUserIndex,
  search,
  createBookmark,
  deleteBookmark,
  updateBookmark,
}