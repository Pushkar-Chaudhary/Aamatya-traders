import mongoose from "mongoose";
import { User } from "../modules/auth/models.js";

export async function connectMongo(uri: string): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  await migrateOptionalUniqueUserIndexes();
  await Promise.all(Object.values(mongoose.models).map((registeredModel) => registeredModel.init()));
}

async function migrateOptionalUniqueUserIndexes(): Promise<void> {
  const database = mongoose.connection.db;
  if (!database) {
    throw new Error("MongoDB connection is not initialized.");
  }

  const collectionName = User.collection.collectionName;
  const collectionExists = await database
    .listCollections({ name: collectionName }, { nameOnly: true })
    .hasNext();
  if (!collectionExists) return;

  const indexes = await User.collection.listIndexes().toArray();
  for (const field of ["phone", "email"]) {
    const conflictingIndexes = indexes.filter((index) => {
      const keys = Object.entries(index.key);
      return (
        keys.length === 1 &&
        keys[0][0] === field &&
        keys[0][1] === 1 &&
        index.unique === true &&
        (index.sparse !== true || index.name !== `${field}_1`)
      );
    });

    for (const index of conflictingIndexes) {
      await User.collection.dropIndex(index.name);
      console.info(`Rebuilding legacy ${field} index as sparse unique.`);
    }
  }
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
