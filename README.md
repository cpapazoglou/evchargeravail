# EV Charger PWA

This is a Progressive Web App for monitoring EV charger availability.

## Features

- 🗺️ Interactive map with charger locations
- 🔴/🟢 Color-coded availability status
- 🔔 Background notifications when chargers become available
- 📱 PWA installation support
- 🔄 Background sync for status updates
- 📱 Mobile-optimized interface

## Installation

1. Open the app in a modern browser (Chrome, Firefox, Safari, Edge)
2. Look for the install prompt or use the menu to install
3. The app will work offline and in the background

## Background Processing

The PWA uses Service Workers to:
- Check charger status even when the app is minimized
- Send notifications for availability changes
- Cache resources for offline use
- Sync data in the background

## Browser Support

- Chrome 70+ (full PWA support)
- Firefox 68+ (partial support)
- Safari 12.2+ (iOS) / 13+ (macOS)
- Edge 79+

## Development

To test PWA features:
1. Open DevTools → Application tab
2. Check Service Workers and Manifest
3. Test background sync and notifications
