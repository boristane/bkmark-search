import database from "../services/database";
import logger from "logger";
import { Context, APIGatewayEvent } from "aws-lambda";
import algolia from "../services/algolia";
import {
  failure,
  handleError,
  IHTTPResponse,
  success,
} from "../utils/http-responses";
import { wrapper } from "../utils/controllers-helpers";

async function search(event: APIGatewayEvent): Promise<IHTTPResponse> {
  try {
    const userData = event.requestContext.authorizer!;
    const { query } = event.queryStringParameters!;
    if (!query) {
      return failure({ message: "Bad Request" }, 400);
    }

    const user = await database.getUser(userData.uuid);
    if (!user.membership.isActive) {
      return failure({ message: "Please activate your subscription" }, 403);
    }

    const { uuid } = userData;
    const hits = await algolia.search(uuid, query);
    logger.info("Got the results from algolia.", { bookmarks: hits });

    const data = {
      message: "Got search results",
      data: {
        user: uuid,
        hits,
      },
    };

    return success(data);
  } catch (err) {
    const message = "Unexpected error when getting the search results";
    return handleError(err, event.body, message);
  }
}

export async function handler(event: APIGatewayEvent, context: Context) {
  const correlationId = event.headers["x-correlation-id"];
  return await logger.bindFunction(wrapper, correlationId)(search, event);
}
