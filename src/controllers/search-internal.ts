import database from "../services/database2";
import logger from "logger";
import { Context, APIGatewayEvent } from "aws-lambda";
import algolia from "../services/algolia";
import { failure, handleError, IHTTPResponse, success } from "../utils/http-responses";
import { wrapper } from "../utils/controllers-helpers";
import { IUser } from "../models/user";

async function search(event: APIGatewayEvent): Promise<IHTTPResponse> {
  try {
    const body = JSON.parse(event.body!);
    const { userId, query } = body;
    if (!query) {
      return failure({ message: "Bad Request" }, 400);
    }

    const user = await database.getOwner(userId, false) as IUser;

    const promises = user.organisations!.map(async organisation => {
      const org = await database.getOwner(organisation, true);
      if(org.membership.tier < 2) return [];
      return await algolia.search(organisation, query, true);
    }).flat();
    const hits = (await Promise.all(promises)).flat();

    const data = {
      message: "Got search results",
      data: {
        user: userId,
        hits,
      },
    };

    return success(data);
  } catch (err) {
    const message = "Unexpected error when getting the search results internal";
    return handleError(err, event.body, message);
  }
}

export async function handler(event: APIGatewayEvent, context: Context) {
  const correlationId = event.headers["x-correlation-id"];
  return await logger.bindFunction(wrapper, correlationId)(search, event);
}
