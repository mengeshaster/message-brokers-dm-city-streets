export interface IStreet {
    cityCode: number;
    cityName: string;
    streetCode: number;
    streetName: string;
    streetNameNormalized: string;
    region?: string;
    district?: string;
    additionalMeta?: Record<string, unknown>;
    updatedAt: Date;
    createdAt: Date;
}