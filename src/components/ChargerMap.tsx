import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Charger, LidlCharger } from '../types/charger';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with Vite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface ChargerMarkersProps {
  protergiaChargers: Charger[];
  lidlChargers: LidlCharger[];
  onChargerClick: (charger: Charger | LidlCharger, type: 'protergia' | 'lidl') => void;
}

function ChargerMarkers({ protergiaChargers, lidlChargers, onChargerClick }: ChargerMarkersProps) {
  const map = useMap();
  const hasInitiallyFitted = useRef(false);

  useEffect(() => {
    // Clear existing markers
    map.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const markerPositions: [number, number][] = [];

    // Add Protergia chargers
    protergiaChargers.forEach((charger) => {
      const [lat, lng] = charger.location.split(',').map(Number);
      markerPositions.push([lat, lng]);

      // Determine marker color based on availability
      const plugStatuses: string[] = [];
      if (charger.zones) {
        charger.zones.forEach(zone => {
          if (zone.evses) {
            zone.evses.forEach(evse => {
              if (evse.status) {
                plugStatuses.push(evse.status.toLowerCase());
              }
            });
          }
        });
      }

      let markerClass = 'circle-red'; // Default: unavailable
      if (plugStatuses.length === 2) {
        if (plugStatuses[0] === 'available' && plugStatuses[1] === 'available') {
          markerClass = 'circle-green';
        } else if (plugStatuses[0] !== 'available' && plugStatuses[1] !== 'available') {
          markerClass = 'circle-red';
        } else {
          markerClass = 'circle-half';
        }
      } else if (plugStatuses.some(s => s === 'available')) {
        markerClass = 'circle-green';
      }

      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="charger-circle ${markerClass}"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
      marker.on('click', () => onChargerClick(charger, 'protergia'));
    });

    // Add Lidl chargers
    lidlChargers.forEach((charger) => {
      const [lat, lng] = charger.geometry.coordinates; // Note: Lidl coordinates are [lng, lat]
      markerPositions.push([lat, lng]);

      const markerIcon = L.divIcon({
        className: 'custom-marker lidl-marker',
        html: `<div class="charger-circle circle-lidl"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
      marker.on('click', () => onChargerClick(charger, 'lidl'));
    });

    // Only fit bounds on initial load, not on every click
    if (markerPositions.length > 0 && !hasInitiallyFitted.current) {
      map.fitBounds(markerPositions, { padding: [20, 20] });
      hasInitiallyFitted.current = true;
    }
  }, [map, protergiaChargers, lidlChargers, onChargerClick]);

  return null;
}

interface ChargerMapProps {
  protergiaChargers: Charger[];
  lidlChargers: LidlCharger[];
  onChargerClick: (charger: Charger | LidlCharger, type: 'protergia' | 'lidl') => void;
}

export default function ChargerMap({ protergiaChargers, lidlChargers, onChargerClick }: ChargerMapProps) {
  return (
    <MapContainer
      center={[39.0742, 21.8243]} // Centered on Greece
      zoom={7}
      style={{ height: '100vh', width: '70vw' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ChargerMarkers
        protergiaChargers={protergiaChargers}
        lidlChargers={lidlChargers}
        onChargerClick={onChargerClick}
      />
    </MapContainer>
  );
}
