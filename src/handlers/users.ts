import { ICreateIndexRequest, IChangeUserMembershipRequest, IDeleteUserIndexRequest, IAddUserToOrganisationRequest, IAddUserToCollectionRequest, IRemoveCollectionFromUsersRequest, IRemoveUserFromCollectionRequest, IRemoveUserFromOrganisationRequest } from "../schemas/user";
import logger from "logger";
import { IUser } from "../models/user";
import database from "../services/database2";

export async function createUser(data: ICreateIndexRequest): Promise<boolean> {
  try {
    const user: IUser = {
      uuid: data.user.uuid,
      membership: data.membership,
      organisations: [],
      collections: [],
    };
    await database.createOwner(user, false);
    return true;
  } catch (error) {
    logger.error("There was an error creating a user", { error, data });
    return false;
  }
}

export async function deleteUser(data: IDeleteUserIndexRequest): Promise<boolean> {
  try {
    await database.deleteOwner(data.user.uuid, false);
    return true;
  } catch (error) {
    logger.error("There was an error deleting a user", { error, data });
    return false;
  }
}

export async function addOrganisationToUser(data: IAddUserToOrganisationRequest) {
  try {
    await database.appendOrganisationToUser(data.user.uuid, data.organisation.uuid);
    return true;
  } catch (error) {
    logger.error("There was an error adding an organisation to a user", { error, data });
    return false;
  }
}

export async function removeOrganisationFromUser(data: IRemoveUserFromOrganisationRequest) {
  try {
    const user = await database.getOwner(data.user.uuid, false) as IUser;

    const index = user.organisations?.findIndex(org => org === data.organisation.uuid);
    if (index === undefined || index < 0) {
      return true;
    }
    await database.removeOrganisationFromUser(data.user.uuid, index);
    return true;
  } catch (error) {
    logger.error("There was an error removing an organisation from a user", { error, data });
    return false;
  }
}

export async function addCollectionToUser(data: IAddUserToCollectionRequest) {
  try {
    const ownerId = data.collection.organisationId;
    const userToAddId = data.user?.uuid || data.collection.userId;
    await database.appendCollectionToUser(userToAddId, ownerId, data.collection.uuid, !!data.collection.organisationId);
    return true;
  } catch (error) {
    logger.error("There was an error adding a collection to a user", { error, data });
    return false;
  }
}

export async function removeCollectionFromUser(data: IRemoveUserFromCollectionRequest) {
  try {
    const userId = data.user.uuid;

    const dbUser = await database.getOwner(userId, false) as IUser;
    const index = dbUser.collections?.findIndex(collection => collection.uuid === data.collection.uuid);

    if (index === undefined || index < 0) {
      return true;
    }

    await database.removeCollectionFromUser(userId, index);
    return true;
  } catch (error) {
    logger.error("There was an error removing a collection from a user", { error, data });
    return false;
  }
}

export async function removeCollectionFromUsers(data: IRemoveCollectionFromUsersRequest) {
  try {
    const userIds = await data.collection.users;
    const promises = userIds.map(async id => {
      const user = await database.getOwner(id, false) as IUser;
      const index = user.collections?.findIndex(collection => collection.uuid === data.collection.uuid && collection.ownerId === (data.collection.organisationId || data.collection.userId));
      if (index === undefined || index < 0) {
        return;
      }
      await database.removeCollectionFromUser(user.uuid, index);
    });

    await Promise.all(promises);
    return true;
  } catch (error) {
    logger.error("There was an error removing a collection from users", { error, data });
    return false;
  }
}
