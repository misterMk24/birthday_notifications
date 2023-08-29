export interface IDBClient {
  getAll<T>(): Promise<T>;
  createMany(items: Record<string, any>[]): Promise<void>;
  updateMany(items: Record<string, any>[], primaryKeys?: Record<string, any>): Promise<void>;
  deleteMany(items: Record<string, any>[], primaryKeys?: Record<string, any>): Promise<void>;
}