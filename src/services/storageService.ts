import type { WatchedLocations } from '../types/charger';

const STORAGE_KEYS = {
  watchedChargers: 'watchedChargers',
  installDismissed: 'installDismissed'
} as const;

export class StorageService {
  static getWatchedLocations(): WatchedLocations {
    try {
      const watched = localStorage.getItem(STORAGE_KEYS.watchedChargers);
      return watched ? JSON.parse(watched) : {};
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return {};
    }
  }

  static saveWatchedLocations(watched: WatchedLocations): void {
    try {
      localStorage.setItem(STORAGE_KEYS.watchedChargers, JSON.stringify(watched));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  static addWatchedLocation(chargerId: string, chargerName: string): void {
    const watched = this.getWatchedLocations();
    watched[chargerId] = {
      name: chargerName,
      subscribedAt: new Date().toISOString(),
      lastStatus: 'unavailable'
    };
    this.saveWatchedLocations(watched);
  }

  static removeWatchedLocation(chargerId: string): void {
    const watched = this.getWatchedLocations();
    delete watched[chargerId];
    this.saveWatchedLocations(watched);
  }

  static isLocationWatched(chargerId: string): boolean {
    const watched = this.getWatchedLocations();
    return Object.prototype.hasOwnProperty.call(watched, chargerId);
  }

  static setInstallDismissed(dismissed: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.installDismissed, dismissed.toString());
    } catch (error) {
      console.error('Error saving install dismissal to localStorage:', error);
    }
  }

  static isInstallDismissed(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.installDismissed) === 'true';
    } catch (error) {
      console.error('Error reading install dismissal from localStorage:', error);
      return false;
    }
  }
}
