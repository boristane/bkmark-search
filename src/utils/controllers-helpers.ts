import { APIGatewayEvent } from "aws-lambda";
import { IHTTPResponse } from "./http-responses";
import { logRequest, logResponse } from "./utils";

export async function wrapper(handler: Function, event: APIGatewayEvent): Promise<IHTTPResponse> {
  logRequest(event);
  const response = await handler(event);
  logResponse(response, event);
  return response;
}
