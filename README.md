# EV Charger Availability React App

A React Progressive Web Application (PWA) for checking the availability of electric vehicle charging stations in Greece. This app displays real-time status of EV chargers from multiple providers (Protergia/WattVolt and Lidl) on an interactive map and allows users to subscribe to notifications when unavailable chargers become available.

## ✨ Features

- **Interactive Map**: View charger locations on a Leaflet map with color-coded status indicators
  - 🟢 Green: Available chargers
  - 🔴 Red: Unavailable/occupied chargers  
  - 🟡 Half-colored: Partially available (some plugs free)
  - 🔵 Blue with 'L': Lidl chargers
- **Real-time Status**: Live charger availability from multiple providers
- **Notification System**: Subscribe to get notified when unavailable chargers become available
- **PWA Support**: Install as a mobile app with background monitoring
- **Offline Support**: Service worker provides offline functionality
- **Multi-Provider Support**: 
  - Protergia/WattVolt chargers
  - Lidl charging stations
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and development server
- **React Leaflet** - Interactive maps
- **Axios** - HTTP requests
- **Service Worker** - PWA functionality and background sync
- **Web Notifications API** - Push notifications

## 🛠️ Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173/`

### Build

Build for production:
```bash
npm run build
```

### Preview

Preview the production build:
```bash
npm run preview
```

### Linting

Run ESLint:
```bash
npm run lint
```

## 📱 PWA Features

- **Install Prompt**: Users can install the app on their devices
- **Background Sync**: Monitor chargers even when the app is minimized (PWA mode)
- **Push Notifications**: Get notified when watched chargers become available
- **Offline Support**: Basic functionality works offline
- **App Shortcuts**: Quick actions from the home screen

## 📊 Project Structure

```
src/
├── components/
│   ├── ChargerMap.tsx       # Interactive Leaflet map component
│   ├── ChargerSidebar.tsx   # Sidebar with charger details and watched locations
│   └── PWAInstallPrompt.tsx # PWA installation prompt
├── services/
│   ├── chargerService.ts    # API calls to charger providers
│   ├── storageService.ts    # Local storage management
│   └── notificationService.ts # Browser notifications
├── types/
│   └── charger.ts          # TypeScript type definitions
├── App.tsx                 # Main application component
└── main.tsx               # Application entry point
public/
├── sw.js                  # Service worker for PWA functionality
└── manifest.json          # PWA manifest
```

## 🔌 Data Sources

- **Protergia/WattVolt**: Greece's main EV charging network
- **Lidl**: Lidl supermarket charging stations
- APIs provide real-time availability status for individual charging plugs

## 📋 How to Use

1. **View Map**: The app loads with an interactive map showing all available chargers
2. **Check Status**: 
   - Green markers = Available
   - Red markers = Occupied/Unavailable
   - Blue 'L' markers = Lidl chargers
3. **Get Details**: Click any marker to see charger details in the sidebar
4. **Watch Chargers**: For unavailable chargers, click "Notify me when available" to get notifications
5. **Install PWA**: Accept the install prompt for the best experience with background monitoring

## 🔔 Notification System

- Click on red (unavailable) markers to subscribe to notifications
- Get notified when chargers become available
- Notifications work even when the app is minimized (in PWA mode)
- Individual plug monitoring for multi-plug chargers

## 🌐 Browser Compatibility

- Modern browsers with ES6+ support
- Service Worker support for PWA features
- Geolocation API for location services
- Web Notifications API for push notifications

## 🔒 Privacy

- No user data is collected or stored on servers
- Watched locations are stored locally in browser storage
- Location data is only used for map display

## 🚧 Future Enhancements

- [ ] Route planning with charging stops
- [ ] Charging cost calculator
- [ ] User reviews and ratings
- [ ] Booking/reservation system
- [ ] More charging providers
- [ ] Advanced filtering options

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

⚡ **Electrified by [CPAPAZOGLOU](https://cpapazoglou.eu/)**
