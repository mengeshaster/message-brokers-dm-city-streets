// Shared types
export type StreetInsertMsg = {
  cityCode: number;
  cityName: string;
  streetCode: number;
  streetName: string;
  meta?: Record<string, unknown>;
  fetchedAt: string; // ISO
};

