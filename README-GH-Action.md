# EV Charger Availability - GitHub Action Setup

This repository contains a GitHub Action that automatically downloads EV charger data from the Greek energy ministry, processes it, and updates a Google Sheet with connector information.

## Setup Instructions

### 1. Google Sheets API Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API and Google Drive API
4. Create a Service Account:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Give it a name (e.g., "ev-charger-action")
   - Grant it the "Editor" role for Google Sheets
5. Create a JSON key for the service account
6. Download the JSON file

### 2. GitHub Secrets Setup

1. In your GitHub repository, go to Settings > Secrets and variables > Actions
2. Add a new secret named `GOOGLE_CREDENTIALS`
3. Copy the entire contents of the downloaded JSON key file and paste it as the secret value

### 3. Google Sheet Setup

1. Create a new Google Sheet or use an existing one
2. Share the sheet with the service account email (found in the JSON key file)
3. Grant "Editor" permissions to the service account

### 4. Workflow Configuration

The workflow is configured to run every 6 hours automatically. You can also trigger it manually from the Actions tab.

### Data Structure

The Google Sheet will contain the following columns:
- **name**: Location name
- **address**: Location address  
- **coordinates**: Latitude,longitude
- **max_electric_power**: Maximum electric power in watts
- **party_id**: Party identifier (e.g., PPC)

### Troubleshooting

- If the action fails with authentication errors, verify your Google credentials and sheet permissions
- If no data appears, check the source URL is accessible and the JSON structure hasn't changed
- The script processes nested data: Locations > EVSEs > Connectors
