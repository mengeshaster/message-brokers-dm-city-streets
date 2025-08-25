import { IStreet } from '../interfaces/IStreet';

export function validateStreet(street: any): street is IStreet {
  return (
    typeof street.cityCode === 'number' &&
    typeof street.cityName === 'string' &&
    typeof street.streetCode === 'number' &&
    typeof street.streetName === 'string' &&
    typeof street.streetNameNormalized === 'string' &&
    (typeof street.region === 'string' || street.region === undefined) &&
    (typeof street.district === 'string' || street.district === undefined) &&
    (typeof street.additionalMeta === 'object' || street.additionalMeta === undefined) &&
    street.updatedAt instanceof Date &&
    street.createdAt instanceof Date
  );
}
