import axios from 'axios';
import type { Charger, ChargerResponse, LidlCharger, LidlResponse, LidlLocationDetails } from '../types/charger';

export class ChargerService {
  private static token: string = '';

  // Protergia/WattVolt chargers
  static async fetchProtergia(): Promise<Charger[]> {
    const url = 'https://wattvolt.eu.charge.ampeco.tech/api/v1/app/locations?operatorCountry=GR';
    const body = {
      "locations": {
        "26096": "", "26097": "", "26098": "", "26099": "", "26100": "",
        "26101": "", "26102": "", "26103": "", "26104": "", "26105": "",
        "26106": "", "26107": "", "26109": "", "26110": "", "26111": "",
        "26116": "", "26117": "", "26118": ""
      }
    };

    try {
      const response = await axios.post<ChargerResponse>(url, body);
      return response.data.locations;
    } catch (error) {
      console.error('Error fetching Protergia chargers:', error);
      throw error;
    }
  }

  // Lidl chargers
  static async fetchLidl(): Promise<LidlCharger[]> {
    try {
      // Step 1: Get token
      const tokenUrl = 'https://api.codetabs.com/v1/proxy?quest=https://electrokinisi.yme.gov.gr/public/ChargingPoints/';
      const tokenResponse = await axios.get(tokenUrl);
      
      const tokenMatch = tokenResponse.data.match(/<input[^>]*id="token"[^>]*value="([^"]*)"/);
      if (!tokenMatch) {
        throw new Error('Token not found in response');
      }
      
      this.token = tokenMatch[1];
      
      // Step 2: Fetch chargers
      const chargersResponse = await axios.post<LidlResponse>(
        'https://electrokinisi.yme.gov.gr/myfah-api/openApi/GetPLocations',
        { token: this.token, PartyIds: ["LDL"] }
      );
      
      return chargersResponse.data.features.filter(charger => 
        charger.properties.isActive === 1
      );
    } catch (error) {
      console.error('Error fetching Lidl chargers:', error);
      throw error;
    }
  }

  // Get Lidl charger details
  static async fetchLidlDetails(locationId: string): Promise<LidlLocationDetails> {
    try {
      const response = await axios.post<LidlLocationDetails>(
        'https://electrokinisi.yme.gov.gr/myfah-api/openApi/GetLocation',
        { location_id: locationId, token: this.token }
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching Lidl charger details for ${locationId}:`, error);
      throw error;
    }
  }

  // Check specific watched locations
  static async checkWatchedLocations(watchedIds: string[]): Promise<Charger[]> {
    if (watchedIds.length === 0) return [];

    try {
      const locations = watchedIds.reduce((acc, id) => {
        acc[id] = "";
        return acc;
      }, {} as Record<string, string>);

      const response = await axios.post<ChargerResponse>(
        'https://wattvolt.eu.charge.ampeco.tech/api/v1/app/locations?operatorCountry=GR',
        { locations }
      );

      return response.data.locations;
    } catch (error) {
      console.error('Error checking watched locations:', error);
      throw error;
    }
  }
}
