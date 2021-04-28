import { ICreateIndexRequest, IChangeUserMembershipRequest, IDeleteUserIndexRequest, IAddUserToOrganisationRequest, IAddUserToCollectionRequest, IRemoveCollectionFromUsersRequest } from "../schemas/user";
import algolia from "../services/algolia";
import logger from "logger";
import { IUser } from "../models/user";
import database from "../services/database";

export async function initialiseUserIndex(data: ICreateIndexRequest): Promise<boolean> {
  try {
    await algolia.createIndex(data.user.uuid, false);
    const user: IUser = {
      uuid: data.user.uuid,
      membership: data.membership,
      organisations: [],
      collections: [],
    };
    await database.createOwner(user, false);
    return true;
  } catch (error) {
    logger.error("There was an error creating a user and index", { error, data });
    return false;
  }
}

export async function changeUserMembership(data: IChangeUserMembershipRequest): Promise<boolean> {
  try {
    const { user, membership } = data;
    await database.changeOwnerMembership(user.uuid, membership, false);
    return true;
  } catch (err) {
    const message = "Unexpected error when changing the membership of a user";
    logger.error(message, { data, error: err });
    return false;
  }
}

export async function deleteUserIndex(data: IDeleteUserIndexRequest): Promise<boolean> {
  try {
    await algolia.deleteIndex(data.user.uuid, false);
    await database.deleteOwner(data.user.uuid, false);
    return true;
  } catch (error) {
    logger.error("There was an error deleting a user and index", { error, data });
    return false;
  }
}

export async function addUserToOrganisation(data: IAddUserToOrganisationRequest) {
  try {
    await database.appendOrganisationToUser(data.user.uuid, data.organisation.uuid);
    return true;
  } catch (error) {
    logger.error("There was an error adding a user to an organisation", { error, data });
    return false;
  }
} 

export async function addUserToCollection(data: IAddUserToCollectionRequest) {
  try {
    const ownerId = data.collection.organisationId || data.collection.userId;
    const userToAddId = data.user?.uuid || data.collection.userId;
    await database.appendCollectionToUser(userToAddId, ownerId, data.collection.uuid, !!data.collection.organisationId);
    return true;
  } catch (error) {
    logger.error("There was an error adding a user to a collection", { error, data });
    return false;
  }
}

export async function removeCollectionFromUsers(data: IRemoveCollectionFromUsersRequest) {
  try {
    const userIds = await data.collection.users;
    const promises = userIds.map(async id => {
      const user = await database.getOwner(id, false);
      const index = user.collections?.findIndex(collection => collection.uuid === data.collection.uuid && collection.ownerId === (data.collection.organisationId || data.collection.userId));
      if(!index) {
        return;
      }
      await database.removeCollectionFromUser(user.uuid, index);
    });

    await Promise.all(promises);
    return true;
  } catch (error) {
    logger.error("There was an error adding a user to a collection", { error, data });
    return false;
  }
} 
