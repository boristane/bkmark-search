import { DynamoDB } from "aws-sdk";
import { initialiseDb } from "../utils/db-helpers";
import logger from "logger";
import { IBookmarkRequest } from "../schemas/bookmark";
import moment from "dayjs";
import Exception from "../utils/error";
import { IUser } from "../models/user";

function initialise(): { tableName: string, dynamoDb: DynamoDB.DocumentClient } {
  const tableName = process.env.PROJECTION_TABLE || "";
  return initialiseDb(tableName);
}

async function createBookmark(objectId: string, bookmark: IBookmarkRequest): Promise<void> {
  const { tableName, dynamoDb } = initialise();
  const timestamp = moment().format();
  const dbCollection: IDatabaseItem = {
    partitionKey: `user#${bookmark.userId}#bookmark#${bookmark.uuid}`,
    data: {
      objectId,
    },
    created: timestamp,
  };
  const params = {
    TableName: tableName,
    Item: dbCollection,
    ConditionExpression: 'attribute_not_exists(partitionKey)'
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
      partitionKey: `user#${bookmark.userId}#bookmark#${bookmark.uuid}`,
    }
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
      partitionKey: `user#${bookmark.userId}#bookmark#${bookmark.uuid}`,
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

async function createUser(user: IUser): Promise<void> {
  const { tableName, dynamoDb } = initialise();
  user.created = moment().format();
  user.updated = moment().format();

  const dbUser: IDatabaseItem = {
    partitionKey: `user#${user.uuid}`,
    data: user,
    created: user.created,
    updated: user.updated,
  };
  const params = {
    TableName: tableName,
    Item: dbUser,
    ConditionExpression: 'attribute_not_exists(partitionKey)'
  };

  try {
    await dynamoDb.put(params).promise();
  } catch (e) {
    const message = "Failed to save user in dynamo db";
    logger.error(message, { params, error: e });
    throw e;
  }
}

async function changeUserMembership(uuid: string, sequence: number, membership: { tier: number; isActive: boolean }): Promise<IUser> {
  const { tableName, dynamoDb } = initialise();
  const params = {
    TableName: tableName,
    Key: {
      partitionKey: `user#${uuid}`,
    },
    UpdateExpression: `set #data.#membership = :membership, #data.#sequence = :s, #data.updated = :updated, updated = :updated`,
    ExpressionAttributeNames: {
      "#data": "data",
      "#sequence": "sequence",
      "#membership": "membership",
    },
    ExpressionAttributeValues: {
      ":s": sequence,
      ":updated": moment().format(),
      ":membership": membership,
    },
    ReturnValues: "ALL_NEW",
  }
  try {
    return (await dynamoDb.update(params).promise()).Attributes?.data;
  } catch (e) {
    const message = "Failed to change the membership of a user in dynamo db";
    logger.error(message, { params, error: e });
    throw e;
  }
}

async function getUser(userId: string): Promise<IUser> {
  const { tableName, dynamoDb } = initialise();
  const params = {
    TableName: tableName,
    Key: {
      partitionKey: `user#${userId}`,
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

interface IDatabaseItem {
  partitionKey: string;
  data: Record<string, any>;
  created: string;
  updated?: string;
}

export default {
  getBookmarkObjectId,
  createBookmark,
  deleteBookmark,
  createUser,
  changeUserMembership,
  getUser,
}
