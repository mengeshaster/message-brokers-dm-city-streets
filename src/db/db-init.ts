import mongoose from 'mongoose';
import { config } from '../shared/config';
import { log } from '../shared/logger';

export async function connectMongo() {
    if (mongoose.connection.readyState === 1) {
        return mongoose;
    }

    await mongoose.connect(config.mongoUri);
    log.info('Mongo connected');
    return mongoose;
}

export function getDb() {
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Mongo not connected');
    }
    return mongoose.connection.db;
}

export async function closeMongo() {
    if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
    }
}
