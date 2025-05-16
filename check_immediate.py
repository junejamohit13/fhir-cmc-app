#!/usr/bin/env python3
import requests
import json
import time

# The URLs to test
FHIR_SERVER_URL = "http://localhost:8082/fhir"
BACKEND_API_URL = "http://localhost:8002"

# Create a new organization through the backend API
print("Creating a new organization through the backend API...")
new_org_data = {
    "name": f"Test Organization {time.time()}",
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

# Immediately check if the organization exists in FHIR server
print(f"\nImmediately checking if organization {org_id} exists in FHIR server...")
response = requests.get(f"{FHIR_SERVER_URL}/Organization/{org_id}", headers={"Accept": "application/fhir+json"})
print(f"Status: {response.status_code}")
if response.status_code == 200:
    org_data = response.json()
    print(f"Found organization: {org_data.get('name')}")
else:
    print(f"Organization not found: {response.text}")

# Check if the organization is in the list of all organizations
print("\nChecking if organization is in list of all organizations...")
response = requests.get(f"{FHIR_SERVER_URL}/Organization", headers={"Accept": "application/fhir+json"})
all_orgs = response.json()
found = False
for entry in all_orgs.get('entry', []):
    if entry.get('resource', {}).get('id') == org_id:
        found = True
        print(f"Organization found in list: {entry.get('resource', {}).get('name')}")
        break

if not found:
    print(f"Organization {org_id} NOT found in the list of all organizations")
    print(f"Total organizations in list: {all_orgs.get('total', 0)}")
    print(f"Number of entries in response: {len(all_orgs.get('entry', []))}")

# Check through backend API now
print("\nChecking if organization appears through backend API...")
response = requests.get(f"{BACKEND_API_URL}/organizations")
backend_orgs = response.json()
found = False
if backend_orgs.get('resourceType') == 'Bundle':
    for entry in backend_orgs.get('entry', []):
        if entry.get('resource', {}).get('id') == org_id:
            found = True
            print(f"Organization found in backend API: {entry.get('resource', {}).get('name')}")
            break

if not found:
    print(f"Organization {org_id} NOT found through the backend API")
    print(f"Total organizations in backend: {backend_orgs.get('total', 0)}")
    print(f"Number of entries in response: {len(backend_orgs.get('entry', []))}")

# Try forcing a refresh - wait and try again
print("\nWaiting 2 seconds and trying again...")
time.sleep(2)

# Check FHIR server again
print("\nChecking FHIR server again after waiting...")
response = requests.get(f"{FHIR_SERVER_URL}/Organization", headers={"Accept": "application/fhir+json"})
all_orgs = response.json()
found = False
for entry in all_orgs.get('entry', []):
    if entry.get('resource', {}).get('id') == org_id:
        found = True
        print(f"Organization found in list: {entry.get('resource', {}).get('name')}")
        break

if not found:
    print(f"Organization {org_id} still NOT found in the list of all organizations")

# Check backend API again
print("\nChecking backend API again after waiting...")
response = requests.get(f"{BACKEND_API_URL}/organizations")
backend_orgs = response.json()
found = False
if backend_orgs.get('resourceType') == 'Bundle':
    for entry in backend_orgs.get('entry', []):
        if entry.get('resource', {}).get('id') == org_id:
            found = True
            print(f"Organization found in backend API: {entry.get('resource', {}).get('name')}")
            break

if not found:
    print(f"Organization {org_id} still NOT found through the backend API") 