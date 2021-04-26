import {ICreateOrganisationIndexRequest} from "../schemas/organisation";
import algolia from "../services/algolia";
import logger from "logger";
import database from "../services/database";
import {IOrganisation} from "../models/organisation";

export async function initialiseOrganisationIndex(data: ICreateOrganisationIndexRequest): Promise<boolean> {
  try {
    await algolia.createIndex(data.organisation.uuid, true);
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