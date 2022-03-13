
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

async function addDeleteStaleIndices() {

  const failures: any[] = [];

  const indices = await algolia.getAllIndices();
  if (!indices) return;

  const promises = indices.map(async index => {
    const { name } = index;
    const id = name.split("#")[1];
    try {
      const owner = await database.getOwner(id, true);
    } catch (error) {
      if ((error as any).statusCode === 404) {
        logger.info("Found an index without an organisation in the db", { index });
        await algolia.deleteIndex(id);
      } else {
        logger.error("A bit of a problem", { error });
      }
    }
  });

  await Promise.all(promises);


  logger.error("Here are the failures", failures);
  fs.writeFileSync("failures.json", JSON.stringify(failures));
}

addDeleteStaleIndices();
