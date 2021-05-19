
process.env.PROJECTION_TABLE = "bkmark-search-projection";
process.env.ALGOLIA_APP_ID = "";
process.env.ALGOLIA_API_KEY = "";
process.env.ENV = "offline";
process.env.REGION = "eu-west-2";


import logger from "logger";
import algolia from "../services/algolia";
import database from "../services/database";

async function addUsernameToUsers() {
  const users = await database.getAllUsers();
  const failures = []

  for (let i = 0; i < users.length; i += 1) {
    const user = users[i];
    logger.info("Processing user", { uuid: user.uuid });
    try {
      // This won't work anymore actually. since the whole thing was refactored.
      // @ts-ignore
      await algolia.deleteIndex(user.uuid, false);
    } catch (error) {
      logger.error("There was a problem deleting the bad indices in algolia", { user, error });
      failures.push(user.uuid);
    }
  }

  logger.error("Here are the failures", failures);
}

addUsernameToUsers();
