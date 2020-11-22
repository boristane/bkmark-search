import database from "../services/database";
import logger from "logger";
import { Context, APIGatewayEvent } from "aws-lambda";
import algolia from "../services/algolia";
import { failure, handleError, IHTTPResponse, success } from "../utils/http-responses";
import { wrapper } from "../utils/controllers-helpers";


async function search(event: APIGatewayEvent): Promise<IHTTPResponse> {
  try {
    const userData = event.requestContext.authorizer!;
    const { query } = event.queryStringParameters!;

    const { uuid } = userData;
    const hits = await algolia.search(uuid, query);
    logger.info("Got the results from algolia", { bookmarks: hits });

    const data = {
      message: "Got search results",
      data: {
        user: uuid,
        hits,
      }
    };

    return success(data);
  } catch (err) {
    const message = "Unexpected error when getting the search results";
    return handleError(err, event.body, message);
  }
}

export async function handler(event: APIGatewayEvent, context: Context) {
  const correlationId = event.headers['x-correlation-id'];
  return await logger.bindFunction(wrapper, correlationId)(search, event);
}
