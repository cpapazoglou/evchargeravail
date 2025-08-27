document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([39.0742, 21.8243], 7); // Centered on Greece

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const chargerDetailsContainer = document.getElementById('charger-details');

    // Notification management
    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    };

    const getWatchedLocations = () => {
        const watched = localStorage.getItem('watchedChargers');
        return watched ? JSON.parse(watched) : {};
    };

    const saveWatchedLocations = (watched) => {
        localStorage.setItem('watchedChargers', JSON.stringify(watched));
    };

    const addWatchedLocation = (chargerId, chargerName) => {
        const watched = getWatchedLocations();
        watched[chargerId] = {
            name: chargerName,
            subscribedAt: new Date().toISOString(),
            lastStatus: 'unavailable'
        };
        saveWatchedLocations(watched);
        updateWatchedIndicator();
    };

    const removeWatchedLocation = (chargerId) => {
        const watched = getWatchedLocations();
        delete watched[chargerId];
        saveWatchedLocations(watched);
        updateWatchedIndicator();
    };

    const isLocationWatched = (chargerId) => {
        const watched = getWatchedLocations();
        return watched.hasOwnProperty(chargerId);
    };

    const sendNotification = (chargerName, chargerId) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('Charger Available!', {
                body: `A charger at ${chargerName} is now available!`,
                icon: '/favicon.ico',
                tag: `charger-${chargerId}`,
                requireInteraction: true
            });

            notification.onclick = () => {
                window.focus();
                // Remove from watched list since it's now available
                removeWatchedLocation(chargerId);
                // Refresh the map to update marker colors
                fetchChargers();
                // Update the sidebar display
                chargerDetailsContainer.innerHTML = displayWatchedLocations();
            };
        }
    };

    const checkWatchedLocations = async () => {
        const watched = getWatchedLocations();
        if (Object.keys(watched).length === 0) return;

        try {
            const response = await fetch('https://wattvolt.eu.charge.ampeco.tech/api/v1/app/locations?operatorCountry=GR', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "locations": Object.keys(watched).reduce((acc, id) => {
                        acc[id] = "";
                        return acc;
                    }, {})
                })
            });

            if (!response.ok) return;

            const data = await response.json();
            const watchedLocations = getWatchedLocations();

            data.locations.forEach(charger => {
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
                    if (!watchedLocations[charger.id].lastStatus && isAvailable) {
                        sendNotification(charger.name, charger.id);
                    }

                    // Update the last known status
                    watchedLocations[charger.id].lastStatus = isAvailable;
                }
            });

            saveWatchedLocations(watchedLocations);
        } catch (error) {
            console.error('Error checking watched locations:', error);
        }
    };

    // Request notification permission on load
    requestNotificationPermission();

    // Check watched locations every 30 seconds
    setInterval(checkWatchedLocations, 30000);

    // Add watched locations indicator
    const updateWatchedIndicator = () => {
        const watched = getWatchedLocations();
        const count = Object.keys(watched).length;

        let indicator = document.getElementById('watched-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'watched-indicator';
            document.body.appendChild(indicator);
        }

        if (count > 0) {
            indicator.innerHTML = `👀 Watching ${count} location${count > 1 ? 's' : ''}`;
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    };

    const displayWatchedLocations = () => {
        const watched = getWatchedLocations();
        const watchedCount = Object.keys(watched).length;

        if (watchedCount === 0) {
            return '<p>You are not watching any locations.</p>';
        }

        let watchedHtml = `<h4>Watched Locations (${watchedCount})</h4><ul>`;
        Object.entries(watched).forEach(([id, data]) => {
            watchedHtml += `
                <li style="margin-bottom: 10px; padding: 8px; background-color: #f8f9fa; border-radius: 4px;">
                    <strong>${data.name}</strong><br>
                    <small>Added: ${new Date(data.lastStatus ? data.subscribedAt : Date.now()).toLocaleDateString()}</small>
                    <button onclick="removeWatchedLocation('${id}'); displayWatchedLocations(); updateWatchedIndicator();" 
                            style="float: right; background: #dc3545; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">
                        Remove
                    </button>
                </li>
            `;
        });
        watchedHtml += '</ul>';
        return watchedHtml;
    };

    // Make removeWatchedLocation available globally for the button onclick
    window.removeWatchedLocation = removeWatchedLocation;

    // Initialize with watched locations
    chargerDetailsContainer.innerHTML = displayWatchedLocations();

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

        // Notification button for unavailable chargers
        let notificationButton = '';
        if (!isAvailable) {
            const isWatched = isLocationWatched(charger.id);
            const buttonText = isWatched ? 'Unsubscribe from notifications' : 'Notify me when available';
            const buttonClass = isWatched ? 'unsubscribe-btn' : 'subscribe-btn';

            notificationButton = `
                <button id="notification-btn" class="${buttonClass}" style="margin-top: 10px; padding: 8px 16px; background-color: ${isWatched ? '#dc3545' : '#28a745'}; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    ${buttonText}
                </button>
            `;
        }

        chargerDetailsContainer.innerHTML = `
            <h3>${charger.name}</h3>
            <p><strong>Provider:</strong> Protergia</p>
            <p><strong>Address:</strong> ${charger.address}</p>
            <h4>Plugs:</h4>
            ${plugsHtml}
            ${notificationButton}
        `;

        // Add event listener for notification button
        const notificationBtn = document.getElementById('notification-btn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                if (isLocationWatched(charger.id)) {
                    removeWatchedLocation(charger.id);
                    notificationBtn.textContent = 'Notify me when available';
                    notificationBtn.className = 'subscribe-btn';
                    notificationBtn.style.backgroundColor = '#28a745';
                } else {
                    addWatchedLocation(charger.id, charger.name);
                    notificationBtn.textContent = 'Unsubscribe from notifications';
                    notificationBtn.className = 'unsubscribe-btn';
                    notificationBtn.style.backgroundColor = '#dc3545';
                }
            });
        }
    };

    fetchChargers();
});
