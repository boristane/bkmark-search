
process.env.PROJECTION_TABLE = "bkmark-search-projection";
process.env.PROJECTION_TABLE_2 = "bkmark-search-projection-2";
process.env.ALGOLIA_APP_ID = "";
process.env.ALGOLIA_API_KEY = "";
process.env.ENV = "offline";
process.env.REGION = "eu-west-2";


import logger from "logger";
import { IOrganisation } from "../models/organisation";
import { IUser } from "../models/user";
import algolia from "../services/algolia";
import database from "../services/database";
import database2 from "../services/database2";
import fs from "fs";
import { initialiseDb } from "../utils/db-helpers";
import { DocumentClient } from "aws-sdk/clients/dynamodb";

async function addSortKeysToAllMfs() {

  const failures: any[] = [];

  const organisations = await database.getAllByType("organisation") as IOrganisation[];
  const organisationsPromises = organisations.map(async organisation => {
    try {
      logger.info("Processing organisation", { userId: organisation.uuid });
      await database2.createOwner(organisation, true);
    } catch (error) {
      logger.error("There was a problem with an organisation", { error, organisation });
      failures.push({ ...organisation, type: "organisation" })
    }
  });

  const users = await database.getAllByType("user") as IUser[];
  const usersPromises = users.map(async user => {
    try {
      logger.info("Processing user", { userId: user.uuid });
      await database2.createOwner(user, false);
    } catch (error) {
      logger.error("There was a problem with a user", { error, user });
      failures.push({ ...user, type: "user" })
    }
  });

  const objectIds = await database.getAllBookmarks();

  await Promise.all(organisationsPromises);
  await Promise.all(usersPromises);

  for (let i = 0; i < objectIds.length; i += 1) {
    const bookmark = objectIds[i];
    if (bookmark.organisationId.length > 12) continue;
    try {
      logger.info("Processing bookmark", { organisationId: bookmark.organisationId, objectId: bookmark.objectId });
      const algoliaObject = await algolia.getBookmark(bookmark.organisationId, bookmark.objectId);
      await database2.createBookmark(bookmark.objectId, algoliaObject);
    } catch (error) {
      logger.error("There was a problem with a bookmark", { error, bookmark });
      failures.push({ ...bookmark, type: "bookmark" });
    }
  }


  logger.error("Here are the failures", failures);
  fs.writeFileSync("failures.json", JSON.stringify(failures));
}

async function handleTheOnesWhichDontHaveAType() {
  const all = await scanAll();
  const failures: any[] = [];

  const badApples = all.filter(item => !item.type);
  const objectIds = badApples.filter(apple => apple.partitionKey.includes("bookmark")).map(item => {
    return {
      objectId: item.data.objectId,
      organisationId: item.partitionKey.split("#")[1],
      uuid: item.partitionKey.split("#")[3],
    }
  });
  const users = badApples.filter(apple => !apple.partitionKey.includes("bookmark")).map(u => u.data);

  const usersPromises = users.map(async user => {
    try {
      logger.info("Processing user", { userId: user.uuid });
      await database2.createOwner(user, false);
    } catch (error) {
      logger.error("There was a problem with a user", { error, user });
      failures.push({ ...user, type: "user" })
    }
  });

  await Promise.all(usersPromises);

  for (let i = 0; i < objectIds.length; i += 1) {
    const bookmark = objectIds[i];
    if (bookmark.organisationId.length > 12) continue;
    try {
      logger.info("Processing bookmark", { organisationId: bookmark.organisationId, objectId: bookmark.objectId });
      const algoliaObject = await algolia.getBookmark(bookmark.organisationId, bookmark.objectId);
      await database2.createBookmark(bookmark.objectId, algoliaObject);
    } catch (error) {
      logger.error("There was a problem with a bookmark", { error, bookmark });
      failures.push({ ...bookmark, type: "bookmark" });
    }
  }

  fs.writeFileSync("bad-apples.json", JSON.stringify(badApples));
  fs.writeFileSync("users.json", JSON.stringify(users));
  fs.writeFileSync("bookmarks.json", JSON.stringify(objectIds));

  logger.error("Here are the failures", failures);
  fs.writeFileSync("failures.json", JSON.stringify(failures));
}

async function scanAll() {

  const { tableName, dynamoDb } = initialiseDb(process.env.PROJECTION_TABLE!);
  let lastEvaluatedKey: DocumentClient.Key | undefined = undefined;
  let items: any[] = [];
  do {
    const params = {
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
    };

    try {
      const records: DocumentClient.ScanOutput = await dynamoDb.scan(params).promise();
      if (!records.Items) {
        return [];
      }
      const result = records.Items;
      items = [...items, ...result];
      lastEvaluatedKey = records.LastEvaluatedKey;
    } catch (error) {
      logger.error("There was a problem getting all the items from dynamoDB", {
        error,
      });
      throw error;
    }
  } while (lastEvaluatedKey !== undefined);
  return items;
}


handleTheOnesWhichDontHaveAType();
addSortKeysToAllMfs();

