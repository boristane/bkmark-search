import database from "../services/database";
import logger from "logger";
import { Context, APIGatewayEvent } from "aws-lambda";
import algolia from "../services/algolia";
import { failure, handleError, IHTTPResponse, success } from "../utils/http-responses";
import { wrapper } from "../utils/controllers-helpers";

interface ISearchBookmarksRequest {
  query: string;
}

async function search(event: APIGatewayEvent): Promise<IHTTPResponse> {
  try {
    const userData = event.requestContext.authorizer;
    if (!userData || !userData.uuid) {
      return failure({ message: "Unauthorised operations" }, 401);
    }
    const {query} = event.queryStringParameters ?? {} as ISearchBookmarksRequest;
    
    const { uuid } = userData;
    const hits = await algolia.search(uuid, query);
    logger.info("Got the results from algolia", hits);

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