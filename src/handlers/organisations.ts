import { ICreateOrganisationIndexRequest, IDeleteOrganisationIndexRequest } from "../schemas/organisation";
import algolia from "../services/algolia";
import logger from "logger";
import database from "../services/database2";
import { IOrganisation } from "../models/organisation";
import { IChangeOrganisationMembershipRequest } from "../schemas/user";
import { getFullPage } from "../services/scrapper";

export async function initialiseOrganisationIndex(data: ICreateOrganisationIndexRequest): Promise<boolean> {
  try {
    await algolia.createIndex(data.organisation.uuid);
    const organisation: IOrganisation = {
      uuid: data.organisation.uuid,
      membership: data.membership,
    };
    await database.createOwner(organisation, true);
    return true;
  } catch (error) {
    logger.error("There was an error creating an organisation and index", { error, data });
    return false;
  }
}

export async function changeOrganisationMembership(data: IChangeOrganisationMembershipRequest): Promise<boolean> {
  try {
    const { organisation, membership, oldMembership } = data;
    await database.changeOwnerMembership(organisation.uuid, membership);
    if (membership.tier === 0) {
      const objectIDs = await (await database.getAllObjectIDs(organisation.uuid)).map(id => id.objectId);
      algolia.removeFullPageFromBookmarks(organisation.uuid, objectIDs);
    }
    if(oldMembership.tier === 0 && membership.tier > 0) {
      const bookmarks = await (await database.getAllObjectIDs(organisation.uuid));
      const promises = bookmarks.map(async bookmark => {
        const fullPage = await getFullPage(bookmark.url);
        await algolia.setFullPageToBookmark(bookmark.organisationId, fullPage, bookmark.objectId);
      });
      await Promise.all(promises);
    }
    return true;
  } catch (err) {
    const message = "Unexpected error when changing the membership of a user";
    logger.error(message, { data, error: err });
    return false;
  }
}

export async function deleteOrganisation(data: IDeleteOrganisationIndexRequest): Promise<boolean> {
  try {
    await database.deleteOwner(data.organisation.uuid, true);
    await algolia.deleteIndex(data.organisation.uuid);
    return true;
  } catch (error) {
    logger.error("There was an error deleting an organisation", { error, data });
    return false;
  }
}
