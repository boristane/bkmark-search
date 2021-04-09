import { ICreateIndexRequest, IChangeUserMembershipRequest } from "../schemas/user";
import algolia from "../services/algolia";
import logger from "logger";
import { IUser } from "../models/user";
import database from "../services/database";

export async function initialiseIndex(data: ICreateIndexRequest ): Promise<boolean> {
  try {
    await algolia.createUserIndex(data.user.uuid);
    const user: IUser = {
      uuid: data.user.uuid,
      membership: data.membership,
    };
    await database.createUser(user);
    return true;
  } catch (error) {
    logger.error("There was an error creating a user and index", { error, data });
    return false;
  }
}

export async function changeUserMembership(data: IChangeUserMembershipRequest ): Promise<boolean> {
  try {
    const { user, membership } = data;
    await database.changeUserMembership(user.uuid, membership);
    return true;
  } catch (err) {
    const message = "Unexpected error when changing the membership of a user";
    logger.error(message, { data, error: err, });
    return false;
  }
}
