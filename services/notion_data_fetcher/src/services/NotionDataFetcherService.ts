import { Client } from "@notionhq/client";
import { BadRequest } from 'http-errors';
import { DynamoDatabaseClient, IDBClient } from 'db-clients';
import { IUsersTable } from "../types";
import { REGION } from "../constants";

interface INotionDataFetcherService {
  dbClient: IDBClient;
  notionClient: any;
  call(): void;
}

export class NotionDataFetcherService implements INotionDataFetcherService {
  dbClient: IDBClient;
  notionClient: any;

  constructor() {
    this.dbClient = new DynamoDatabaseClient(process.env.TABLE_NAME!, REGION);
    this.notionClient = new Client({ auth: process.env.NOTION_KEY });
  }

  async call(): Promise<void> {
    try {
      const primaryKeys = ['fullName'];
      const rawNotionData = await this.notionClient.databases.query({ database_id: process.env.NOTION_DATABASE_ID });
      const parsedNotionData = this.parseNotionResponse(rawNotionData);
      const dbData = await this.dbClient.getAll<IUsersTable[]>(); // has to be [] if table is empty
  
      if (dbData.length === 0) {
        await this.dbClient.createMany(parsedNotionData);
      } else {
        const { usersToUpdate, usersToDelete } = this.processRecordComparison(dbData, parsedNotionData);
  
        await this.dbClient.updateMany(usersToUpdate, primaryKeys);
        if (usersToDelete.length !== 0) await this.dbClient.deleteMany(usersToDelete, primaryKeys);
      }
    } catch (error: any) {
      throw new BadRequest(error.message);
    }
  }

  private parseNotionResponse(rawNotionData: Record<string, any>): IUsersTable[] {
    return rawNotionData.results.map((record: Record<string, any>) => {
      const { fullName, Birthday, Description } = record.properties;
  
      return {
        fullName: fullName.title[0].plain_text,
        birthday: Birthday.date.start,
        description: Description.rich_text[0].plain_text,
      };
    });
  }

  private processRecordComparison(dbData: IUsersTable[], parsedNotionData: IUsersTable[]): {
    usersToUpdate: Record<string, any>[];
    usersToDelete: Record<string, any>[];
  } {
    let usersToUpdate = new Array();
    let usersToDelete = new Array();

    const dbUsers = new Set(dbData.map(user => user.fullName));

    parsedNotionData.forEach(user => {
      if (dbUsers.has(user.fullName)) {
        usersToUpdate.push(user);
      } else {
        usersToDelete.push(user);
      }
    })

    return { usersToUpdate, usersToDelete };
  }
}