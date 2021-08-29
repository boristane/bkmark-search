
process.env.PROJECTION_TABLE_2 = "bkmark-search-projection-2";
process.env.BOOKMARKS_TABLE = "bkmark-bookmarks-projection";
process.env.ALGOLIA_APP_ID = "";
process.env.ALGOLIA_API_KEY = "";
process.env.ENV = "offline";
process.env.REGION = "eu-west-2";


import logger from "logger";
import algolia from "../services/algolia";
import database from "../services/database2";
import fs from "fs";
import { IBookmark } from "../models/bookmark";
import { DocumentClient } from "aws-sdk/clients/dynamodb";

async function clearMissingBookmarks() {

  const organisations = await database.getAllByType("organisation");
  const failures: any[] = [];
  const toDelete = [] as any[];

  for (let i = 0; i < organisations.length; i += 1) {
    const organisation = organisations[i];
    logger.info("Processing this one", { uuid: organisation.uuid });
    try {
      const bookmarksFromAlgolia = await algolia.getAll(organisation.uuid);
      // logger.info("all them bookmarks", { bookmarks: bookmarksFromAlgolia.map(b => { return { uuid: b.uuid, collection: b.collection } }) });

      const promises = bookmarksFromAlgolia.map(async bookmark => {

        const bookmarkFromBookmarks = await getBookmark(bookmark.collection.uuid, bookmark.uuid);
        if (!bookmarkFromBookmarks) {
          await algolia.deleteBookmark(bookmark, bookmark.objectID);

          toDelete.push(bookmark);
        }
      });

      await Promise.all(promises);

    } catch (error) {
      logger.error("There was a problem bro", error);
      failures.push(organisation);
    }
  }

  logger.error("Here are the failures", failures);
  fs.writeFileSync("failures.json", JSON.stringify(failures));
  fs.writeFileSync("toDelete.json", JSON.stringify(toDelete));
}

clearMissingBookmarks();


async function getBookmark(collectionId: string, uuid: number): Promise<IBookmark | undefined> {
  const tableName = process.env.BOOKMARKS_TABLE!;
  const dynamoDb =
    new DocumentClient({ apiVersion: '2012-08-10', region: process.env.REGION });

  const params = {
    TableName: tableName,
    Key: {
      partitionKey: `collection#${collectionId}`,
      sortKey: `bookmark#${uuid}`,
    },
    ProjectionExpression: "#d",
    ExpressionAttributeNames: {
      "#d": "data",
    },
  };
  try {
    const record = await dynamoDb.get(params).promise();
    if (record.Item) {
      return record.Item.data as IBookmark;
    } else {
      return undefined;
    }
  } catch (e) {
    logger.error("Error getting the bookmark", { params, error: e });
    throw e;
  }
}