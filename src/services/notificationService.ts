export class NotificationService {
  static async requestPermission(): Promise<boolean> {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    }
    return false;
  }

  static sendNotification(chargerName: string, chargerId: string, onClick?: () => void): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Charger Available!', {
        body: `A charger at ${chargerName} is now available!`,
        icon: '/vite.svg', // Using Vite icon as fallback
        tag: `charger-${chargerId}`,
        requireInteraction: true
      });

      if (onClick) {
        notification.onclick = () => {
          window.focus();
          onClick();
        };
      }
    }
  }

  static hasPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }
}
