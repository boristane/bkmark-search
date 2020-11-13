import { DynamoDB } from "aws-sdk";
import { initialiseDb } from "../utils/db-helpers";
import logger from "logger";
import { IBookmarkRequest } from "../schemas/bookmark";
import moment from "dayjs";
import Exception from "../utils/error";

function initialise(): { tableName: string, dynamoDb: DynamoDB.DocumentClient } {
  const tableName = process.env.PROJECTION_TABLE || "";
  return initialiseDb(tableName);
}

async function createBookmark(objectId: string, bookmark: IBookmarkRequest): Promise<void> {
  const { tableName, dynamoDb } = initialise();
  const timestamp = moment().format();
  const dbCollection: IDatabaseItem = {
    partitionKey: `user#${bookmark.userId}#bookmark#${bookmark.uuid}`,
    objectId: objectId,
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
    ProjectionExpression: "#objectId",
    ExpressionAttributeNames: {
      "#objectId": "objectId",
    },
  };
  try {
    const record = await dynamoDb.get(params).promise()
    if (record.Item) {
      return record.Item.objectId;
    } else {
      throw Exception("Bookmark object not found", 404);
    }
  } catch (e) {
    logger.error("Error getting the bookmark object", { params, error: e });
    throw e;
  }
}

interface IDatabaseItem {
  partitionKey: string;
  objectId: string;
  created: string;
}

export default {
  getBookmarkObjectId,
  createBookmark,
  deleteBookmark,
}
