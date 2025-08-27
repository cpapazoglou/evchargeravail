document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([39.0742, 21.8243], 7); // Centered on Greece

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const chargerDetailsContainer = document.getElementById('charger-details');

    const fetchChargers = async () => {
        const url = 'https://wattvolt.eu.charge.ampeco.tech/api/v1/app/locations?operatorCountry=GR';
        const body = {
											"locations": {
												"26096": "",
												"26097": "",
												"26098": "",
												"26099": "",
												"26100": "",
												"26101": "",
												"26102": "",
												"26103": "",
												"26104": "",
												"26105": "",
												"26106": "",
												"26107": "",
												"26109": "",
												"26110": "",
												"26111": "",
												"26116": "",
												"26117": "",
												"26118": ""
											}
										};
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            displayChargers(data.locations);
        } catch (error) {
            console.error('Error fetching chargers:', error);
            chargerDetailsContainer.innerHTML = '<p>Error fetching charger data.</p>';
        }
    };

    const displayChargers = (chargers) => {
        const markerGroup = L.layerGroup().addTo(map);
        const markerPositions = [];
        
        chargers.forEach(charger => {
            const [lat, lon] = charger.location.split(',').map(Number);
            markerPositions.push([lat, lon]);
            
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
            
            // Create marker with appropriate color
            const markerColor = isAvailable ? 'green' : 'red';
            const markerIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${markerColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            const marker = L.marker([lat, lon], { icon: markerIcon }).addTo(markerGroup);

            marker.on('click', () => {
                displayChargerDetails(charger);
            });
        });
        
        // Fit map to show all markers
        if (markerPositions.length > 0) {
            map.fitBounds(markerPositions, { padding: [20, 20] });
        }
    };

    const displayChargerDetails = (charger) => {
        let plugsHtml = '<ul>';
        if (charger.zones) {
            charger.zones.forEach(zone => {
                if (zone.evses) {
                    zone.evses.forEach(evse => {
                        plugsHtml += `<li>Plug ID: ${evse.identifier || evse.id}, Status: ${evse.status}</li>`;
                    });
                }
            });
        }
        plugsHtml += '</ul>';

        chargerDetailsContainer.innerHTML = `
            <h3>${charger.name}</h3>
            <p><strong>Provider:</strong> Protergia</p>
            <p><strong>Address:</strong> ${charger.address}</p>
            <h4>Plugs:</h4>
            ${plugsHtml}
        `;
    };

    fetchChargers();
});
