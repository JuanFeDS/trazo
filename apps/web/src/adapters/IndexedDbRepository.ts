import type { DiagramRepository, StoredRecord, StoredSummary } from '@trazo/core';

const DB_NAME = 'trazo';
const DB_VERSION = 1;
const STORE = 'diagrams';

function awaitRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function awaitTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class IndexedDbRepository implements DiagramRepository {
  private database: Promise<IDBDatabase> | undefined;

  constructor(private readonly factory: IDBFactory = indexedDB) {}

  private connect(): Promise<IDBDatabase> {
    this.database ??= openDatabase(this.factory).catch((error: unknown) => {
      this.database = undefined;
      throw error;
    });
    return this.database;
  }

  async list(): Promise<StoredSummary[]> {
    const database = await this.connect();
    const records = await awaitRequest<StoredRecord[]>(
      database.transaction(STORE, 'readonly').objectStore(STORE).getAll(),
    );
    return records.map(({ data: _data, ...summary }) => summary);
  }

  async load(id: string): Promise<StoredRecord | undefined> {
    const database = await this.connect();
    return awaitRequest<StoredRecord | undefined>(
      database.transaction(STORE, 'readonly').objectStore(STORE).get(id),
    );
  }

  async save(record: StoredRecord): Promise<void> {
    const database = await this.connect();
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(record);
    await awaitTransaction(transaction);
  }

  async remove(id: string): Promise<void> {
    const database = await this.connect();
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(id);
    await awaitTransaction(transaction);
  }
}
