import { useState, useEffect, useCallback } from 'react';
import ChargerMap from './components/ChargerMap';
import ChargerSidebar from './components/ChargerSidebar';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { ChargerService } from './services/chargerService';
import { StorageService } from './services/storageService';
import { NotificationService } from './services/notificationService';
import type { Charger, LidlCharger } from './types/charger';
import './App.css';

function App() {
  const [protergiaChargers, setProtergiaChargers] = useState<Charger[]>([]);
  const [lidlChargers, setLidlChargers] = useState<LidlCharger[]>([]);
  const [selectedCharger, setSelectedCharger] = useState<{ charger: Charger | LidlCharger; type: 'protergia' | 'lidl' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchedCount, setWatchedCount] = useState(0);

  // Load chargers on mount
  useEffect(() => {
    const loadChargers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [protergiaData, lidlData] = await Promise.allSettled([
          ChargerService.fetchProtergia(),
          ChargerService.fetchLidl()
        ]);

        if (protergiaData.status === 'fulfilled') {
          setProtergiaChargers(protergiaData.value);
        } else {
          console.error('Failed to load Protergia chargers:', protergiaData.reason);
        }

        if (lidlData.status === 'fulfilled') {
          setLidlChargers(lidlData.value);
        } else {
          console.error('Failed to load Lidl chargers:', lidlData.reason);
        }

      } catch (err) {
        console.error('Error loading chargers:', err);
        setError('Failed to load charger data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadChargers();
  }, []);

  const updateWatchedCount = () => {
    const watched = StorageService.getWatchedLocations();
    setWatchedCount(Object.keys(watched).length);
  };

  const checkWatchedLocations = useCallback(async () => {
    const watchedLocations = StorageService.getWatchedLocations();
    const watchedIds = Object.keys(watchedLocations);
    
    if (watchedIds.length === 0) return;

    try {
      const updatedChargers = await ChargerService.checkWatchedLocations(watchedIds);
      
      updatedChargers.forEach(charger => {
        if (watchedLocations[charger.id]) {
          // Check if any plug is available
          let isAvailable = false;
          if (charger.zones) {
            charger.zones.forEach(zone => {
              if (zone.evses) {
                zone.evses.forEach(evse => {
                  if (evse.status && evse.status.toLowerCase() === 'available') {
                    isAvailable = true;
                  }
                });
              }
            });
          }

          // If it was unavailable and now available, send notification
          const wasUnavailable = watchedLocations[charger.id].lastStatus === 'unavailable' || 
                                watchedLocations[charger.id].lastStatus === false;
          
          if (wasUnavailable && isAvailable) {
            NotificationService.sendNotification(charger.name, charger.id, () => {
              // Remove from watched list since it's now available
              StorageService.removeWatchedLocation(charger.id);
              updateWatchedCount();
              // Refresh chargers
              window.location.reload();
            });
          }

          // Update the last known status
          const updatedWatched = StorageService.getWatchedLocations();
          updatedWatched[charger.id].lastStatus = isAvailable;
          StorageService.saveWatchedLocations(updatedWatched);
        }
      });
    } catch (error) {
      console.error('Error checking watched locations:', error);
    }
  }, []);

  // Request notification permission and setup monitoring
  useEffect(() => {
    NotificationService.requestPermission();
    updateWatchedCount();
    
    // Check watched locations every 30 seconds
    const interval = setInterval(checkWatchedLocations, 30000);
    
    return () => clearInterval(interval);
  }, [checkWatchedLocations]);

  const handleChargerClick = (charger: Charger | LidlCharger, type: 'protergia' | 'lidl') => {
    setSelectedCharger({ charger, type });
  };

  const handleCloseSidebar = () => {
    setSelectedCharger(null);
  };

  const handleWatchedChange = () => {
    updateWatchedCount();
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e3e3e3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }}></div>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading chargers...</div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <ChargerMap
        protergiaChargers={protergiaChargers}
        lidlChargers={lidlChargers}
        onChargerClick={handleChargerClick}
      />
      <ChargerSidebar
        selectedCharger={selectedCharger}
        onClose={handleCloseSidebar}
        onWatchedChange={handleWatchedChange}
      />
      
      {/* Watched locations indicator */}
      {watchedCount > 0 && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          zIndex: 1000,
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}>
          👀 Watching {watchedCount} location{watchedCount > 1 ? 's' : ''}
        </div>
      )}

      <PWAInstallPrompt />

      {/* Footer */}
      <footer style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        padding: '16px',
        textAlign: 'center',
        fontSize: '15px',
        borderTop: '1px solid #e0e0e0',
        background: '#f8f9fa',
        color: '#333',
        zIndex: 1000,
				width: '100%'
      }}>
        ⚡ Electrified by{' '}
        <a 
          href="https://cpapazoglou.eu/" 
          target="_blank" 
          rel="noopener" 
          style={{ color: '#28a745', fontWeight: 'bold', textDecoration: 'none' }}
        >
          CPAPAZOGLOU
        </a>
      </footer>
    </div>
  );
}

export default App;
