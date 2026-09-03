import mongoose from 'mongoose';

const globalMongoose = globalThis;

if (!globalMongoose.__weathergptMongoose) {
  globalMongoose.__weathergptMongoose = { conn: null, promise: null };
}

export default async function connectDB() {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) throw new Error('MONGODB_URI is not configured.');

  const cached = globalMongoose.__weathergptMongoose;

  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(mongodbUri, {
      dbName: 'weathergpt',
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}