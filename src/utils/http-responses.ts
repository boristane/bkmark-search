import logger from "logger";

export interface IHTTPResponse {
  statusCode: number,
  headers: Record<string, any>,
  body: string,
}

export function buildResponse(statusCode: number, body: Record<string, any>, additionalHeaders?: Record<string, any>): IHTTPResponse {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      ...additionalHeaders
    },
    body: JSON.stringify(body),
  };
}

export function success(body: Record<string, any>, status = 200): IHTTPResponse  {
  return buildResponse(status, body);
}

export function failure(body: Record<string, any>, status = 500): IHTTPResponse {
  return buildResponse(status, body);
}

export function handleError(error: any, data: any, message: string) {
  const m = error.message ?? message;
  const statusCode = error.statusCode ?? 500;
  logger.error(message, { data, error, });
  return failure({ message: m }, statusCode);
}
