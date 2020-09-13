import { SearchClient } from "algoliasearch";
import algoliasearch from "algoliasearch";

const appId = process.env.ALGOLIA_APP_ID || "";
const apiKey = process.env.ALGOLIA_API_KEY || "";
let client: SearchClient;

export function initialiseAlgolia(): SearchClient {
  if (client) return client;
  client = algoliasearch(appId, apiKey);
  return client;
}
