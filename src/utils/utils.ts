import logger from "logger";

export function logRequest(event: any) {
  let body;
  if (event.body) {
    body = JSON.parse(event.body)
  }
  logger.info("REQUEST", {
    url: event.resource,
    body,
    query: event.queryStringParameters,
    method: event.requestContext.httpMethod,
    token: event.headers.Authorization,
    authorizer: event.requestContext.authorizer,
    host: event.headers.Host,
    connectionId: event.requestContext.connectionId,
    routeKey: event.requestContext.routeKey,
  });
}

export function logResponse(response: Record<string, any> | undefined, event: any): void {
  logger.info("RESPONSE", {
    ...response,
    url: event.resource,
  });
}

export function omit(keys: string[], object: Record<string, any>) {
  const copy = { ...object };
  keys.forEach(key => {
    copy[key] = undefined;
  });
  return copy;
}

export function eqSet(a: any[], b: any[]): boolean {
  const as = new Set(a);
  const bs = new Set(b);
  if (as.size !== bs.size) return false;
  for (const aa of as) if (!bs.has(aa)) return false;
  return true;
}
