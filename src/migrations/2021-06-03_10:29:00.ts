
process.env.PROJECTION_TABLE = "bkmark-search-projection";
process.env.PROJECTION_TABLE_2 = "bkmark-search-projection-2";
process.env.ALGOLIA_APP_ID = "";
process.env.ALGOLIA_API_KEY = "";
process.env.ENV = "offline";
process.env.REGION = "eu-west-2";


import logger from "logger";
import algolia from "../services/algolia";
import database from "../services/database2";
import fs from "fs";
import { IBookmark } from "../models/bookmark";
import { initialiseDb } from "../utils/db-helpers";
import moment from "dayjs";

async function addSortKeysToAllMfs() {

  const failures: any[] = [];

  const objectIds = await database.getAllByType("bookmark") as IBookmark[];


  for (let i = 0; i < objectIds.length; i += 1) {
    const bookmark = objectIds[i];
    if (bookmark.organisationId.length > 12) continue;
    try {
      logger.info("Processing bookmark", { organisationId: bookmark.organisationId, objectId: bookmark.objectId });
      const algoliaObject = await algolia.getBookmark(bookmark.organisationId, bookmark.objectId);
      await addUrl(algoliaObject);
    } catch (error) {
      logger.error("There was a problem with a bookmark", { error, bookmark });
      failures.push({ ...bookmark, type: "bookmark" });
    }
  }


  logger.error("Here are the failures", failures);
  fs.writeFileSync("failures.json", JSON.stringify(failures));
}

async function addUrl(bookmark: IBookmark) {
  const { tableName, dynamoDb } = initialiseDb(process.env.PROJECTION_TABLE_2!);
  const params = {
    TableName: tableName,
    Key: {
      partitionKey: `organisation#${bookmark.organisationId}`,
      sortKey: `collection#${bookmark.collection.uuid}#bookmark#${bookmark.uuid}`,
    },
    UpdateExpression: `set #data.#url = :url, #data.updated = :updated, updated = :updated`,
    ExpressionAttributeNames: {
      "#data": "data",
      "#url": "url",
    },
    ExpressionAttributeValues: {
      ":updated": moment().format(),
      ":url": bookmark.url,
    },
    ReturnValues: "ALL_NEW",
  };
  try {
    return (await dynamoDb.update(params).promise()).Attributes?.data;
  } catch (e) {
    const message = "Failed to change the url of a bookmark in dynamo db";
    logger.error(message, { params, error: e });
    throw e;
  }
}

addSortKeysToAllMfs();
