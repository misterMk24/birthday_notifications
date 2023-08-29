import { DynamoDBClient, TransactWriteItem } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument, TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import AWSXRay from 'aws-xray-sdk';
import { IDBClient } from "./types";

export class DynamoDatabaseClient implements IDBClient {
  private client: DynamoDBDocument;
  private tableName: string;

  constructor(tableName: string, region: string) {
    this.tableName = tableName;
    this.client = AWSXRay.captureAWSv3Client(DynamoDBDocument.from(new DynamoDBClient({ region: region, apiVersion: '2012-08-10' })));
  }

  async getAll<T>(): Promise<T> {
    let rawQueryData: any;

    try {
      rawQueryData = await this.client.scan({ TableName: this.tableName });
    } catch (error: any) {
      throw this.handleAWSErrorMessage(error);
    }

    return rawQueryData!.Items;
  }

  async createMany(items: Record<string, any>[]): Promise<void> {
    let params = { TransactItems: new Array() };
    items.forEach(item => {
      params.TransactItems.push(this.preparePutItemInput(item));
    })

    await this.transactWriteCommand(params);
  }

  async updateMany(items: Record<string, any>[], primaryKeys: string[]): Promise<void> {
    let params = { TransactItems: new Array() };
    items.forEach(item => {
      params.TransactItems.push(this.prepareUpdateItemInput(item, primaryKeys));
    })

    await this.transactWriteCommand(params);
  }

  async deleteMany(items: Record<string, any>[], primaryKeys: string[]): Promise<void> {
    let params = { TransactItems: new Array() };
    items.forEach(item => {
      params.TransactItems.push(this.prepareDeleteItemInput(item, primaryKeys));
    })

    await this.transactWriteCommand(params);
  }

  private async transactWriteCommand(params: TransactWriteCommandInput): Promise<void> {
    try {
      await this.client.transactWrite(params);
    } catch (error: any) {
      throw this.handleAWSErrorMessage(error);
    }
  }

  private prepareUpdateItemInput(item: Record<string, any>, primaryKeys: string[]): Record<string, any> {
    const { Keys, updatedItem } = this.prepareKeysForUpdate(item, primaryKeys);
    const { updateExpression, expressionAttributeValues } = this.prepareAttributesForUpdate(updatedItem);

    return {
      Update: {
        TableName: this.tableName,
        Key: Keys,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      },
    }
  }

  private preparePutItemInput(item: Record<string, any>): TransactWriteItem {
    return {
      Put: {
        TableName: this.tableName,
        Item: item,
      }
    }
  }

  private prepareDeleteItemInput(item: Record<string, any>, primaryKeys: string[]): Record<string, any> {
    const { Keys } = this.prepareKeysForUpdate(item, primaryKeys);

    return {
      Delete: {
        TableName: this.tableName,
        Key: Keys,
      }
    }
  }

  private prepareKeysForUpdate(item: Record<string, any>, primaryKeys: string[]): { 
    Keys: Record<string, any>;
    updatedItem: Record<string, any>;
  } {
    let Keys: Record<string, any> = {};

    primaryKeys.forEach(key => {
      Keys[key] = item[key];
      delete item[key];
    })

    return { Keys, updatedItem: item };
  }

  private prepareAttributesForUpdate(item: Record<string, any>): { 
    updateExpression: string;
    expressionAttributeValues: Record<string, any>
  } {
    let updateExpression = 'set ';
    let expressionAttributeValues: Record<string, any> = {};
    const itemAttributes = Object.keys(item);

    itemAttributes.forEach(key => {
      if (key === itemAttributes.at(-1)) {
        updateExpression += `${key}=:${key}`;
      } else {
        updateExpression += `${key}=:${key}, `;
      }
      expressionAttributeValues[`:${key}`] = item[key];
    });

    return {
      updateExpression,
      expressionAttributeValues,
    }
  }

  private handleAWSErrorMessage(error: any): string {
    let errorMsgs = new Set<string>();

    error.CancellationReasons.forEach((entry: Record<string, any>) => {
      if (entry.Message) errorMsgs.add(entry.Message);
    })

    let message = new Array();
    for (const msg of errorMsgs) {
      message.push(msg);
    }

    return message.join(', ');
  }
}
