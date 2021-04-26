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
    const { query, organisationId } = event.queryStringParameters!;
    if (!query) {
      return failure({ message: "Bad Request" }, 400);
    }

    const user = await database.getOwner(userData.uuid, false);

    if (!user.membership.isActive) {
      return failure({ message: "Please activate your subscription" }, 402);
    }
    if (organisationId && !user.organisations?.some(org => org === organisationId)) {
      return failure({ message: "Forbidden" }, 403);
    }

    const { uuid } = userData;
    let hits = await algolia.search(organisationId || uuid, query, !!organisationId);
    hits = hits.filter(hit => user.collections?.includes(hit.collection.uuid));
    
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
