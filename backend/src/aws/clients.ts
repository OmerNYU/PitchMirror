import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import type { Config } from "../config.js";

export function createS3Client(config: Config): S3Client {
  return new S3Client({ region: config.AWS_REGION });
}

export function createDynamoDocClient(config: Config): DynamoDBDocumentClient {
  const client = new DynamoDBClient({ region: config.AWS_REGION });
  return DynamoDBDocumentClient.from(client);
}
