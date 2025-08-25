import axios, { Axios } from 'axios';
import { omit } from 'lodash';
import { cities, city, enlishNameByCity } from '../utils/cities-source/cities';
import { config } from '../shared/config';
import { IStreet } from '../interfaces/IStreet';

export interface Street extends Omit<ApiStreet, '_id'> {
	streetId: number
}

export interface ApiStreet {
	_id: number
	region_code: number
	region_name: string
	city_code: number
	city_name: string
	street_code: number
	street_name: string
	street_name_status: string
	official_code: number
}

export class StreetsService {
	private static _axios: Axios
	private static get axios() {
		if (!this._axios) {
			this._axios = axios.create({})
		}
		return this._axios
	}

	static async getStreetsInCity(city: city): Promise<{ city: city, streets: IStreet[] }> {
		const res = (await this.axios.post(`${config.streetsApiUrl}`, { resource_id: `${config.streetsApiResource}`, filters: { city_name: cities[city] }, limit: 100000 })).data
		const results = res.result.records

		if (!results || !results.length) {
			throw new Error('No streets found for city: ' + city)
		}

		const streets = results.map((street: ApiStreet) => this.convertApiStreetToIStreet(street))

		return { city, streets }
	}

	static async getStreetInfoById(id: number): Promise<IStreet> {
		const res = (await this.axios.post(`${config.streetsApiUrl}`, { resource_id: `${config.streetsApiResource}`, filters: { _id: id }, limit: 1 })).data
		const results = res.result.records
		if (!results || !results.length) {
			throw new Error('No street found for id: ' + id)
		}
		const dbStreet: ApiStreet = results[0]
		const cityName = enlishNameByCity[dbStreet.city_name]

		return this.convertApiStreetToIStreet(dbStreet)
	}

	/**
	 * Converts ApiStreet data to IStreet format
	 * @param apiStreet - The street data from the API
	 * @returns Converted street data in IStreet format
	 */
	static convertApiStreetToIStreet(apiStreet: ApiStreet): IStreet {
		const now = new Date();

		return {
			cityCode: apiStreet.city_code,
			cityName: apiStreet.city_name,
			streetCode: apiStreet.street_code,
			streetName: apiStreet.street_name,
			streetNameNormalized: apiStreet.street_name.trim().toLowerCase(),
			region: apiStreet.region_name?.trim(),
			additionalMeta: {
				officialCode: apiStreet.official_code,
				streetNameStatus: apiStreet.street_name_status,
				regionCode: apiStreet.region_code,
				apiId: apiStreet._id
			},
			updatedAt: now,
			createdAt: now
		};
	}
}