import { StreetModel } from '../models/Street';
import { IStreet } from '../../interfaces/IStreet';

export async function upsertStreet(doc: Partial<IStreet>) {
    const now = new Date();
    const { createdAt, ...updateDoc } = doc;

    return StreetModel.updateOne(
        { cityCode: doc.cityCode, streetCode: doc.streetCode },
        {
            $set: { ...updateDoc, updatedAt: now },
            $setOnInsert: { createdAt: createdAt || now }
        },
        { upsert: true }
    );
}
