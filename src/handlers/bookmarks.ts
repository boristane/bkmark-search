import { IBookmarkRequest } from "../schemas/bookmark";
import logger from "logger";
import algolia from "../services/algolia";
import database from "../services/database";
import { getFullPage } from "../services/scrapper";

export async function createBookmarkObject(data: { bookmark: IBookmarkRequest }): Promise<boolean> {
  try {
    const { bookmark } = data;
    const fullPage = await getFullPage(bookmark.url);
    const objectId = await algolia.createBookmark({ fullPage, ...bookmark });
    await database.createBookmark(objectId, bookmark);
  } catch (error) {
    logger.error("There was an error creating a bookmark for search", { data, error });
    return false;
  }
  return true;
}

export async function deleteBookmarkObject(data: { bookmark: IBookmarkRequest }): Promise<boolean> {
  try {
    const objectId = await database.getBookmarkObjectId(data.bookmark);
    await algolia.deleteBookmark(data.bookmark, objectId);
    await database.deleteBookmark(data.bookmark);
  } catch (error) {
    logger.error("There was an error deleting a bookmark from search", { data, error });
    return false;
  }
  return true;
}

export async function editBookmarkObject(data: { bookmark: IBookmarkRequest; previousAttributes: { organisationId?: string } }): Promise<boolean> {
  try {
    const oldOrganisationId = data.previousAttributes.organisationId;
    const objectId = await database.getBookmarkObjectId(data.bookmark, oldOrganisationId);
    if(oldOrganisationId && data.bookmark.organisationId !== oldOrganisationId) {
      await database.createBookmark(objectId, data.bookmark);
      await database.deleteBookmark(data.bookmark, oldOrganisationId);
    }
    await algolia.updateBookmark(data.bookmark, objectId);
  } catch (error) {
    logger.error("There was an error updating a bookmark from search", { data, error });
    return false;
  }
  return true;
}