export interface Evse {
  identifier?: string;
  id?: string;
  status: string;
  connectors?: Connector[];
}

export interface Connector {
  max_electric_power: number;
  standard: string;
}

export interface Zone {
  evses: Evse[];
}

export interface Charger {
  id: string;
  name: string;
  address: string;
  location: string; // "lat,lng" format
  zones?: Zone[];
  properties?: {
    LocationName?: string;
    Provider?: string;
    Address?: string;
    location_id?: string;
    name?: string;
    address?: string;
    isActive?: number;
  };
  geometry?: {
    coordinates: [number, number];
  };
}

export interface WatchedLocation {
  name: string;
  subscribedAt: string;
  lastStatus: boolean | string;
}

export interface WatchedLocations {
  [key: string]: WatchedLocation;
}

export interface ChargerResponse {
  locations: Charger[];
}

export interface LidlCharger {
  properties: {
    LocationName?: string;
    Provider?: string;
    Address?: string;
    location_id?: string;
    name?: string;
    address?: string;
    isActive: number;
  };
  geometry: {
    coordinates: [number, number];
  };
}

export interface LidlResponse {
  features: LidlCharger[];
}

export interface LidlLocationDetails {
  Loc: {
    name: string;
    address: string;
    city: string;
    evses: Array<{
      status: string;
      connectors: Array<{
        max_electric_power: number;
        standard: string;
      }>;
    }>;
  };
  provider?: string;
}
