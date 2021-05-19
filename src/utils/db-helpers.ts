import AWSXRay from 'aws-xray-sdk';
import { DocumentClient } from "aws-sdk/clients/dynamodb";

let dynamoDb: DocumentClient;

export function initialiseDb(tableName: string): { tableName: string, dynamoDb: DocumentClient } {
  if (dynamoDb) {
    return { tableName, dynamoDb };
  }
  const isOffline = process.env.ENV === "offline" ? true : false;

  dynamoDb = new DocumentClient({ apiVersion: '2012-08-10', region: process.env.REGION });

  if (!isOffline) {
    AWSXRay.captureAWSClient((dynamoDb as any).service);
  }
  return { tableName, dynamoDb };
}
