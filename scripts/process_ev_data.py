#!/usr/bin/env python3
import requests
import zipfile
import json
import pandas as pd
import gspread
from google.oauth2.service_account import Credentials
import os
import io

def download_and_extract_zip(url):
    """Download zip file and extract JSON"""
    response = requests.get(url)
    response.raise_for_status()
    
    # Extract zip file in memory
    zip_file = zipfile.ZipFile(io.BytesIO(response.content))
    
    # Find the JSON file (assuming it's the only .json file)
    json_filename = None
    for filename in zip_file.namelist():
        if filename.endswith('.json'):
            json_filename = filename
            break
    
    if not json_filename:
        raise ValueError("No JSON file found in the zip archive")
    
    # Extract and parse JSON
    with zip_file.open(json_filename) as json_file:
        data = json.load(json_file)
    
    return data

def process_ev_data(data):
    """Process the JSON data to extract connector information"""
    rows = []
    
    for location in data.get('Locations', []):
        location_name = location.get('name', '')
        address = location.get('address', '')
        party_id = location.get('party_id', '')
        
        # Use location coordinates as fallback
        lat = location.get('coordinates', {}).get('latitude', '')
        lng = location.get('coordinates', {}).get('longitude', '')
        coordinates = f"{lat},{lng}"

        for evse in location.get('evses', []):
            for connector in evse.get('connectors', []):
                max_power = connector.get('max_electric_power', '')
                
                # Determine HPC value
                try:
                    power_val = float(max_power)
                except (TypeError, ValueError):
                    power_val = 0
                hpc = '1' if power_val > 50000 else '0'
                row = {
                    'name': location_name,
                    'address': address,
                    'coordinates': coordinates,
                    'max_electric_power': max_power,
                    'party_id': party_id,
                    'HPC': hpc
                }
                rows.append(row)
    
    return rows

def update_google_sheet(rows, credentials_json, sheet_name='EV Chargers in Greece'):
    """Update Google Sheet with the processed data"""
    # Parse credentials
    creds_dict = json.loads(credentials_json)
    SCOPES = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
    ]
    creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    
    # Authorize gspread
    gc = gspread.authorize(creds)
    
    # Open or create spreadsheet
    try:
        spreadsheet = gc.open(sheet_name)
    except gspread.exceptions.SpreadsheetNotFound:
        spreadsheet = gc.create(sheet_name)
    
    # Get the first worksheet
    worksheet = spreadsheet.sheet1
    
    # Clear existing data
    worksheet.clear()
    
    # Convert to DataFrame for easier handling
    df = pd.DataFrame(rows)
    
    # Add headers and all data in one batch to avoid quota errors
    from datetime import datetime
    current_date = datetime.now().strftime('%Y-%m-%d')
    headers = [f"Name - {current_date}", 'Address', 'Coordinates', 'Max Electric Power', 'Party ID', 'HPC']
    data = [headers] + df.astype(str).values.tolist()
    worksheet.update(values=data, range_name='A1')
    print(f"Updated Google Sheet '{sheet_name}' with {len(rows)} rows (batch write)")

def main():
    # URL of the zip file
    zip_url = "https://electrokinisi.yme.gov.gr/public/static_files/GR.IDRO.static.data.latest.json.zip"
    
    # Google credentials from environment
    credentials_json = os.environ.get('GOOGLE_CREDENTIALS')
    if not credentials_json:
        raise ValueError("GOOGLE_CREDENTIALS environment variable not set")
    
    print("Downloading and extracting data...")
    data = download_and_extract_zip(zip_url)
    
    print("Processing data...")
    rows = process_ev_data(data)
    
    print(f"Found {len(rows)} connectors")
    
    print("Updating Google Sheet...")
    update_google_sheet(rows, credentials_json)
    
    print("Done!")

if __name__ == "__main__":
    main()
