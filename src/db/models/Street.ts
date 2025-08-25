import mongoose, { Schema } from 'mongoose';
import { IStreet } from '../../interfaces/IStreet';

const StreetSchema = new Schema<IStreet>({
  cityCode: { type: Number, required: true },
  cityName: { type: String, required: true },
  streetCode: { type: Number, required: true },
  streetName: { type: String, required: true },
  streetNameNormalized: { type: String, required: true },
  region: { type: String },
  district: { type: String },
  additionalMeta: { type: Object },
  updatedAt: { type: Date, required: true },
  createdAt: { type: Date, required: true },
});

StreetSchema.index({ cityCode: 1, streetCode: 1 }, { unique: true });
StreetSchema.index({ streetNameNormalized: 'text' });
StreetSchema.index({ cityName: 1 });

export const StreetModel = mongoose.model<IStreet>('Street', StreetSchema);

