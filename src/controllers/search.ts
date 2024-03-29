import database from "../services/database2";
import logger from "logger";
import { Context, APIGatewayEvent } from "aws-lambda";
import algolia from "../services/algolia";
import { failure, handleError, IHTTPResponse, success } from "../utils/http-responses";
import { wrapper } from "../utils/controllers-helpers";
import { IBookmark } from "../models/bookmark";
import { IUser } from "../models/user";

async function search(event: APIGatewayEvent): Promise<IHTTPResponse> {
  try {
    const userData = event.requestContext.authorizer!;
    const { query, organisationId } = event.queryStringParameters!;
    if (!query || !organisationId) {
      return failure({ message: "Bad Request" }, 400);
    }

    const user = await database.getOwner(userData.uuid, false) as IUser;

    if (!user.organisations?.some((org) => org === organisationId)) {
      return failure({ message: "Forbidden" }, 403);
    }

    let fullTextSearch = true;

    const organisation = await database.getOwner(organisationId, true);
    fullTextSearch = organisation.membership.tier !== 0;
    if (!organisation.membership.isActive) {
      return failure({ message: "Please activate your subscription" }, 402);
    }

    const { uuid } = userData;

    let hits: IBookmark[];

    const userNotifications = await database.getUserNotifications(organisationId, userData.uuid);
    hits = (await algolia.search(organisationId, query, fullTextSearch)).filter((hit) => {
      const userHasAccessToCollection = user.collections?.some(
        (collection) => collection.ownerId === hit.organisationId && collection.uuid === hit.collection.uuid
      );

      const hitIsInUserNotifications = userNotifications.some(notif => notif.collectionId === hit.collection.uuid && notif.bookmarkId === hit.uuid);
      return userHasAccessToCollection || hitIsInUserNotifications;
    }
    );


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
