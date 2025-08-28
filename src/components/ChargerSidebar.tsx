import { useState, useEffect } from 'react';
import type { Charger, LidlCharger, WatchedLocations, LidlLocationDetails } from '../types/charger';
import { StorageService } from '../services/storageService';
import { ChargerService } from '../services/chargerService';

interface ChargerSidebarProps {
  selectedCharger: { charger: Charger | LidlCharger; type: 'protergia' | 'lidl' } | null;
  onClose: () => void;
  onWatchedChange: () => void;
}

export default function ChargerSidebar({ selectedCharger, onClose, onWatchedChange }: ChargerSidebarProps) {
  const [watchedLocations, setWatchedLocations] = useState<WatchedLocations>({});
  const [lidlDetails, setLidlDetails] = useState<LidlLocationDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    setWatchedLocations(StorageService.getWatchedLocations());
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedCharger?.type === 'lidl') {
      const lidlCharger = selectedCharger.charger as LidlCharger;
      const locationId = lidlCharger.properties.location_id || lidlCharger.properties.name || '';
      if (locationId) {
        setLoading(true);
        ChargerService.fetchLidlDetails(locationId)
          .then(setLidlDetails)
          .catch(console.error)
          .finally(() => setLoading(false));
      }
    } else {
      setLidlDetails(null);
    }
  }, [selectedCharger]);

  const handleWatchToggle = (chargerId: string, chargerName: string) => {
    if (StorageService.isLocationWatched(chargerId)) {
      StorageService.removeWatchedLocation(chargerId);
    } else {
      StorageService.addWatchedLocation(chargerId, chargerName);
    }
    setWatchedLocations(StorageService.getWatchedLocations());
    onWatchedChange();
  };

  const handlePlugWatchToggle = (plugKey: string, chargerName: string, plugId: string) => {
    if (StorageService.isLocationWatched(plugKey)) {
      StorageService.removeWatchedLocation(plugKey);
    } else {
      StorageService.addWatchedLocation(plugKey, `${chargerName} (Plug ${plugId})`);
    }
    setWatchedLocations(StorageService.getWatchedLocations());
    onWatchedChange();
  };

  const renderWatchedLocations = () => {
    const count = Object.keys(watchedLocations).length;
    
    if (count === 0) {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      const isFileProtocol = !location.protocol.startsWith('http');
      let pwaMessage = '';

      if (isFileProtocol) {
        pwaMessage = 'File Mode: For full PWA features (background notifications, install), run on a web server with http:// or https:// protocol.';
      } else if (isPWA) {
        pwaMessage = 'PWA Mode: The app will continue monitoring chargers even when minimized!';
      } else {
        pwaMessage = 'Pro Tip: Install as PWA for background notifications when minimized.';
      }

      return (
        <div>
          <div style={{ padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
            <strong>🔔 Notification Feature:</strong><br />
            Click on red markers (unavailable chargers) to subscribe for notifications when they become available.<br /><br />
            <strong>💡 {pwaMessage}</strong>
          </div>
          <p>You are not watching any locations.</p>
        </div>
      );
    }

    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const backgroundMessage = isPWA
      ? 'PWA Active: Chargers are monitored even when the app is minimized or closed.'
      : 'Background Mode: For best results, keep the app open or install as PWA for continuous monitoring.';

    return (
      <div>
        <h4>Watched Locations ({count})</h4>
        <div style={{ padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>
          <strong>💡 {backgroundMessage}</strong>
        </div>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {Object.entries(watchedLocations).map(([id, data]) => (
            <li key={id} style={{ marginBottom: '10px', padding: '8px', borderRadius: '4px' }}>
              <strong>{data.name}</strong><br />
              <small>Added: {new Date(data.subscribedAt).toLocaleDateString()}</small>
              <button
                onClick={() => {
                  StorageService.removeWatchedLocation(id);
                  setWatchedLocations(StorageService.getWatchedLocations());
                  onWatchedChange();
                }}
                style={{
                  float: 'right',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderChargerDetails = () => {
    if (!selectedCharger) return null;

    const { charger, type } = selectedCharger;

    if (type === 'protergia') {
      const protergiaCharger = charger as Charger;
      
      // Check if any plug is available
      let isAvailable = false;
      if (protergiaCharger.zones) {
        protergiaCharger.zones.forEach(zone => {
          if (zone.evses) {
            zone.evses.forEach(evse => {
              if (evse.status && evse.status.toLowerCase() === 'available') {
                isAvailable = true;
              }
            });
          }
        });
      }

      return (
        <div>
          <button
            onClick={onClose}
            style={{
              float: 'right',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '10px'
            }}
          >
            Close
          </button>
          <h3>{protergiaCharger.name}</h3>
          <p><strong>Provider:</strong> Protergia</p>
          <p><strong>Address:</strong> {protergiaCharger.address}</p>
          
          <h4>Plugs:</h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {protergiaCharger.zones?.map(zone => 
              zone.evses?.map((evse, index) => {
                const plugId = evse.identifier || evse.id || index.toString();
                const status = evse.status;
                const plugKey = `${protergiaCharger.id}_${plugId}`;
                const isPlugWatched = StorageService.isLocationWatched(plugKey);
                
                return (
                  <li key={plugId} style={{ marginBottom: '5px' }}>
                    Plug ID: {plugId}, Status: {status}
                    {status && status.toLowerCase() !== 'available' && (
                      <button
                        onClick={() => handlePlugWatchToggle(plugKey, protergiaCharger.name, plugId)}
                        style={{
                          marginLeft: '10px',
                          padding: '4px 8px',
                          backgroundColor: isPlugWatched ? '#dc3545' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        {isPlugWatched ? 'Unsubscribe' : 'Notify me'}
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>

          {!isAvailable && (
            <button
              onClick={() => handleWatchToggle(protergiaCharger.id, protergiaCharger.name)}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: StorageService.isLocationWatched(protergiaCharger.id) ? '#dc3545' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {StorageService.isLocationWatched(protergiaCharger.id) 
                ? 'Unsubscribe from notifications' 
                : 'Notify me when available'
              }
            </button>
          )}
        </div>
      );
    } else {
      // Lidl charger
      const lidlCharger = charger as LidlCharger;
      
      return (
        <div>
          <button
            onClick={onClose}
            style={{
              float: 'right',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '10px'
            }}
          >
            Close
          </button>
          <h3>🏪 {lidlCharger.properties.LocationName || lidlCharger.properties.name || 'Lidl Charger'}</h3>
          <p><strong>Provider:</strong> Lidl</p>
          
          {loading && <p>Loading detailed information...</p>}
          
          {lidlDetails && (
            <div>
              <p><strong>Address:</strong> {lidlDetails.Loc.address + ', ' + lidlDetails.Loc.city || 'Address not available'}</p>
              <h4>🔌 Connectors:</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {lidlDetails.Loc.evses?.map((evse, index) => {
                  const power = evse.connectors?.[0]?.max_electric_power ? evse.connectors[0].max_electric_power / 1000 : 'Unknown';
                  const type = evse.connectors?.[0]?.standard || 'Unknown';
                  
                  return (
                    <li key={index}>
                      <strong>{type} ({power} kW)</strong> - {evse.status}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          
          <p style={{ fontStyle: 'italic', color: '#666', marginTop: '15px' }}>
            Lidl chargers don't support notifications 😔
          </p>
        </div>
      );
    }
  };

  return (
    <div style={{ 
      width: windowWidth < 780 ? '100vw' : '40vw', 
      height: windowWidth < 780 ? '50vh' : '100vh', 
      overflowY: 'auto', 
      padding: '20px',
      boxSizing: 'border-box',
      paddingBottom: '75px'
    }}>
      <h2>EV Charger Availability</h2>
      
      <div>
        {selectedCharger ? renderChargerDetails() : renderWatchedLocations()}
      </div>
    </div>
  );
}
