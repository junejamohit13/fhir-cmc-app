#!/usr/bin/env python3
import requests
import json
import time

# The URLs to test
FHIR_SERVER_URL = "http://localhost:8082/fhir"
BACKEND_API_URL = "http://localhost:8002"

# Get the existing organization count
response = requests.get(f"{FHIR_SERVER_URL}/Organization", headers={"Accept": "application/fhir+json"})
initial_count = len(response.json().get('entry', []))
print(f"Initial organization count: {initial_count}")

# Create a new organization through the backend API
print("Creating a new organization through the backend API...")
timestamp = time.time()
new_org_data = {
    "name": f"Test Organization {timestamp}",
    "url": "http://example.com/fhir",
    "api_key": "test-script-key",
    "organization_type": "sponsor"
}
response = requests.post(f"{BACKEND_API_URL}/organizations", json=new_org_data)
new_org = response.json()
print(f"Status: {response.status_code}")
print(f"New organization: ID {new_org.get('id')}, Name: {new_org.get('name')}")

org_id = new_org.get('id')
if not org_id:
    print("Failed to get organization ID, cannot continue")
    exit(1)

# Check directly
print(f"\nVerifying we can access organization {org_id} directly...")
response = requests.get(f"{FHIR_SERVER_URL}/Organization/{org_id}", headers={"Accept": "application/fhir+json"})
if response.status_code == 200:
    print(f"Organization accessible directly: {response.json().get('name')}")
else:
    print(f"Cannot access organization directly: {response.status_code}")

# Now check at 5-second intervals for 30 seconds
max_wait = 30
interval = 5
waited = 0

while waited < max_wait:
    print(f"\nWaiting {interval} seconds...")
    time.sleep(interval)
    waited += interval
    
    # Check list via FHIR server
    print(f"Checking list of organizations after waiting {waited} seconds...")
    response = requests.get(f"{FHIR_SERVER_URL}/Organization", headers={"Accept": "application/fhir+json"})
    all_orgs = response.json()
    entry_count = len(all_orgs.get('entry', []))
    total_count = all_orgs.get('total', 0)
    
    print(f"FHIR reports {entry_count} organizations (total: {total_count})")
    found = False
    for entry in all_orgs.get('entry', []):
        resource = entry.get('resource', {})
        if resource.get('id') == org_id:
            found = True
            print(f"Organization found in list! Name: {resource.get('name')}")
            break
    
    if not found:
        print(f"Organization {org_id} NOT found in the list after {waited} seconds")

print("\nFinal check of direct access:")
response = requests.get(f"{FHIR_SERVER_URL}/Organization/{org_id}", headers={"Accept": "application/fhir+json"})
if response.status_code == 200:
    print(f"Organization accessible directly: {response.json().get('name')}")
else:
    print(f"Cannot access organization directly: {response.status_code}")

print("\nTest complete. The issue appears to be a FHIR server search cache that doesn't immediately reflect new resources.")
print("Even though resources are created successfully, they don't appear in search results immediately.") 