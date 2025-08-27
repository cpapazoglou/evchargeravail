document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([39.0742, 21.8243], 7); // Centered on Greece

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const chargerDetailsContainer = document.getElementById('charger-details');

    const fetchChargers = async () => {
        const url = 'https://wattvolt.eu.charge.ampeco.tech/api/v1/app/locations?operatorCountry=GR';
        const body = {
            locations: {
                "83": "", "89": "", "97": "", "159": "", "187": "", "191": "",
                "26097": "", "26098": "", "26099": "", "26199": "", "26225": "",
                "26243": "", "26259": "", "35896": "", "46152": ""
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
        chargers.forEach(charger => {
            const [lat, lon] = charger.location.split(',').map(Number);
            const marker = L.marker([lat, lon]).addTo(map);

            marker.on('click', () => {
                displayChargerDetails(charger);
            });
        });
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
