import logger from "logger";

import { Context, SQSEvent, Callback, SQSRecord } from "aws-lambda";
import { handleMessage } from "./src/handlers/handlers";


export async function command(event: SQSEvent, context: Context, callback: Callback) {
  const { Records } = event;

  const promises = Records.map((record) => commandFunction(record));
  const results = await Promise.all(promises);
  const failures = results.filter(r => !r.result);

  if (failures.length > 0) {
    logger.error("Error when processing messages from queue.", { failures });
    callback(`Error when processing messages from queue.`);
  }
}

async function commandFunction(record: SQSRecord): Promise<{ result: boolean, record: SQSRecord }> {
  let message = JSON.parse(record.body || "");
  if (message.Message) { message = JSON.parse(message.Message); }
  let correlationId: string = message.correlationId;
  const res = await logger.bindFunction(handleMessage, correlationId)(message);
  return { result: res, record };
}
