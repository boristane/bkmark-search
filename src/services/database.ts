import { initialiseDb } from "../utils/db-helpers";
import logger from "logger";
import { IBookmarkRequest } from "../schemas/bookmark";
import moment from "dayjs";
import Exception from "../utils/error";
import { IUser } from "../models/user";
import { IOrganisation } from "../models/organisation";
import { DocumentClient } from "aws-sdk/clients/dynamodb";

function initialise(): { tableName: string; dynamoDb: DocumentClient } {
  const tableName = process.env.PROJECTION_TABLE!;
  return initialiseDb(tableName);
}

async function createBookmark(objectId: string, bookmark: IBookmarkRequest): Promise<void> {
  const { tableName, dynamoDb } = initialise();
  const timestamp = moment().format();

  const dbBookmark: IDatabaseItem = {
    partitionKey: `organisation#${bookmark.organisationId}#bookmark#${bookmark.uuid}`,
    data: {
      objectId,
    },
    created: timestamp,
    type: "bookmark",
  };
  const params = {
    TableName: tableName,
    Item: dbBookmark,
    ConditionExpression: "attribute_not_exists(partitionKey)",
  };

  try {
    await dynamoDb.put(params).promise();
  } catch (e) {
    const message = "Failed to save a bookmark in dynamo db";
    logger.error(message, { params, error: e });
    throw e;
  }
}

async function deleteBookmark(bookmark: IBookmarkRequest): Promise<void> {
  const { tableName, dynamoDb } = initialise();


  const params = {
    TableName: tableName,
    Key: {
      partitionKey: `organisation#${bookmark.organisationId}#bookmark#${bookmark.uuid}`,
    },
  };

  try {
    await dynamoDb.delete(params).promise();
  } catch (e) {
    const message = "Failed to delete bookmark from dynamo db";
    logger.error(message, { params, error: e });
    throw e;
  }
}

async function getBookmarkObjectId(bookmark: IBookmarkRequest): Promise<string> {
  const { tableName, dynamoDb } = initialise();

  const params = {
    TableName: tableName,
    Key: {
      partitionKey: `organisation#${bookmark.organisationId}#bookmark#${bookmark.uuid}`,
    },
    ProjectionExpression: "#data",
    ExpressionAttributeNames: {
      "#data": "data",
    },
  };
  try {
    const record = await dynamoDb.get(params).promise();
    if (record.Item) {
      return record.Item.data.objectId;
    } else {
      throw Exception("Bookmark object not found", 404);
    }
  } catch (e) {
    logger.error("Error getting the bookmark object", { params, error: e });
    throw e;
  }
}

async function createOwner(owner: IUser | IOrganisation, isOrganisation: boolean): Promise<void> {
  const { tableName, dynamoDb } = initialise();
  owner.created = moment().format();
  owner.updated = moment().format();

  const dbUser: IDatabaseItem = {
    partitionKey: `${isOrganisation ? "organisation" : "user"}#${owner.uuid}`,
    data: owner,
    created: owner.created,
    updated: owner.updated,
    type: `${isOrganisation ? "organisation" : "user"}`,
  };
  const params = {
    TableName: tableName,
    Item: dbUser,
    ConditionExpression: "attribute_not_exists(partitionKey)",
  };

  try {
    await dynamoDb.put(params).promise();
  } catch (e) {
    const message = "Failed to save owner in dynamo db";
    logger.error(message, { params, error: e });
    throw e;
  }
}

async function changeOwnerMembership(
  uuid: string,
  membership: { tier: number; isActive: boolean },
): Promise<IUser | IOrganisation> {
  const { tableName, dynamoDb } = initialise();
  const params = {
    TableName: tableName,
    Key: {
      partitionKey: `organisation#${uuid}`,
    },
    UpdateExpression: `set #data.#membership = :membership, #data.updated = :updated, updated = :updated`,
    ExpressionAttributeNames: {
      "#data": "data",
      "#membership": "membership",
    },
    ExpressionAttributeValues: {
      ":updated": moment().format(),
      ":membership": membership,
    },
    ReturnValues: "ALL_NEW",
  };
  try {
    return (await dynamoDb.update(params).promise()).Attributes?.data;
  } catch (e) {
    const message = "Failed to change the membership of a owner in dynamo db";
    logger.error(message, { params, error: e });
    throw e;
  }
}

async function getOwner(ownerId: string, isOrganisation: boolean): Promise<IUser | IOrganisation> {
  const { tableName, dynamoDb } = initialise();
  const params = {
    TableName: tableName,
    Key: {
      partitionKey: `${isOrganisation ? "organisation" : "user"}#${ownerId}`,
    },
    ProjectionExpression: "#data",
    ExpressionAttributeNames: {
      "#data": "data",
    },
  };
  try {
    const record = await dynamoDb.get(params).promise();
    if (record.Item) {
      return record.Item.data;
    } else {
      throw Exception("User not found", 404);
    }
  } catch (e) {
    logger.error("Error getting the user", { params, error: e });
    throw e;
  }
}

async function getAllUsers(): Promise<IUser[]> {
  const { tableName, dynamoDb } = initialise();
  let lastEvaluatedKey: DocumentClient.Key | undefined = undefined;
  let users: IUser[] = [];
  do {
    const params: DocumentClient.QueryInput = {
      TableName: tableName,
      IndexName: "type",
      KeyConditionExpression: "#pk = :pkey",
      ProjectionExpression: "#d",
      ExpressionAttributeValues: {
        ":pkey": `user`,
      },
      ExpressionAttributeNames: {
        "#d": "data",
        "#pk": "type",
      },
      ExclusiveStartKey: lastEvaluatedKey,
    };
    try {
      const records = await dynamoDb.query(params).promise();
      if (records.Items) {
        const result = records.Items.map((item) => item.data) as IUser[];
        users = [...users, ...result];
        lastEvaluatedKey = records.LastEvaluatedKey;
      } else {
        throw Exception("Users not found", 404);
      }
    } catch (e) {
      logger.error("Error getting the users", { params, error: e });
      throw e;
    }
  } while (lastEvaluatedKey !== undefined);

  return users;
}

async function deleteOwner(userId: string, isOrganisation: boolean): Promise<void> {
  const { tableName, dynamoDb } = initialise();

  const params = {
    TableName: tableName,
    Key: {
      partitionKey: `${isOrganisation ? "organisation" : "user"}#${userId}`,
    },
  };

  try {
    await dynamoDb.delete(params).promise();
  } catch (e) {
    const message = "Failed to delete user from dynamo db";
    logger.error(message, { params, error: e });
    throw e;
  }
}

async function appendOrganisationToUser(userId: string, organisationId: string): Promise<IUser> {
  const { tableName, dynamoDb } = initialise();
  const params = {
    TableName: tableName,
    Key: {
      partitionKey: `user#${userId}`,
    },
    UpdateExpression: `set #data.#organisations = list_append(if_not_exists(#data.#organisations, :emptyArray), :organisationId), #data.updated = :updated, updated = :updated`,
    ExpressionAttributeNames: {
      "#data": "data",
      "#organisations": "organisations",
    },
    ExpressionAttributeValues: {
      ":updated": moment().format(),
      ":emptyArray": [],
      ":organisationId": [organisationId],
    },
    ReturnValues: "ALL_NEW",
  };
  try {
    return (await dynamoDb.update(params).promise()).Attributes?.data;
  } catch (e) {
    const message = "Failed to append an organisations to a user in dynamo db";
    logger.error(message, { params, error: e });
    throw e;
  }
}

async function appendCollectionToUser(
  userId: string,
  ownerId: string,
  collectionId: string,
  isOrganisation: boolean
): Promise<IUser> {
  const { tableName, dynamoDb } = initialise();
  const params = {
    TableName: tableName,
    Key: {
      partitionKey: `user#${userId}`,
    },
    UpdateExpression: `set #data.#collections = list_append(if_not_exists(#data.#collections, :emptyArray), :collection), #data.updated = :updated, updated = :updated`,
    ExpressionAttributeNames: {
      "#data": "data",
      "#collections": "collections",
    },
    ExpressionAttributeValues: {
      ":updated": moment().format(),
      ":emptyArray": [],
      ":collection": [{ uuid: collectionId, ownerId, isOrganisation }],
    },
    ReturnValues: "ALL_NEW",
  };
  try {
    return (await dynamoDb.update(params).promise()).Attributes?.data;
  } catch (e) {
    const message = "Failed to append a collection to a user in dynamo db";
    logger.error(message, { params, error: e });
    throw e;
  }
}

async function removeCollectionFromUser(
  userId: string,
  index: number,
): Promise<IUser> {
  const { tableName, dynamoDb } = initialise();
  const params = {
    TableName: tableName,
    Key: {
      partitionKey: `user#${userId}`,
    },
    UpdateExpression: `remove #data.#collections[${index}] set #data.updated = :updated, updated = :updated`,
    ExpressionAttributeNames: {
      "#data": "data",
      "#collections": "collections",
    },
    ExpressionAttributeValues: {
      ":updated": moment().format(),
    },
    ReturnValues: "ALL_NEW",
  };
  try {
    return (await dynamoDb.update(params).promise()).Attributes?.data;
  } catch (e) {
    const message = "Failed to remove a collection to a user in dynamo db";
    logger.error(message, { params, error: e });
    throw e;
  }
}

interface IDatabaseItem {
  partitionKey: string;
  data: Record<string, any>;
  created: string;
  updated?: string;
  type: string;
}

export default {
  getBookmarkObjectId,
  createBookmark,
  deleteBookmark,
  createOwner,
  changeOwnerMembership,
  getOwner,
  deleteOwner,
  appendOrganisationToUser,
  appendCollectionToUser,
  removeCollectionFromUser,
  getAllUsers,
};
