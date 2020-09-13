import { ICreateIndexRequest } from "../schemas/user";
import algolia from "../services/algolia";
import logger from "logger";

export async function initialiseIndex(data: ICreateIndexRequest ): Promise<boolean> {
  try {
    await algolia.createUserIndex(data.user.uuid);
    return true;
  } catch (error) {
    logger.error("There was an error creating an index", { error, data });
    return false;
  }
}