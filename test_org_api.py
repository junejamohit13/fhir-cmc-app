#!/usr/bin/env python3
import requests
import json

# The URLs to test
FHIR_SERVER_URL = "http://localhost:8082/fhir"
BACKEND_API_URL = "http://localhost:8002"

def print_separator():
    print("\n" + "="*80 + "\n")

# Check organizations directly from FHIR server
print("Checking organizations directly from FHIR server...")
response = requests.get(f"{FHIR_SERVER_URL}/Organization", headers={"Accept": "application/fhir+json"})
fhir_orgs = response.json()
print(f"Status: {response.status_code}")
print(f"Total organizations in FHIR server: {fhir_orgs.get('total', 0)}")
print(f"Number of entries in response: {len(fhir_orgs.get('entry', []))}")
for idx, entry in enumerate(fhir_orgs.get('entry', [])):
    org = entry.get('resource', {})
    print(f"  {idx+1}. Organization ID: {org.get('id')}, Name: {org.get('name')}")

print_separator()

# Check organizations from backend API
print("Checking organizations from backend API...")
response = requests.get(f"{BACKEND_API_URL}/organizations")
backend_orgs = response.json()
print(f"Status: {response.status_code}")
print(f"Response type: {type(backend_orgs).__name__}")
print(f"Response structure: {backend_orgs.get('resourceType', 'Not a FHIR resource')}")

if backend_orgs.get('resourceType') == 'Bundle':
    print(f"Total organizations in bundle: {backend_orgs.get('total', 0)}")
    print(f"Number of entries in bundle: {len(backend_orgs.get('entry', []))}")
    for idx, entry in enumerate(backend_orgs.get('entry', [])):
        org = entry.get('resource', {})
        print(f"  {idx+1}. Organization ID: {org.get('id')}, Name: {org.get('name')}")
elif isinstance(backend_orgs, list):
    print(f"Number of organizations in array: {len(backend_orgs)}")
    for idx, org in enumerate(backend_orgs):
        print(f"  {idx+1}. Organization ID: {org.get('id')}, Name: {org.get('name')}")
else:
    print(f"Unexpected response format: {json.dumps(backend_orgs, indent=2)}")

print_separator()

# Create a new organization through the backend API
print("Creating a new organization through the backend API...")
new_org_data = {
    "name": "Test Organization via Script",
    "url": "http://example.com/fhir",
    "api_key": "test-script-key",
    "organization_type": "sponsor"
}
response = requests.post(f"{BACKEND_API_URL}/organizations", json=new_org_data)
new_org = response.json()
print(f"Status: {response.status_code}")
print(f"New organization: ID {new_org.get('id')}, Name: {new_org.get('name')}")

print_separator()

# Check organizations from FHIR server again
print("Checking organizations from FHIR server again...")
response = requests.get(f"{FHIR_SERVER_URL}/Organization", headers={"Accept": "application/fhir+json"})
fhir_orgs = response.json()
print(f"Status: {response.status_code}")
print(f"Total organizations in FHIR server: {fhir_orgs.get('total', 0)}")
print(f"Number of entries in response: {len(fhir_orgs.get('entry', []))}")
for idx, entry in enumerate(fhir_orgs.get('entry', [])):
    org = entry.get('resource', {})
    print(f"  {idx+1}. Organization ID: {org.get('id')}, Name: {org.get('name')}")

print_separator()

# Check organizations from backend API again
print("Checking organizations from backend API again...")
response = requests.get(f"{BACKEND_API_URL}/organizations")
backend_orgs = response.json()
print(f"Status: {response.status_code}")
if backend_orgs.get('resourceType') == 'Bundle':
    print(f"Total organizations in bundle: {backend_orgs.get('total', 0)}")
    print(f"Number of entries in bundle: {len(backend_orgs.get('entry', []))}")
    for idx, entry in enumerate(backend_orgs.get('entry', [])):
        org = entry.get('resource', {})
        print(f"  {idx+1}. Organization ID: {org.get('id')}, Name: {org.get('name')}")
elif isinstance(backend_orgs, list):
    print(f"Number of organizations in array: {len(backend_orgs)}")
    for idx, org in enumerate(backend_orgs):
        print(f"  {idx+1}. Organization ID: {org.get('id')}, Name: {org.get('name')}")
else:
    print(f"Unexpected response format: {json.dumps(backend_orgs, indent=2)}") 