import mongoose from 'mongoose';

const DEFAULT_DB_NAME = 'wedding_invitation';

export const connectDB = async (): Promise<typeof mongoose> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MONGODB_URI environment variable is missing. Please define MONGODB_URI in your .env file.'
    );
  }

  try {
    const conn = await mongoose.connect(uri, {
      dbName: DEFAULT_DB_NAME,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[Database] MongoDB Atlas Connected: ${conn.connection.host}/${DEFAULT_DB_NAME}`);
    return conn;
  } catch (error) {
    console.error('[Database] MongoDB connection error:', (error as Error).message);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB connection closed.');
  }
};

export const isDBConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};
