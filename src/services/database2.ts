import { initialiseDb } from "../utils/db-helpers";
import logger from "logger";
import { IBookmarkRequest } from "../schemas/bookmark";
import moment from "dayjs";
import Exception from "../utils/error";
import { IUser } from "../models/user";
import { IOrganisation } from "../models/organisation";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { IBookmarkNotificationRequest } from "../schemas/notification";

function initialise(): { tableName: string; dynamoDb: DocumentClient } {
  const tableName = process.env.PROJECTION_TABLE_2!;
  return initialiseDb(tableName);
}

async function createBookmark(objectId: string, bookmark: IBookmarkRequest): Promise<void> {
  const { tableName, dynamoDb } = initialise();
  const timestamp = moment().format();

  const dbBookmark: IDatabaseItem = {
    partitionKey: `organisation#${bookmark.organisationId}`,
    sortKey: `collection#${bookmark.collection.uuid}#bookmark#${bookmark.uuid}`,
    data: {
      objectId,
      organisationId: bookmark.organisationId,
      collectionId: bookmark.collection.uuid,
      uuid: bookmark.uuid,
      url: bookmark.url,
    },
    created: timestamp,
    updated: timestamp,
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

async function deleteBookmark(bookmark: IBookmarkRequest, previousAttributes?: { organisationId?: string, collectionId?: string }): Promise<void> {
  const { tableName, dynamoDb } = initialise();
  let key = {
    partitionKey: `organisation#${bookmark.organisationId}`,
    sortKey: `collection#${bookmark.collectionId}#bookmark#${bookmark.uuid}`,
  }

  if (previousAttributes && Object.keys(previousAttributes).length > 0) {
    key = {
      partitionKey: `organisation#${previousAttributes.organisationId}`,
      sortKey: `collection#${previousAttributes.collectionId}#bookmark#${bookmark.uuid}`,
    }
  }

  const params = {
    TableName: tableName,
    Key: key,
  };

  try {
    await dynamoDb.delete(params).promise();
  } catch (e) {
    const message = "Failed to delete bookmark from dynamo db";
    logger.error(message, { params, error: e });
    throw e;
  }
}

async function getBookmarkObjectId(bookmark: IBookmarkRequest, previousAttributes?: { organisationId?: string, collectionId?: string }): Promise<{ organisationId: string, collectionId: string, number: string, objectId: string, url: string }> {
  const { tableName, dynamoDb } = initialise();

  let key = {
    partitionKey: `organisation#${bookmark.organisationId}`,
    sortKey: `collection#${bookmark.collection?.uuid || bookmark.collectionId}#bookmark#${bookmark.uuid}`,
  }

  if (previousAttributes && Object.keys(previousAttributes).length > 0) {
    key = {
      partitionKey: `organisation#${previousAttributes.organisationId}`,
      sortKey: `collection#${previousAttributes.collectionId}#bookmark#${bookmark.uuid}`,
    }
  }

  const params = {
    TableName: tableName,
    Key: key,
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
    sortKey: `${isOrganisation ? "organisation" : "user"}`,
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
      sortKey: "organisation",
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
      sortKey: `${isOrganisation ? "organisation" : "user"}`,
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
      throw Exception("Owner not found", 404);
    }
  } catch (e) {
    logger.error("Error getting the owner", { params, error: e });
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

async function deleteOwner(ownerId: string, isOrganisation: boolean): Promise<void> {
  const { tableName, dynamoDb } = initialise();

  const params = {
    TableName: tableName,
    Key: {
      partitionKey: `${isOrganisation ? "organisation" : "user"}#${ownerId}`,
      sortKey: `${isOrganisation ? "organisation" : "user"}`,
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
      sortKey: "user"
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

async function removeOrganisationFromUser(userId: string, index: number): Promise<IUser> {
  const { tableName, dynamoDb } = initialise();
  const params = {
    TableName: tableName,
    Key: {
      partitionKey: `user#${userId}`,
      sortKey: "user"
    },
    UpdateExpression: `set #data.updated = :updated, updated = :updated remove #data.#organisations[${index}]`,
    ExpressionAttributeNames: {
      "#data": "data",
      "#organisations": "organisations",
    },
    ExpressionAttributeValues: {
      ":updated": moment().format(),
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
      sortKey: "user"
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
      sortKey: "user"
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

async function getAllObjectIDs(organisationId: string): Promise<{ organisationId: string, collectionId: string, uuid: number, objectId: string, url: string }[]> {
  const { tableName, dynamoDb } = initialise();

  let lastEvaluatedKey: DocumentClient.Key | undefined = undefined;
  let items: { organisationId: string, collectionId: string, uuid: number, objectId: string, url: string }[] = [];

  do {
    const params: DocumentClient.QueryInput = {
      TableName: tableName,
      KeyConditionExpression: "#partitionKey = :partitionKey and begins_with(#sortKey, :sortKey)",
      ProjectionExpression: "#d",
      ExpressionAttributeNames: {
        "#partitionKey": "partitionKey",
        "#sortKey": "sortKey",
        "#d": "data",
      },
      ExpressionAttributeValues: {
        ":partitionKey": `organisation#${organisationId}`,
        ":sortKey": `collection`,
      },
      ScanIndexForward: false,
      ExclusiveStartKey: lastEvaluatedKey,
    };

    try {
      const records = await dynamoDb.query(params).promise();
      if (records.Items) {
        const result = records.Items.map((item) => item.data);
        items = [...items, ...result];
        lastEvaluatedKey = records.LastEvaluatedKey;
      } else {
        throw Exception("Items not found", 404);
      }
    } catch (e) {
      logger.error("Error getting all the items by objectIds", { params, error: e });
      throw e;
    }
  } while (lastEvaluatedKey !== undefined);

  return items;
}

async function getAllByType(type: string): Promise<Record<string, any>[]> {
  const { tableName, dynamoDb } = initialise();

  let lastEvaluatedKey: DocumentClient.Key | undefined = undefined;
  let items: Record<string, any>[] = [];

  do {
    const params: DocumentClient.QueryInput = {
      TableName: tableName,
      IndexName: "type",
      KeyConditionExpression: "#type = :type",
      ProjectionExpression: "#d",
      ExpressionAttributeNames: {
        "#type": "type",
        "#d": "data",
      },
      ExpressionAttributeValues: {
        ":type": type,
      },
      ScanIndexForward: false,
      ExclusiveStartKey: lastEvaluatedKey,
    };

    try {
      const records = await dynamoDb.query(params).promise();
      if (records.Items) {
        const result = records.Items.map((item) => item.data);
        items = [...items, ...result];
        lastEvaluatedKey = records.LastEvaluatedKey;
      } else {
        throw Exception("Items not found", 404);
      }
    } catch (e) {
      logger.error("Error getting all the items by type", { params, error: e });
      throw e;
    }
  } while (lastEvaluatedKey !== undefined);

  return items;
}

async function createBookmarkNotification(notification: IBookmarkNotificationRequest): Promise<void> {
  const { tableName, dynamoDb } = initialise();
  const timestamp = moment().format();

  const dbBookmark: IDatabaseItem = {
    partitionKey: `organisation#${notification.organisationId}#user#${notification.userId}`,
    sortKey: `notification#${notification.uuid}`,
    data: notification,
    created: timestamp,
    updated: timestamp,
    type: "bookmark-notification",
  };
  const params = {
    TableName: tableName,
    Item: dbBookmark,
    ConditionExpression: "attribute_not_exists(partitionKey)",
  };

  try {
    await dynamoDb.put(params).promise();
  } catch (e) {
    const message = "Failed to save a bookmark notification in dynamo db";
    logger.error(message, { params, error: e });
    throw e;
  }
}

async function deleteBookmarkNotification(organisationId: string, userId: string, uuid: number) {
  const { tableName, dynamoDb } = initialise();

  const params = {
    TableName: tableName,
    Key: {
      partitionKey: `organisation#${organisationId}#user#${userId}`,
      sortKey: `notification#${uuid}`,
    },
  };

  try {
    await dynamoDb.delete(params).promise();
  } catch (e) {
    const message = "Failed to delete nmotification from dynamo db";
    logger.error(message, { params, error: e });
    throw e;
  }
}

export async function getUserNotifications(organisationId: string, userId: string): Promise<IBookmarkNotificationRequest[]> {
  const { tableName, dynamoDb } = initialise();
  let lastEvaluatedKey: DocumentClient.Key | undefined = undefined;
  let notifications: IBookmarkNotificationRequest[] = [];
  do {
    const params: DocumentClient.QueryInput = {
      TableName: tableName,
      KeyConditionExpression: "#pk = :pkey",
      ProjectionExpression: "#d",
      ExpressionAttributeValues: {
        ":pkey": `organisation#${organisationId}#user#${userId}`,
      },
      ExpressionAttributeNames: {
        "#d": "data",
        "#pk": "partitionKey",
      },
      ExclusiveStartKey: lastEvaluatedKey,
    };
    try {
      const records = await dynamoDb.query(params).promise();
      if (records.Items) {
        const result = records.Items.map((item) => item.data) as IBookmarkNotificationRequest[];
        notifications = [...notifications, ...result];
        lastEvaluatedKey = records.LastEvaluatedKey;
      } else {
        throw Exception("Notifications not found", 404);
      }
    } catch (e) {
      logger.error("Error getting the user notifications", { params, error: e });
      throw e;
    }
  } while (lastEvaluatedKey !== undefined);

  return notifications;
}

interface IDatabaseItem {
  partitionKey: string;
  sortKey: string;
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
  getAllObjectIDs,
  getAllByType,
  removeOrganisationFromUser,
  createBookmarkNotification,
  deleteBookmarkNotification,
  getUserNotifications,
};
