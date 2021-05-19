import {ICreateOrganisationIndexRequest} from "../schemas/organisation";
import algolia from "../services/algolia";
import logger from "logger";
import database from "../services/database";
import {IOrganisation} from "../models/organisation";
import { IChangeOrganisationMembershipRequest } from "../schemas/user";

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
    const { organisation, membership } = data;
    await database.changeOwnerMembership(organisation.uuid, membership);
    return true;
  } catch (err) {
    const message = "Unexpected error when changing the membership of a user";
    logger.error(message, { data, error: err });
    return false;
  }
}
