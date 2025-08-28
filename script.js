document.addEventListener('DOMContentLoaded', async () => {
    // Check if running from file:// protocol and show warning
    const isFileProtocol = !location.protocol.startsWith('http');
    if (isFileProtocol) {
        console.warn('⚠️ App is running from file:// protocol. For full PWA features, run on a web server with http:// or https:// protocol.');
        console.log('💡 To test PWA features:');
        console.log('   1. Use a local web server: python3 -m http.server 8000');
        console.log('   2. Open: http://localhost:8000');
        console.log('   3. Test install prompt and background notifications');
    }

    // TESTING MODE: Enable with ?test=true in URL
    const isTestingMode = new URLSearchParams(window.location.search).get('test') === 'true';
    if (isTestingMode) {
        console.log('🧪 TESTING MODE ENABLED: Chargers will become available after 10 seconds');
        console.log('📍 To test: 1) Click on red markers to watch them, 2) Wait 10 seconds, 3) Get notifications!');
    }

    const map = L.map('map').setView([39.0742, 21.8243], 7); // Centered on Greece

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' // 1x1 transparent pixel as fallback
    }).addTo(map);

    const chargerDetailsContainer = document.getElementById('charger-details');

    // Make chargerDetailsContainer globally accessible for button onclick handlers
    window.chargerDetailsContainer = chargerDetailsContainer;

    let deferredPrompt;
    const installPrompt = document.getElementById('install-prompt');
    const installBtn = document.getElementById('install-btn');
    const dismissBtn = document.getElementById('dismiss-install');

    // Handle PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        // Only show install prompt if running on http/https
        if (!location.protocol.startsWith('http')) {
            console.log('PWA install not available in file:// mode');
            return;
        }

        e.preventDefault();
        deferredPrompt = e;

        // Show install prompt if not already dismissed
        try {
            if (!localStorage.getItem('installDismissed') && installPrompt) {
                installPrompt.style.display = 'block';
            }
        } catch (error) {
            console.error('Error reading install dismissal from localStorage:', error);
            if (installPrompt) installPrompt.style.display = 'block';
        }
    });

    // Handle install button click
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;

                if (outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }

                deferredPrompt = null;
                if (installPrompt) installPrompt.style.display = 'none';
            }
        });
    }

    // Handle dismiss button click
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            if (installPrompt) installPrompt.style.display = 'none';
            try {
                localStorage.setItem('installDismissed', 'true');
            } catch (error) {
                console.error('Error saving install dismissal to localStorage:', error);
            }
        });
    }

    // Hide install prompt if app is already installed
    window.addEventListener('appinstalled', () => {
        if (installPrompt) installPrompt.style.display = 'none';
        console.log('PWA was installed successfully');
    });

    // Notification management
    const requestNotificationPermission = async () => {
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
    };

    const getWatchedLocations = () => {
        try {
            const watched = localStorage.getItem('watchedChargers');
            return watched ? JSON.parse(watched) : {};
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return {};
        }
    };

    const saveWatchedLocations = (watched) => {
        try {
            localStorage.setItem('watchedChargers', JSON.stringify(watched));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    };

    let addWatchedLocation = (chargerId, chargerName) => {
        const watched = getWatchedLocations();
        watched[chargerId] = {
            name: chargerName,
            subscribedAt: new Date().toISOString(),
            lastStatus: 'unavailable'
        };
        saveWatchedLocations(watched);
        updateWatchedIndicator();
        addRefreshButton();
    };

    let removeWatchedLocation = (chargerId) => {
        const watched = getWatchedLocations();
        delete watched[chargerId];
        saveWatchedLocations(watched);
        updateWatchedIndicator();
        addRefreshButton();
    };

    const isLocationWatched = (chargerId) => {
        const watched = getWatchedLocations();
        return watched.hasOwnProperty(chargerId);
    };

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

    // Add manual refresh button for watched locations
    const addRefreshButton = () => {
        const watched = getWatchedLocations();
        const count = Object.keys(watched).length;

        if (count > 0) {
            const refreshButton = document.createElement('button');
            refreshButton.id = 'refresh-watched';
            refreshButton.innerHTML = '🔄 Refresh Status';
            refreshButton.style.cssText = `
                position: absolute;
                top: 50px;
                right: 10px;
                background: #007bff;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 20px;
                cursor: pointer;
                font-size: 12px;
                z-index: 1000;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            `;

            refreshButton.onclick = () => {
                refreshButton.innerHTML = '⏳ Checking...';
                refreshButton.disabled = true;

                checkWatchedLocations().finally(() => {
                    refreshButton.innerHTML = '🔄 Refresh Status';
                    refreshButton.disabled = false;
                });
            };

            document.body.appendChild(refreshButton);
        } else {
            const existingButton = document.getElementById('refresh-watched');
            if (existingButton) {
                existingButton.remove();
            }
        }
    };

    const sendNotification = (chargerName, chargerId) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('Charger Available!', {
                body: `A charger at ${chargerName} is now available!`,
                icon: '/favicon.svg',
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

    // Register service worker for background notifications
    const registerServiceWorker = async () => {
        // Only register service worker if running on http/https
        if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
                console.log('Service Worker registered:', registration);
                console.log('Service Worker registered:', registration);

                // Handle service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New version available
                                if (confirm('A new version is available! Reload to update?')) {
                                    window.location.reload();
                                }
                            }
                        });
                    }
                });

                // Register background sync if supported
                if ('sync' in registration) {
                    try {
                        await registration.sync.register('check-chargers');
                        console.log('Background sync registered');
                    } catch (error) {
                        console.log('Background sync registration failed:', error.message);
                    }
                }

                // Register periodic sync if supported (Chrome 80+)
                if ('periodicSync' in registration) {
                    try {
                        const status = await navigator.permissions.query({
                            name: 'periodic-background-sync',
                        });

                        if (status.state === 'granted') {
                            await registration.periodicSync.register('charger-status-check', {
                                minInterval: 60000 // 1 minute
                            });
                            console.log('Periodic background sync registered');
                        }
                    } catch (error) {
                        // Periodic sync not supported or permission denied
                        console.log('Periodic background sync not available:', error.message);
                    }
                }

                return registration;
            } catch (error) {
                console.error('Service Worker registration failed:', error);
                return null;
            }
        }
        return null;
    };

    // Register service worker on load
    const registration = await registerServiceWorker();

    // Handle service worker messages
    if (registration) {
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data) {
                switch (event.data.type) {
                    case 'CHECK_CHARGERS':
                        checkWatchedLocations();
                        break;
                    case 'BACKGROUND_CHECK_CHARGERS':
                        console.log('Background check requested at:', new Date(event.data.timestamp));
                        checkWatchedLocations();
                        break;
                    case 'REFRESH_ALL_CHARGERS':
                        console.log('Background refresh requested at:', new Date(event.data.timestamp));
                        fetchChargers();
                        break;
                }
            }
        });
    }

    // Enhanced visibility change handling for PWA
    let lastCheckTime = Date.now();
    let backgroundCheckInterval;

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            // Page became visible, check immediately and reset interval
            const now = Date.now();
            if (now - lastCheckTime > 30000) { // Only check if more than 30s have passed
                console.log('Page visible, checking chargers...');
                checkWatchedLocations();
            }
            lastCheckTime = now;

            // Clear background interval when visible
            if (backgroundCheckInterval) {
                clearInterval(backgroundCheckInterval);
                backgroundCheckInterval = null;
            }
        } else {
            // Page became hidden, start background checking
            console.log('Page hidden, switching to background mode');
            if (registration && 'sync' in registration) {
                // Trigger background sync
                registration.sync.register('check-chargers').catch(err => {
                    console.log('Background sync failed:', err.message);
                });
            }
        }
    });

    // Smart checking based on visibility
    const startSmartChecking = () => {
        setInterval(() => {
            if (!document.hidden) {
                checkWatchedLocations();
                lastCheckTime = Date.now();
            }
        }, 30000); // Check every 30 seconds when visible
    };

    startSmartChecking();

    // Functions are already defined above, no need to redefine them

    // Offline detection
    const addOfflineIndicator = () => {
        const offlineIndicator = document.createElement('div');
        offlineIndicator.id = 'offline-indicator';
        offlineIndicator.className = 'offline-indicator';
        offlineIndicator.innerHTML = '📵 Offline Mode';
        document.body.appendChild(offlineIndicator);

        const updateOnlineStatus = () => {
            if (!navigator.onLine) {
                offlineIndicator.classList.add('show');
            } else {
                offlineIndicator.classList.remove('show');
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        // Initial check
        updateOnlineStatus();
    };

    addOfflineIndicator();

    // Functions are already defined above, no need to redefine them

    const displayWatchedLocations = () => {
        const watched = getWatchedLocations();
        const watchedCount = Object.keys(watched).length;

        if (watchedCount === 0) {
            const isPWA = window.matchMedia('(display-mode: standalone)').matches;
            const isFileProtocol = !location.protocol.startsWith('http');
            let pwaMessage = '';

            if (isFileProtocol) {
                pwaMessage = '<strong>⚠️ File Mode:</strong> For full PWA features (background notifications, install), run on a web server with http:// or https:// protocol.';
            } else if (isPWA) {
                pwaMessage = '<strong>🚀 PWA Mode:</strong> The app will continue monitoring chargers even when minimized!';
            } else {
                pwaMessage = '<strong>💡 Pro Tip:</strong> Install as PWA for background notifications when minimized.';
            }

            return `
                <div class="notification-info">
                    <strong>🔔 Notification Feature:</strong><br>
                    Click on red markers (unavailable chargers) to subscribe for notifications when they become available.<br><br>
                    ${pwaMessage}
                </div>
                <p>You are not watching any locations.</p>
            `;
        }

        let watchedHtml = `<h4>Watched Locations (${watchedCount})</h4>`;

        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        const backgroundMessage = isPWA ?
            '<div class="notification-info"><strong>💡 PWA Active:</strong> Chargers are monitored even when the app is minimized or closed.</div>' :
            '<div class="notification-info"><strong>💡 Background Mode:</strong> For best results, keep the app open or install as PWA for continuous monitoring. <strong>iOS Users:</strong> To enable notifications for this PWA, see <a href="https://www.xda-developers.com/how-enable-safari-notifications-iphone/" target="_blank" rel="noopener" style="color:#0066cc;">How to Enable Safari Notifications on iPhone</a>.</div>';

        watchedHtml += backgroundMessage;
        watchedHtml += '<ul>';

        Object.entries(watched).forEach(([id, data]) => {
            watchedHtml += `
                <li style="margin-bottom: 10px; padding: 8px; background-color: #f8f9fa; border-radius: 4px;">
                    <strong>${data.name}</strong><br>
                    <small>Added: ${new Date(data.lastStatus ? data.subscribedAt : Date.now()).toLocaleDateString()}</small>
                    <button onclick="removeWatchedLocation('${id}'); chargerDetailsContainer.innerHTML = displayWatchedLocations(); updateWatchedIndicator(); addRefreshButton();" 
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

    // Make displayWatchedLocations available globally for the button onclick
    window.displayWatchedLocations = displayWatchedLocations;

    // Make other functions globally accessible for onclick handlers
    window.updateWatchedIndicator = updateWatchedIndicator;
    window.addRefreshButton = addRefreshButton;
    window.isLocationWatched = isLocationWatched;
    window.addWatchedLocation = addWatchedLocation;
    window.checkWatchedLocations = checkWatchedLocations;

    async function fetchChargers() {
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

    // Make fetchChargers globally accessible
    window.fetchChargers = fetchChargers;

    const displayChargers = (chargers) => {
        const markerGroup = L.layerGroup().addTo(map);
        const markerPositions = [];

        chargers.forEach((charger, index) => {
            const [lat, lon] = charger.location.split(',').map(Number);
            markerPositions.push([lat, lon]);

            // Check plug statuses for chargers with two plugs
            let plugStatuses = [];
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

            let markerClass = 'circle-red'; // Default: both unavailable
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

            // TESTING MODE: Make some chargers initially unavailable
            if (isTestingMode) {
                isAvailable = false;
                // Modify the charger data to reflect unavailable status
                if (charger.zones) {
                    charger.zones.forEach(zone => {
                        if (zone.evses) {
                            zone.evses.forEach(evse => {
                                evse.status = 'occupied'; // Make them occupied
                            });
                        }
                    });
                }
            }

            // Create marker with appropriate class
            const markerIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div class="charger-circle ${markerClass}"></div>`,
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

        // TESTING MODE: Schedule availability changes after 10 seconds
        if (isTestingMode) {
            setTimeout(() => {
                simulateAvailabilityChanges(chargers, markerGroup);
            }, 10000); // 10 seconds
        }
    };

    // TESTING MODE: Simulate charger availability changes
    const simulateAvailabilityChanges = (chargers, markerGroup) => {
        console.log('🧪 TESTING: Simulating charger availability changes...');

        const watchedLocations = getWatchedLocations();
        let notificationsSent = 0;

        chargers.forEach((charger, index) => {
            // Only change the first 3 chargers that were made unavailable
                const wasUnavailable = !charger.zones || charger.zones.every(zone =>
                    !zone.evses || zone.evses.every(evse => evse.status !== 'available')
                );

                if (wasUnavailable) {
                    // Make this charger available
                    if (charger.zones && charger.zones.length > 0) {
                        const firstZone = charger.zones[0];
                        if (firstZone.evses && firstZone.evses.length > 0) {
                            firstZone.evses[0].status = 'available';
                            console.log(`🟢 Charger "${charger.name}" is now AVAILABLE!`);

                            // Update marker color
                            const [lat, lon] = charger.location.split(',').map(Number);
                            markerGroup.eachLayer(marker => {
                                const markerLatLng = marker.getLatLng();
                                if (Math.abs(markerLatLng.lat - lat) < 0.001 &&
                                    Math.abs(markerLatLng.lng - lon) < 0.001) {
                                    const newIcon = L.divIcon({
                                        className: 'custom-marker',
                                        html: `<div style="background-color: green; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
                                        iconSize: [20, 20],
                                        iconAnchor: [10, 10]
                                    });
                                    marker.setIcon(newIcon);
                                }
                            });

                            // Send notification if this charger is being watched
                            if (watchedLocations[charger.id]) {
                                console.log(`📱 Sending notification for watched charger: ${charger.name}`);
                                sendNotification(charger.name, charger.id);
                                notificationsSent++;

                                // Update the watched location status
                                watchedLocations[charger.id].lastStatus = true;
                                saveWatchedLocations(watchedLocations);
                            }
                        }
                    }
                }
        });

        if (notificationsSent > 0) {
            console.log(`✅ Sent ${notificationsSent} notification(s) for chargers that became available!`);
            updateWatchedIndicator();
            chargerDetailsContainer.innerHTML = displayWatchedLocations();
        } else {
            console.log('ℹ️ No watched chargers became available (or none were being watched)');
        }

        // Show a success message
        const testMessage = document.createElement('div');
        testMessage.id = 'test-message';
        testMessage.innerHTML = `🧪 Test Complete! ${notificationsSent} notification(s) sent.`;
        testMessage.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #28a745;
            color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            animation: fadeInOut 3s ease-in-out;
        `;

        document.body.appendChild(testMessage);
        setTimeout(() => {
            if (testMessage.parentNode) {
                testMessage.parentNode.removeChild(testMessage);
            }
        }, 3000);
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
                        const plugId = evse.identifier || evse.id;
                        const status = evse.status;
                        let plugNotifyBtn = '';
                        if (status && status.toLowerCase() !== 'available') {
                            const plugKey = `${charger.id}_${plugId}`;
                            const isPlugWatched = isLocationWatched(plugKey);
                            const btnText = isPlugWatched ? 'Unsubscribe notification' : 'Notify me when plug available';
                            const btnClass = isPlugWatched ? 'unsubscribe-btn' : 'subscribe-btn';
                            plugNotifyBtn = `<button class="plug-notify-btn ${btnClass}" data-plugkey="${plugKey}" style="margin-left:10px; padding:8px; background-color:${isPlugWatched ? '#dc3545' : '#28a745'}; color:white; border:none; border-radius:3px; cursor:pointer; font-size:12px;">${btnText}</button>`;
                        }
                        plugsHtml += `<li>Plug ID: ${plugId}, Status: ${status} ${plugNotifyBtn}</li>`;
                    });
                }
            });
        }
        plugsHtml += '</ul>';

        // Notification button for unavailable chargers
        let notificationButton = '';
        if (!isAvailable) {
            const isWatched = isLocationWatched(charger.id);
            const buttonText = isWatched ? 'Unsubscribe from notifications' : 'Notify me when location available';
            const buttonClass = isWatched ? 'unsubscribe-btn' : 'subscribe-btn';

            notificationButton = `
                <button id="notification-btn" class="${buttonClass}" style="margin-top: 10px; padding: 8px 16px; background-color: ${isWatched ? '#dc3545' : '#28a745'}; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    ${buttonText}
                </button>
            `;
        }

        chargerDetailsContainer.innerHTML = `
                <button class="close-details-btn" id="close-details-btn">Close</button>
                <h3>${charger.name}</h3>
                <p><strong>Provider:</strong> Protergia</p>
                <p><strong>Address:</strong> ${charger.address}</p>
                <h4>Plugs:</h4>
                ${plugsHtml}
                ${notificationButton}
            `;

            // Add event listener for close button
            const closeBtn = document.getElementById('close-details-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    chargerDetailsContainer.innerHTML = displayWatchedLocations();
                });
            }

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

        // Add event listeners for plug notification buttons
        document.querySelectorAll('.plug-notify-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const plugKey = btn.getAttribute('data-plugkey');
                if (isLocationWatched(plugKey)) {
                    removeWatchedLocation(plugKey);
                    btn.textContent = 'Notify me when available';
                    btn.className = 'plug-notify-btn subscribe-btn';
                    btn.style.backgroundColor = '#28a745';
                } else {
                    addWatchedLocation(plugKey, `${charger.name} (Plug ${plugKey.split('_')[1]})`);
                    btn.textContent = 'Unsubscribe notification';
                    btn.className = 'plug-notify-btn unsubscribe-btn';
                    btn.style.backgroundColor = '#dc3545';
                }
            });
        });
    };

    // Initialize with watched locations
    chargerDetailsContainer.innerHTML = displayWatchedLocations();

    fetchChargers();
});
