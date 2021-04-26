import logger from "logger";
import { IBookmark } from "../models/bookmark";
import { IBookmarkRequest } from "../schemas/bookmark";
import { initialiseAlgolia } from "../utils/algolia-helpers";
import Exception from "../utils/error";
import { omit } from "../utils/utils";

async function createIndex(ownerId: string, isOrganisation: boolean) {
  const client = initialiseAlgolia();

  const index = client.initIndex(`${isOrganisation ? "organisation" : "user"}#${ownerId}`);
  try {
    await index.setSettings({
      customRanking: ["desc(created)"],
      searchableAttributes: ["title", "notes", "metadata.title", "metadata.description", "tags.name", "fullPage.body"],
    });
  } catch (error) {
    logger.error("There was an error initialising the Algolia index", { error, ownerId });
    throw error;
  }
}

async function deleteIndex(ownerId: string, isOrganisation: boolean) {
  const client = initialiseAlgolia();

  const index = client.initIndex(`${isOrganisation ? "organisation" : "user"}#${ownerId}`);
  try {
    await index.delete();
  } catch (error) {
    logger.error("There was an error deleting a user Algolia index", { error, ownerId });
    throw error;
  }
}

async function createBookmark(bookmark: IBookmarkRequest): Promise<string> {
  const client = initialiseAlgolia();

  const ownerId = bookmark.organisationId || bookmark.userId;
  const indexName = `${bookmark.organisationId ? "organisation" : "user"}#${ownerId}`;

  const index = client.initIndex(indexName);
  const maxLength = 13000;
  bookmark.fullPage.body = bookmark.fullPage.body.slice(0, maxLength);

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
  const ownerId = bookmark.organisationId || bookmark.userId;
  const indexName = `${bookmark.organisationId ? "organisation" : "user"}#${ownerId}`;

  const index = client.initIndex(indexName);

  try {
    await index.partialUpdateObject({ ...bookmark, objectID });
  } catch (error) {
    logger.error("There was an error udating an object in algolia", { error, bookmark });
    throw error;
  }
}

async function deleteBookmark(bookmark: IBookmarkRequest, objectId: string) {
  const client = initialiseAlgolia();
  const ownerId = bookmark.organisationId || bookmark.userId;
  const indexName = `${bookmark.organisationId ? "organisation" : "user"}#${ownerId}`;

  const index = client.initIndex(indexName);

  try {
    await index.deleteObject(objectId);
  } catch (error) {
    logger.error("There was an error deleting a bookmark object from an indices", { error, bookmark, objectId });
    throw error;
  }
}

async function search(ownerId: string, query: string, isOrganisation: boolean): Promise<IBookmark[]> {
  const client = initialiseAlgolia();
  try {
    const indexName = `${isOrganisation ? "organisation" : "user"}#${ownerId}`;

    const index = client.initIndex(indexName);
    const hits = (await index.search(query)).hits.map((h) => omit(["_highlightResult", "fullPage"], h));
    return hits as IBookmark[];
  } catch (error) {
    logger.error("There was an error running a search request on Algolia", { error, ownerId, query, isOrganisation });
    throw Exception("Unkown Error", 500);
  }
}

export default {
  createIndex,
  deleteIndex,
  search,
  createBookmark,
  deleteBookmark,
  updateBookmark,
};
