from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import requests
import os
import json
from datetime import datetime
import time

app = FastAPI(title="Protocol Management API", root_path="/api")

# JWT token globals
access_token = None
token_expiry = 0

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# FHIR Server Configuration
# Default to the API Gateway endpoint for direct FHIR service access with API key auth
FHIR_SERVER_URL = os.environ.get("FHIR_SERVER_URL", "https://api.sponsor-fhir.cmc-fhir-demo.com")
# Port that this server is running on (for self-references)
SPONSOR_SERVER_URL = os.environ.get("SPONSOR_SERVER_URL", "http://localhost:8002")

# API Key for API Gateway Authentication
API_GATEWAY_KEY = os.environ.get("API_GATEWAY_KEY", "")

# Cognito Configuration
COGNITO_REGION = os.environ.get("COGNITO_REGION", "us-east-1")
COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "")
COGNITO_APP_CLIENT_ID = os.environ.get("COGNITO_APP_CLIENT_ID", "")
COGNITO_APP_CLIENT_SECRET = os.environ.get("COGNITO_APP_CLIENT_SECRET", "")

def get_access_token():
    """
    Get a JWT token from Cognito for machine-to-machine communication.
    Uses client_credentials OAuth2 flow.
    """
    global access_token, token_expiry
    
    # Check if we have a valid token already
    current_time = int(time.time())
    if access_token and token_expiry > current_time + 60:  # 60 seconds buffer
        return access_token
    
    # We need to get a new token
    token_url = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/oauth2/token"
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    payload = {
        "grant_type": "client_credentials",
        "client_id": COGNITO_APP_CLIENT_ID,
        "client_secret": COGNITO_APP_CLIENT_SECRET,
        "scope": "fhir/read fhir/write"  # Adjust scopes based on your Cognito setup
    }
    
    try:
        print(f"Getting new access token from: {token_url}")
        response = requests.post(token_url, headers=headers, data=payload)
        response.raise_for_status()
        
        token_data = response.json()
        access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in", 3600)  # Default to 1 hour
        token_expiry = current_time + expires_in
        
        print(f"Successfully obtained new access token, expires in {expires_in} seconds")
        return access_token
    except Exception as e:
        print(f"Error getting access token: {str(e)}")
        if hasattr(e, 'response') and e.response:
            print(f"Response status: {e.response.status_code}")
            print(f"Response text: {e.response.text}")
        return None

def get_auth_headers(content_type="application/fhir+json"):
    """
    Get headers for FHIR API requests, including authorization if needed
    """
    headers = {"Accept": content_type}
    
    # Add authorization header based on URL pattern
    if "api.sponsor" in FHIR_SERVER_URL:
        # Use API key authentication for api.sponsor domains
        if API_GATEWAY_KEY:
            headers["x-api-key"] = API_GATEWAY_KEY
            print(f"Adding API key authentication to request headers for {FHIR_SERVER_URL}")
        else:
            print(f"Warning: No API key available for API request to {FHIR_SERVER_URL}")
    elif "api." in FHIR_SERVER_URL:
        # Use JWT authentication for other api domains
        token = get_access_token()
        if token:
            headers["Authorization"] = f"Bearer {token}"
            print(f"Adding JWT authentication token to request headers for {FHIR_SERVER_URL}")
        else:
            print(f"Warning: No token available for API request to {FHIR_SERVER_URL}")
    
    return headers

class PlanDefinitionCreate(BaseModel):
    title: str
    version: str
    description: str
    status: str = "active"
    date: str
    subjectReference: Optional[Dict[str, str]] = None
    note: Optional[List[Dict[str, str]]] = None
    extension: Optional[List[Dict[str, Any]]] = None
    action: List[Dict[str, Any]]
    # Added for 32P81, 32P83 stability testing
    stability_tests: Optional[List[Dict[str, Any]]] = None
    # Sponsor information
    sponsor_name: str = "Default Sponsor"
    sponsor_id: str = "SPONSOR-DEFAULT"

class PlanDefinitionUpdate(BaseModel):
    title: Optional[str] = None
    version: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    date: Optional[str] = None
    subjectReference: Optional[Dict[str, str]] = None
    note: Optional[List[Dict[str, str]]] = None
    extension: Optional[List[Dict[str, Any]]] = None
    action: Optional[List[Dict[str, Any]]] = None
    stability_tests: Optional[List[Dict[str, Any]]] = None
    sponsor_name: Optional[str] = None
    sponsor_id: Optional[str] = None

class OrganizationCreate(BaseModel):
    name: str
    url: str  # FHIR server URL for external organizations
    api_key: Optional[str] = None
    organization_type: Optional[str] = "sponsor"  # "sponsor" or "cro"

class ProtocolShareRequest(BaseModel):
    organization_ids: List[str]  # FHIR resource IDs
    share_mode: Optional[str] = "fullProtocol"  # 'fullProtocol' or 'specificTests'
    selected_tests: Optional[List[str]] = []  # IDs of selected tests when share_mode is 'specificTests'
    shareBatches: Optional[bool] = True  # Whether to share batches
    selectedBatches: Optional[List[str]] = []  # IDs of selected batches to share

class TestDefinitionCreate(BaseModel):
    title: str
    description: str
    test_type: str  # e.g. Assay, Degradation, etc.
    test_subtype: Optional[str] = None  # e.g. Degs1, Mean, etc.
    protocol_id: str
    parameters: Optional[Dict[str, Any]] = None  # Additional test parameters from the form
    acceptance_criteria: Optional[Dict[str, Any]] = None  # Test acceptance criteria

class BatchCreate(BaseModel):
    name: str
    identifier: str
    protocol_id: str
    lot_number: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    status: str = "active"
    
class TestResultCreate(BaseModel):
    test_id: str
    batch_id: str
    organization_id: str
    value: Any
    unit: Optional[str] = None
    result_date: str
    status: str = "completed"
    comments: Optional[str] = None

@app.get("/")
def read_root():
    return {"message": "Protocol Management API is running"}

@app.get("/health")
@app.get("/api/health")  # Add the /api/health endpoint that the ALB health check uses
def health_check():
    # Log FHIR server URL for debugging
    print(f"HEALTH CHECK - FHIR_SERVER_URL is configured as: {FHIR_SERVER_URL}")
    
    # Try to ping the FHIR server and report its status
    try:
        response = requests.get(
            f"{FHIR_SERVER_URL}/metadata",
            headers={"Accept": "application/fhir+json"},
            timeout=5
        )
        fhir_server_status = f"Reachable (Status: {response.status_code})"
    except requests.RequestException as e:
        fhir_server_status = f"Not reachable: {str(e)}"
    
    return {
        "status": "ok",
        "fhir_server": {
            "url": FHIR_SERVER_URL,
            "status": fhir_server_status
        }
    }

@app.get("/protocols")
async def get_protocols():
    """Get all protocols (PlanDefinition resources)"""
    try:
        fhir_url = f"{FHIR_SERVER_URL}/PlanDefinition"
        print(f"GET PROTOCOLS - Fetching from FHIR Server URL: {fhir_url}")
        
        # Get authenticated headers
        headers = get_auth_headers()
        
        # Check if we need authentication and if it's present
        if "api.sponsor" in FHIR_SERVER_URL and "x-api-key" not in headers:
            error_message = "Failed to obtain API key for API request"
            print(f"GET PROTOCOLS - ERROR: {error_message}")
            raise HTTPException(status_code=500, detail=error_message)
        elif "api." in FHIR_SERVER_URL and "api.sponsor" not in FHIR_SERVER_URL and "Authorization" not in headers:
            error_message = "Failed to obtain access token for API request"
            print(f"GET PROTOCOLS - ERROR: {error_message}")
            raise HTTPException(status_code=500, detail=error_message)
        
        response = requests.get(fhir_url, headers=headers)
        response.raise_for_status()
        
        response_data = response.json()
        total_resources = response_data.get("total", 0)
        entry_count = len(response_data.get("entry", []))
        print(f"GET PROTOCOLS - Response status: {response.status_code}, Total resources: {total_resources}, Entries returned: {entry_count}")
        
        return response_data
    except requests.RequestException as e:
        error_message = f"Failed to fetch protocols: {str(e)}"
        print(f"GET PROTOCOLS - ERROR: {error_message}")
        if hasattr(e, 'response') and e.response:
            print(f"Response status: {e.response.status_code}")
            print(f"Response text: {e.response.text}")
        raise HTTPException(status_code=500, detail=error_message)

@app.get("/protocols/{protocol_id}")
async def get_protocol(protocol_id: str):
    """Get a specific protocol by ID"""
    try:
        fhir_url = f"{FHIR_SERVER_URL}/PlanDefinition/{protocol_id}"
        print(f"GET PROTOCOL - Fetching protocol ID {protocol_id} from FHIR Server URL: {fhir_url}")
        
        # Get authenticated headers
        headers = get_auth_headers()
        
        # Check if we need authentication and if it's present
        if "api.sponsor" in FHIR_SERVER_URL and "x-api-key" not in headers:
            error_message = "Failed to obtain API key for API request"
            print(f"GET PROTOCOL - ERROR: {error_message}")
            raise HTTPException(status_code=500, detail=error_message)
        elif "api." in FHIR_SERVER_URL and "api.sponsor" not in FHIR_SERVER_URL and "Authorization" not in headers:
            error_message = "Failed to obtain access token for API request"
            print(f"GET PROTOCOL - ERROR: {error_message}")
            raise HTTPException(status_code=500, detail=error_message)
        
        response = requests.get(fhir_url, headers=headers)
        response.raise_for_status()
        
        protocol_data = response.json()
        print(f"GET PROTOCOL - Success! Status: {response.status_code}, Protocol ID: {protocol_id}")
        
        # Log some key details from the protocol
        title = protocol_data.get("title", "No Title")
        resource_type = protocol_data.get("resourceType", "Unknown")
        print(f"GET PROTOCOL - Retrieved {resource_type}: '{title}'")
        
        return protocol_data
    except requests.RequestException as e:
        if e.response and e.response.status_code == 404:
            print(f"GET PROTOCOL - ERROR: Protocol with ID {protocol_id} not found")
            raise HTTPException(status_code=404, detail=f"Protocol with ID {protocol_id} not found")
        
        error_message = f"Failed to fetch protocol: {str(e)}"
        print(f"GET PROTOCOL - ERROR: {error_message}")
        if hasattr(e, 'response') and e.response:
            print(f"Response status: {e.response.status_code}")
            print(f"Response text: {e.response.text}")
        raise HTTPException(status_code=500, detail=error_message)

@app.post("/protocols")
async def create_protocol(protocol: PlanDefinitionCreate):
    """Create a new protocol"""
    try:
        # Convert Pydantic model to dict and add required FHIR fields
        protocol_data = {
            "resourceType": "PlanDefinition",
            **protocol.dict(exclude_none=True),
            "meta": {
                "profile": [
                    "http://hl7.org/fhir/uv/pharm-quality/StructureDefinition/PlanDefinition-drug-pq"
                ]
            },
            "identifier": [
                {
                    "system": "http://example.org/stability/protocols",
                    "value": f"STAB-{protocol.title.replace(' ', '-')}"
                }
            ]
        }
        
        # Make sure extension array exists
        if "extension" not in protocol_data:
            protocol_data["extension"] = []
        
        # Get sponsor details from the request
        sponsor_name = protocol.sponsor_name
        sponsor_id = protocol.sponsor_id
        
        # Remove these from protocol_data since they're not part of FHIR PlanDefinition
        if "sponsor_name" in protocol_data:
            del protocol_data["sponsor_name"]
        if "sponsor_id" in protocol_data:
            del protocol_data["sponsor_id"]
        
        # Add sponsor details extension
        protocol_data["extension"].append({
            "url": "http://example.org/fhir/StructureDefinition/sponsor",
            "valueString": sponsor_name
        })
        
        # Add sponsor ID extension (optional but useful)
        protocol_data["extension"].append({
            "url": "http://example.org/fhir/StructureDefinition/sponsor-id",
            "valueString": sponsor_id
        })
        
        # Add shared date
        protocol_data["extension"].append({
            "url": "http://example.org/fhir/StructureDefinition/sharedDate",
            "valueDateTime": protocol.date  # Using protocol date as shared date
        })
            
        # Convert stability_tests to FHIR extension format
        if protocol.stability_tests:
            protocol_data["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/stability-test-definitions",
                "extension": [
                    {
                        "url": "test",
                        "valueReference": {
                            "reference": f"ActivityDefinition/{test['id']}" if 'id' in test else None,
                            "_resource": test
                        }
                    } for test in protocol.stability_tests
                ]
            })
            
            # Remove stability_tests from top level
            if "stability_tests" in protocol_data:
                del protocol_data["stability_tests"]
        fhir_url = f"{FHIR_SERVER_URL}/PlanDefinition"
        print(f"CREATE PROTOCOL - Posting to FHIR Server URL: {fhir_url}")
        print(f"CREATE PROTOCOL - Protocol data: {protocol_data}")
        
        response = requests.post(
            fhir_url,
            json=protocol_data,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        
        response_data = response.json()
        protocol_id = response_data.get("id", "unknown")
        print(f"CREATE PROTOCOL - Success! Status: {response.status_code}, New protocol ID: {protocol_id}")
        
        return response_data
    except requests.RequestException as e:
        error_message = str(e)
        if hasattr(e, 'response') and e.response:
            try:
                error_detail = e.response.json()
                error_message = json.dumps(error_detail)
            except:
                error_message = e.response.text
        
        raise HTTPException(status_code=500, detail=f"Failed to create protocol: {error_message}")

@app.put("/protocols/{protocol_id}")
async def update_protocol(protocol_id: str, protocol_update: PlanDefinitionUpdate):
    """Update an existing protocol"""
    try:
        # First get the existing protocol
        try:
            get_response = requests.get(
                f"{FHIR_SERVER_URL}/PlanDefinition/{protocol_id}",
                headers={"Accept": "application/fhir+json"}
            )
            get_response.raise_for_status()
            existing_protocol = get_response.json()
        except requests.RequestException as e:
            if e.response and e.response.status_code == 404:
                raise HTTPException(status_code=404, detail=f"Protocol with ID {protocol_id} not found")
            raise e
        
        # Update the protocol with new values
        update_data = protocol_update.dict(exclude_none=True)
        
        # Make sure extension array exists
        if "extension" not in existing_protocol:
            existing_protocol["extension"] = []

        # Get sponsor details from the request if provided
        sponsor_name = protocol_update.sponsor_name
        sponsor_id = protocol_update.sponsor_id
        
        # Remove these from update_data since they're not part of FHIR PlanDefinition
        if "sponsor_name" in update_data:
            del update_data["sponsor_name"]
        if "sponsor_id" in update_data:
            del update_data["sponsor_id"]
            
        # Check if sponsor extension exists
        sponsor_ext_exists = False
        sponsor_id_ext_exists = False
        
        # Update or add sponsor info only if provided in the request
        if sponsor_name is not None or sponsor_id is not None:
            for ext in existing_protocol["extension"]:
                if ext.get("url") == "http://example.org/fhir/StructureDefinition/sponsor" and sponsor_name is not None:
                    ext["valueString"] = sponsor_name
                    sponsor_ext_exists = True
                elif ext.get("url") == "http://example.org/fhir/StructureDefinition/sponsor-id" and sponsor_id is not None:
                    ext["valueString"] = sponsor_id
                    sponsor_id_ext_exists = True
            
            # Add sponsor extension if it doesn't exist and was provided
            if not sponsor_ext_exists and sponsor_name is not None:
                existing_protocol["extension"].append({
                    "url": "http://example.org/fhir/StructureDefinition/sponsor",
                    "valueString": sponsor_name
                })
                
            # Add sponsor ID extension if it doesn't exist and was provided
            if not sponsor_id_ext_exists and sponsor_id is not None:
                existing_protocol["extension"].append({
                    "url": "http://example.org/fhir/StructureDefinition/sponsor-id",
                    "valueString": sponsor_id
                })
            
        # Special handling for stability_tests
        if "stability_tests" in update_data:
            stability_tests = update_data.pop("stability_tests")
            
            # Find and remove existing stability test extension
            existing_protocol["extension"] = [
                ext for ext in existing_protocol["extension"] 
                if ext.get("url") != "http://example.org/fhir/StructureDefinition/stability-test-definitions"
            ]
                
            # Add updated stability tests as extension
            if stability_tests:
                existing_protocol["extension"].append({
                    "url": "http://example.org/fhir/StructureDefinition/stability-test-definitions",
                    "extension": [
                        {
                            "url": "test",
                            "valueReference": {
                                "reference": f"ActivityDefinition/{test['id']}" if 'id' in test else None,
                                "_resource": test
                            }
                        } for test in stability_tests
                    ]
                })
        
        # Update other fields
        for key, value in update_data.items():
            existing_protocol[key] = value
        
        # Send the updated protocol back to the FHIR server
        response = requests.put(
            f"{FHIR_SERVER_URL}/PlanDefinition/{protocol_id}",
            json=existing_protocol,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        if not isinstance(e, HTTPException):
            error_message = str(e)
            if hasattr(e, 'response') and e.response:
                try:
                    error_detail = e.response.json()
                    error_message = json.dumps(error_detail)
                except:
                    error_message = e.response.text
            
            raise HTTPException(status_code=500, detail=f"Failed to update protocol: {error_message}")
        raise e

@app.delete("/protocols/{protocol_id}")
async def delete_protocol(protocol_id: str):
    """Delete a protocol"""
    try:
        response = requests.delete(
            f"{FHIR_SERVER_URL}/PlanDefinition/{protocol_id}",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        return {"message": f"Protocol {protocol_id} deleted successfully"}
    except requests.RequestException as e:
        if e.response and e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Protocol with ID {protocol_id} not found")
        raise HTTPException(status_code=500, detail=f"Failed to delete protocol: {str(e)}")

# Organization management endpoints using FHIR Organization resources
@app.get("/organizations")
async def get_organizations():
    """Get all organizations"""
    try:
        response = requests.get(
            f"{FHIR_SERVER_URL}/Organization",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch organizations: {str(e)}")

@app.post("/organizations")
async def create_organization(organization: OrganizationCreate):
    """Create a new organization using FHIR Organization resource"""
    try:
        organization_data = {
            "resourceType": "Organization",
            "name": organization.name,
            "active": True,
            "telecom": [
                {
                    "system": "url",
                    "value": organization.url,
                    "use": "work"
                }
            ],
            # Store the API key and organization type as extensions
            "extension": [
                {
                    "url": "http://example.org/fhir/StructureDefinition/organization-api-key",
                    "valueString": organization.api_key or ""
                },
                {
                    "url": "http://example.org/fhir/StructureDefinition/organization-type",
                    "valueString": organization.organization_type or "sponsor"
                }
            ]
        }
        
        response = requests.post(
            f"{FHIR_SERVER_URL}/Organization",
            json=organization_data,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        error_message = str(e)
        if hasattr(e, 'response') and e.response:
            try:
                error_detail = e.response.json()
                error_message = json.dumps(error_detail)
            except:
                error_message = e.response.text
        
        raise HTTPException(status_code=500, detail=f"Failed to create organization: {error_message}")

@app.get("/organizations/{org_id}")
async def get_organization(org_id: str):
    """Get a specific organization by ID"""
    try:
        response = requests.get(
            f"{FHIR_SERVER_URL}/Organization/{org_id}",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        if e.response and e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Organization with ID {org_id} not found")
        raise HTTPException(status_code=500, detail=f"Failed to fetch organization: {str(e)}")

@app.put("/organizations/{org_id}")
async def update_organization(org_id: str, organization: OrganizationCreate):
    """Update an organization"""
    try:
        # First get the existing organization
        try:
            get_response = requests.get(
                f"{FHIR_SERVER_URL}/Organization/{org_id}",
                headers={"Accept": "application/fhir+json"}
            )
            get_response.raise_for_status()
            existing_org = get_response.json()
        except requests.RequestException as e:
            if e.response and e.response.status_code == 404:
                raise HTTPException(status_code=404, detail=f"Organization with ID {org_id} not found")
            raise e
        
        # Update the fields
        existing_org["name"] = organization.name
        
        # Update the URL
        telecom_found = False
        for telecom in existing_org.get("telecom", []):
            if telecom.get("system") == "url":
                telecom["value"] = organization.url
                telecom_found = True
                break
        
        if not telecom_found:
            if "telecom" not in existing_org:
                existing_org["telecom"] = []
            existing_org["telecom"].append({
                "system": "url",
                "value": organization.url,
                "use": "work"
            })
        
        # Update the extensions
        if "extension" not in existing_org:
            existing_org["extension"] = []
            
        # Update API key extension
        api_key_updated = False
        org_type_updated = False
        
        for ext in existing_org.get("extension", []):
            if ext.get("url") == "http://example.org/fhir/StructureDefinition/organization-api-key":
                ext["valueString"] = organization.api_key or ""
                api_key_updated = True
            elif ext.get("url") == "http://example.org/fhir/StructureDefinition/organization-type":
                ext["valueString"] = organization.organization_type or "sponsor"
                org_type_updated = True
        
        if not api_key_updated:
            existing_org["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/organization-api-key",
                "valueString": organization.api_key or ""
            })
            
        if not org_type_updated:
            existing_org["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/organization-type",
                "valueString": organization.organization_type or "sponsor"
            })
        
        # Send the updated organization back to the FHIR server
        response = requests.put(
            f"{FHIR_SERVER_URL}/Organization/{org_id}",
            json=existing_org,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        return response.json()
    except HTTPException:
        raise
    except requests.RequestException as e:
        error_message = str(e)
        if hasattr(e, 'response') and e.response:
            try:
                error_detail = e.response.json()
                error_message = json.dumps(error_detail)
            except:
                error_message = e.response.text
            
        raise HTTPException(status_code=500, detail=f"Failed to update organization: {error_message}")

@app.delete("/organizations/{org_id}")
async def delete_organization(org_id: str):
    """Delete an organization"""
    try:
        response = requests.delete(
            f"{FHIR_SERVER_URL}/Organization/{org_id}",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        return {"message": f"Organization {org_id} deleted successfully"}
    except requests.RequestException as e:
        if e.response and e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Organization with ID {org_id} not found")
        raise HTTPException(status_code=500, detail=f"Failed to delete organization: {str(e)}")

# Helper function to push a protocol to an external FHIR server
async def ensure_sponsor_organization_exists(sponsor_id: str, sponsor_name: str, external_server_url: str, api_key: str = None):
    """
    Ensures that a sponsor organization exists in the CRO's FHIR server
    First checks if the organization already exists, and if not, creates it
    
    Args:
        sponsor_id: The sponsor's ID
        sponsor_name: The sponsor's name
        external_server_url: The URL of the external FHIR server
        api_key: Optional API key for authentication
        
    Returns:
        The organization resource ID in the external system
    """
    try:
        # Prepare headers
        headers = {
            "Content-Type": "application/fhir+json",
            "Accept": "application/fhir+json"
        }
        
        # Add API key if provided
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
            
        # First check if an organization with this sponsor ID already exists
        search_url = f"{external_server_url}/Organization?identifier={sponsor_id}"
        search_response = requests.get(
            search_url,
            headers=headers,
            timeout=10
        )
        
        # If search was successful and found entries
        if (search_response.status_code >= 200 and 
            search_response.status_code < 300 and 
            'entry' in search_response.json()):
            
            entries = search_response.json().get('entry', [])
            if entries:
                # Return the existing organization ID
                return entries[0]['resource']['id']
        
        # If not found, create a new organization
        organization_data = {
            "resourceType": "Organization",
            "active": True,
            "name": sponsor_name,
            "identifier": [
                {
                    "system": "http://example.org/fhir/sponsor-id",
                    "value": sponsor_id
                }
            ],
            "meta": {
                "tag": [
                    {
                        "system": "http://example.org/fhir/tags",
                        "code": "sponsor-organization"
                    }
                ]
            },
            "extension": [
                {
                    "url": "http://example.org/fhir/StructureDefinition/organization-type",
                    "valueString": "sponsor"
                }
            ]
        }
        
        # Create the organization
        create_response = requests.post(
            f"{external_server_url}/Organization",
            json=organization_data,
            headers=headers,
            timeout=10
        )
        
        if create_response.status_code >= 200 and create_response.status_code < 300:
            return create_response.json().get('id')
        else:
            print(f"Failed to create sponsor organization in CRO system: {create_response.status_code}")
            # Return None if creation failed
            return None
    except Exception as e:
        print(f"Error ensuring sponsor organization exists: {str(e)}")
        return None

async def push_protocol_to_external_server(protocol: dict, external_server_url: str, api_key: str = None, share_mode: str = "fullProtocol", selected_tests: List[str] = None):
    """
    Attempts to push a protocol to an external FHIR server
    Returns (success, message) tuple
    
    Args:
        protocol: The protocol to share
        external_server_url: The URL of the external FHIR server
        api_key: Optional API key for authentication
        share_mode: 'fullProtocol' or 'specificTests'
        selected_tests: List of test IDs to include when share_mode is 'specificTests'
    """
    print(f"Starting protocol sharing with mode: {share_mode}, selected tests: {selected_tests}")
    print(f"External server URL: {external_server_url}")
    try:
        # Create a copy of the protocol to modify for the external server
        external_protocol = protocol.copy()
        
        # Remove the id as it will be assigned by the external server
        if "id" in external_protocol:
            del external_protocol["id"]
            
        # Make sure extension exists
        if "extension" not in external_protocol:
            external_protocol["extension"] = []
            
        # Extract existing sponsor info from the protocol if available
        sponsor_name = None
        sponsor_id = None
        shared_date_exists = False
        
        for ext in external_protocol["extension"]:
            if ext.get("url") == "http://example.org/fhir/StructureDefinition/sponsor":
                sponsor_name = ext.get("valueString")
            elif ext.get("url") == "http://example.org/fhir/StructureDefinition/sponsor-id":
                sponsor_id = ext.get("valueString")
            elif ext.get("url") == "http://example.org/fhir/StructureDefinition/sharedDate":
                ext["valueDateTime"] = datetime.now().isoformat()
                shared_date_exists = True
        
        # We need both sponsor name and ID to properly link the protocol
        if not sponsor_name or not sponsor_id:
            print(f"Warning: Missing sponsor information. Name: {sponsor_name}, ID: {sponsor_id}")
            sponsor_name = sponsor_name or "Unknown Sponsor"
            sponsor_id = sponsor_id or f"UNKNOWN-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Ensure sponsor organization exists in CRO's FHIR server
        cro_sponsor_org_id = await ensure_sponsor_organization_exists(
            sponsor_id=sponsor_id,
            sponsor_name=sponsor_name,
            external_server_url=external_server_url,
            api_key=api_key
        )
        
        # Ensure we have sponsor information before sharing
        # Only update the shared date, keep original sponsor info intact
        if not shared_date_exists:
            external_protocol["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/sharedDate",
                "valueDateTime": datetime.now().isoformat()
            })
            
        # Add sharedWithCRO flag for CRO visibility
        external_protocol["extension"].append({
            "url": "http://example.org/fhir/StructureDefinition/sharedWithCRO",
            "valueBoolean": True
        })
        
        # If we successfully registered the sponsor organization in the CRO system,
        # add a reference to it in the protocol
        if cro_sponsor_org_id:
            external_protocol["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/sponsor-organization",
                "valueReference": {
                    "reference": f"Organization/{cro_sponsor_org_id}",
                    "display": sponsor_name
                }
            })
        else:
            print(f"Warning: Could not create/find sponsor organization in CRO system")
        
        # If sharing specific tests, filter the protocol actions
        if share_mode == "specificTests" and selected_tests:
            # If no tests selected, don't share
            if not selected_tests:
                return (False, f"No tests selected for sharing to {external_server_url}")
            
            # Filter actions based on selected tests
            if "action" in external_protocol and external_protocol["action"]:
                # Create a filtered version of the actions
                filtered_actions = []
                
                for action in external_protocol["action"]:
                    action_id = action.get("id", "")
                    
                    # Check if this action is selected
                    if action_id in selected_tests:
                        # Include this entire action
                        filtered_actions.append(action)
                    else:
                        # Check if any nested timepoints are selected
                        if "action" in action and action["action"]:
                            filtered_timepoints = []
                            
                            for timepoint in action["action"]:
                                timepoint_id = timepoint.get("id", "")
                                if timepoint_id in selected_tests:
                                    filtered_timepoints.append(timepoint)
                            
                            # If we found selected timepoints, include this action with only those timepoints
                            if filtered_timepoints:
                                filtered_action = action.copy()
                                filtered_action["action"] = filtered_timepoints
                                filtered_actions.append(filtered_action)
                
                # Replace the actions with our filtered set
                external_protocol["action"] = filtered_actions
                
                # Add extension to indicate this is a partial protocol
                if "extension" not in external_protocol:
                    external_protocol["extension"] = []
                
                external_protocol["extension"].append({
                    "url": "http://example.org/fhir/StructureDefinition/plan-definition-partial-share",
                    "valueBoolean": True
                })
                
            # Filter stability tests if applicable
            if "extension" in external_protocol:
                for ext_idx, ext in enumerate(external_protocol["extension"]):
                    if ext.get("url") == "http://example.org/fhir/StructureDefinition/stability-test-definitions":
                        filtered_tests = []
                        for test_ext in ext.get("extension", []):
                            if test_ext.get("url") == "test" and test_ext.get("valueReference", {}).get("_resource", {}).get("id") in selected_tests:
                                filtered_tests.append(test_ext)
                        
                        if filtered_tests:
                            external_protocol["extension"][ext_idx]["extension"] = filtered_tests
                        else:
                            # Remove the stability tests extension if none selected
                            external_protocol["extension"] = [
                                e for e in external_protocol["extension"] 
                                if e.get("url") != "http://example.org/fhir/StructureDefinition/stability-test-definitions"
                            ]
        
        # Add a custom tag to indicate this is a shared protocol
        if "meta" not in external_protocol:
            external_protocol["meta"] = {}
        
        if "tag" not in external_protocol["meta"]:
            external_protocol["meta"]["tag"] = []
        
        external_protocol["meta"]["tag"].append({
            "system": "http://example.org/fhir/tags",
            "code": "shared-protocol"
        })
        
        # Prepare headers
        headers = {
            "Content-Type": "application/fhir+json",
            "Accept": "application/fhir+json"
        }
        
        # Add API key if provided
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        
        # Send the protocol to the external server
        external_response = requests.post(
            f"{external_server_url}/PlanDefinition",
            json=external_protocol,
            headers=headers,
            timeout=10  # Timeout after 10 seconds
        )
        
        # Check response
        if external_response.status_code >= 200 and external_response.status_code < 300:
            if share_mode == "specificTests":
                return (True, f"Successfully shared selected tests to {external_server_url}")
            else:
                return (True, f"Successfully shared to {external_server_url}")
        else:
            try:
                error_detail = external_response.json()
                error_message = json.dumps(error_detail)
            except:
                error_message = external_response.text
            
            return (False, f"Failed to share to {external_server_url}: {error_message}")
            
    except Exception as e:
        return (False, f"Error sharing to {external_server_url}: {str(e)}")

# Protocol sharing endpoints using FHIR PlanDefinition
@app.post("/protocols/{protocol_id}/share")
async def share_protocol(protocol_id: str, share_request: ProtocolShareRequest):
    """Share a protocol with organizations by updating extension in the PlanDefinition and pushing to external servers"""
    try:
        # First get the existing protocol
        try:
            get_response = requests.get(
                f"{FHIR_SERVER_URL}/PlanDefinition/{protocol_id}",
                headers={"Accept": "application/fhir+json"}
            )
            get_response.raise_for_status()
            existing_protocol = get_response.json()
        except requests.RequestException as e:
            if e.response and e.response.status_code == 404:
                raise HTTPException(status_code=404, detail=f"Protocol with ID {protocol_id} not found")
            raise HTTPException(status_code=500, detail=f"Failed to verify protocol existence: {str(e)}")
        
        # Create or update the sharing extension
        share_ext_url = "http://example.org/fhir/StructureDefinition/plan-definition-shared-organizations"
        
        # Remove existing sharing extension if any
        if "extension" not in existing_protocol:
            existing_protocol["extension"] = []
        else:
            existing_protocol["extension"] = [
                ext for ext in existing_protocol["extension"] 
                if ext.get("url") != share_ext_url
            ]
        
        # Add new sharing extension with organizations
        org_references = []
        for org_id in share_request.organization_ids:
            org_references.append({
                "valueReference": {
                    "reference": f"Organization/{org_id}"
                }
            })
        
        if org_references:
            existing_protocol["extension"].append({
                "url": share_ext_url,
                "extension": org_references
            })
        
        # Update the protocol locally
        response = requests.put(
            f"{FHIR_SERVER_URL}/PlanDefinition/{protocol_id}",
            json=existing_protocol,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        
        # Now handle batch sharing if requested
        if hasattr(share_request, 'shareBatches') and share_request.shareBatches and hasattr(share_request, 'selectedBatches'):
            # Process each batch to mark it as shared with the selected CROs
            for batch_id in share_request.selectedBatches:
                try:
                    # Get the batch
                    batch_response = requests.get(
                        f"{FHIR_SERVER_URL}/Device/{batch_id}",
                        headers={"Accept": "application/fhir+json"}
                    )
                    batch_response.raise_for_status()
                    batch = batch_response.json()
                    
                    # Add shared-with-cro extension
                    if "extension" not in batch:
                        batch["extension"] = []
                    
                    # Remove any existing shared-with-cro extension
                    batch["extension"] = [
                        ext for ext in batch["extension"]
                        if ext.get("url") != "http://example.org/fhir/StructureDefinition/shared-with-cro"
                    ]
                    
                    # Add extension to indicate this batch is shared with CROs
                    batch["extension"].append({
                        "url": "http://example.org/fhir/StructureDefinition/shared-with-cro",
                        "valueBoolean": True
                    })
                    
                    # Add specific organizations this batch is shared with
                    batch["extension"].append({
                        "url": "http://example.org/fhir/StructureDefinition/shared-with-organizations",
                        "extension": org_references
                    })
                    
                    # Update the batch
                    batch_update_response = requests.put(
                        f"{FHIR_SERVER_URL}/Device/{batch_id}",
                        json=batch,
                        headers={
                            "Content-Type": "application/fhir+json",
                            "Accept": "application/fhir+json"
                        }
                    )
                    batch_update_response.raise_for_status()
                    
                except Exception as batch_error:
                    print(f"Error updating batch {batch_id}: {str(batch_error)}")
                    # Continue with other batches
        
        # Now attempt to push the protocol to each external organization's FHIR server
        share_results = []
        
        for org_id in share_request.organization_ids:
            # Get organization details
            try:
                org_response = requests.get(
                    f"{FHIR_SERVER_URL}/Organization/{org_id}",
                    headers={"Accept": "application/fhir+json"}
                )
                
                if org_response.status_code == 200:
                    org = org_response.json()
                    
                    # Extract URL from telecom
                    url = None
                    for telecom in org.get("telecom", []):
                        if telecom.get("system") == "url":
                            url = telecom.get("value")
                            if url:
                                break
                    
                    # Extract API key from extension
                    api_key = None
                    for ext in org.get("extension", []):
                        if ext.get("url") == "http://example.org/fhir/StructureDefinition/organization-api-key":
                            api_key = ext.get("valueString")
                            if api_key:
                                break
                    
                    if url:
                        # Create a FHIR Bundle transaction to push protocol and test definitions together
                        if share_request.share_mode == "fullProtocol" or (share_request.share_mode == "specificTests" and share_request.selected_tests):
                            try:
                                # Get all test definitions for this protocol
                                tests_response = requests.get(
                                    f"{FHIR_SERVER_URL}/ActivityDefinition",
                                    headers={"Accept": "application/fhir+json"}
                                )
                                tests_response.raise_for_status()
                                
                                all_tests = tests_response.json()
                                associated_tests = []
                                
                                # First, prepare the protocol
                                external_protocol = existing_protocol.copy()
                                # Create a temporary logical ID for the protocol in the bundle
                                protocol_logical_id = f"urn:uuid:{protocol_id}"
                                
                                # Remove the ID as it will be assigned by the external server
                                if "id" in external_protocol:
                                    del external_protocol["id"]
                                
                                # Make sure it has meta tags
                                if "meta" not in external_protocol:
                                    external_protocol["meta"] = {}
                                if "tag" not in external_protocol["meta"]:
                                    external_protocol["meta"]["tag"] = []
                                
                                # Add a tag to indicate this is a shared protocol
                                external_protocol["meta"]["tag"].append({
                                    "system": "http://example.org/fhir/tags",
                                    "code": "shared-protocol"
                                })
                                
                                if all_tests and all_tests.get("resourceType") == "Bundle" and all_tests.get("entry"):
                                    for entry in all_tests["entry"]:
                                        test = entry.get("resource", {})
                                        test_id = test.get("id")
                                        
                                        if not test_id:
                                            continue
                                            
                                        # Check if this test is associated with the protocol
                                        is_for_protocol = False
                                        for ext in test.get("extension", []):
                                            if (ext.get("url") == "http://example.org/fhir/StructureDefinition/stability-test-protocol" and
                                                ext.get("valueReference", {}).get("reference") == f"PlanDefinition/{protocol_id}"):
                                                is_for_protocol = True
                                                break
                                        
                                        # Only include tests that are for this protocol and are selected (if in specificTests mode)
                                        if is_for_protocol and (share_request.share_mode == "fullProtocol" or test_id in share_request.selected_tests):
                                            # Create a copy of the test to modify
                                            external_test = test.copy()
                                            
                                            # Remove the ID so it gets assigned by the external server
                                            if "id" in external_test:
                                                del external_test["id"]
                                            
                                            # Make sure it has meta tags
                                            if "meta" not in external_test:
                                                external_test["meta"] = {}
                                            if "tag" not in external_test["meta"]:
                                                external_test["meta"]["tag"] = []
                                            
                                            # Add a tag to indicate this is a shared test
                                            external_test["meta"]["tag"].append({
                                                "system": "http://example.org/fhir/tags",
                                                "code": "shared-test"
                                            })
                                            
                                            # Create a logical ID for this test in the bundle
                                            test_logical_id = f"urn:uuid:{test_id}"
                                            
                                            # Update protocol reference to use the logical ID
                                            for ext in external_test.get("extension", []):
                                                if ext.get("url") == "http://example.org/fhir/StructureDefinition/stability-test-protocol":
                                                    ext["valueReference"]["reference"] = protocol_logical_id
                                            
                                            associated_tests.append({
                                                "fullUrl": test_logical_id,
                                                "resource": external_test,
                                                "request": {
                                                    "method": "POST",
                                                    "url": "ActivityDefinition"
                                                }
                                            })
                                
                                # Now check if we need to include batches
                                associated_batches = []
                                
                                # If batches are being shared, include them in the bundle
                                if (hasattr(share_request, 'shareBatches') and 
                                    share_request.shareBatches and 
                                    hasattr(share_request, 'selectedBatches') and
                                    share_request.selectedBatches):
                                    
                                    for batch_id in share_request.selectedBatches:
                                        try:
                                            # Get the batch
                                            batch_response = requests.get(
                                                f"{FHIR_SERVER_URL}/Device/{batch_id}",
                                                headers={"Accept": "application/fhir+json"}
                                            )
                                            
                                            if batch_response.status_code == 200:
                                                batch = batch_response.json()
                                                
                                                # Create a logical ID for this batch
                                                batch_logical_id = f"urn:uuid:{batch_id}"
                                                
                                                # Create a copy without the ID for the external server
                                                external_batch = batch.copy()
                                                if "id" in external_batch:
                                                    del external_batch["id"]
                                                
                                                # Add meta tag to indicate this is a shared batch
                                                if "meta" not in external_batch:
                                                    external_batch["meta"] = {}
                                                if "tag" not in external_batch["meta"]:
                                                    external_batch["meta"]["tag"] = []
                                                
                                                external_batch["meta"]["tag"].append({
                                                    "system": "http://example.org/fhir/tags",
                                                    "code": "shared-batch"
                                                })
                                                
                                                # Make sure extension exists
                                                if "extension" not in external_batch:
                                                    external_batch["extension"] = []
                                                    
                                                # Extract existing sponsor info from the protocol
                                                sponsor_name = None
                                                sponsor_id = None
                                                
                                                for ext in existing_protocol.get("extension", []):
                                                    if ext.get("url") == "http://example.org/fhir/StructureDefinition/sponsor":
                                                        sponsor_name = ext.get("valueString")
                                                    elif ext.get("url") == "http://example.org/fhir/StructureDefinition/sponsor-id":
                                                        sponsor_id = ext.get("valueString")
                                                
                                                # If we have sponsor info, add it to the batch
                                                if sponsor_name:
                                                    external_batch["extension"].append({
                                                        "url": "http://example.org/fhir/StructureDefinition/sponsor",
                                                        "valueString": sponsor_name
                                                    })
                                                
                                                if sponsor_id:
                                                    external_batch["extension"].append({
                                                        "url": "http://example.org/fhir/StructureDefinition/sponsor-id",
                                                        "valueString": sponsor_id
                                                    })
                                                    
                                                # Add protocol_id to batch for easier reference
                                                if "identifier" not in external_batch:
                                                    external_batch["identifier"] = []
                                                
                                                # Check if protocol ID already exists in identifiers
                                                protocol_id_exists = False
                                                for ident in external_batch.get("identifier", []):
                                                    if (ident.get("system") == "http://example.org/fhir/identifier/protocol" and
                                                        ident.get("value") == protocol_id):
                                                        protocol_id_exists = True
                                                        break
                                                
                                                # Add protocol ID if it doesn't exist
                                                if not protocol_id_exists:
                                                    external_batch["identifier"].append({
                                                        "system": "http://example.org/fhir/identifier/protocol",
                                                        "value": protocol_id
                                                    })
                                                    
                                                # Add proper device type for stability batches
                                                external_batch["type"] = {
                                                    "coding": [
                                                        {
                                                            "system": "http://example.org/fhir/device-types",
                                                            "code": "stability-batch"
                                                        }
                                                    ]
                                                }
                                                
                                                # Update the protocol reference to use the logical ID
                                                for ext_idx, ext in enumerate(external_batch.get("extension", [])):
                                                    if ext.get("url") == "http://example.org/fhir/StructureDefinition/batch-protocol":
                                                        # Replace the reference with the logical ID
                                                        external_batch["extension"][ext_idx]["valueReference"]["reference"] = protocol_logical_id
                                                        break
                                                else:
                                                    # Add the protocol reference if it doesn't exist
                                                    external_batch["extension"].append({
                                                        "url": "http://example.org/fhir/StructureDefinition/batch-protocol",
                                                        "valueReference": {
                                                            "reference": protocol_logical_id
                                                        }
                                                    })
                                                
                                                # Add batch to bundle entries
                                                associated_batches.append({
                                                    "fullUrl": batch_logical_id,
                                                    "resource": external_batch,
                                                    "request": {
                                                        "method": "POST",
                                                        "url": "Device"
                                                    }
                                                })
                                        except Exception as batch_error:
                                            print(f"Error processing batch {batch_id} for sharing: {str(batch_error)}")
                                
                                # Create the bundle with all resources
                                bundle = {
                                    "resourceType": "Bundle",
                                    "type": "transaction",
                                    "entry": [
                                        {
                                            "fullUrl": protocol_logical_id,
                                            "resource": external_protocol,
                                            "request": {
                                                "method": "POST",
                                                "url": "PlanDefinition"
                                            }
                                        }
                                    ] + associated_tests + associated_batches
                                }
                                
                                # Send the bundle to the external server
                                print(f"Pushing bundle with protocol, {len(associated_tests)} test definitions, and {len(associated_batches)} batches to {url}")
                                
                                # Prepare headers
                                headers = {
                                    "Content-Type": "application/fhir+json",
                                    "Accept": "application/fhir+json"
                                }
                                
                                # Add API key if provided
                                if api_key:
                                    headers["Authorization"] = f"Bearer {api_key}"
                                
                                bundle_response = requests.post(
                                    f"{url}",  # Root endpoint for transaction bundles
                                    json=bundle,
                                    headers=headers,
                                    timeout=45  # Longer timeout for bundle processing
                                )
                                
                                if bundle_response.status_code >= 200 and bundle_response.status_code < 300:
                                    message_parts = []
                                    message_parts.append(f"Successfully shared protocol")
                                    if len(associated_tests) > 0:
                                        message_parts.append(f"{len(associated_tests)} test definitions")
                                    if len(associated_batches) > 0:
                                        message_parts.append(f"{len(associated_batches)} batches")
                                    
                                    success_message = " and ".join(message_parts) + f" to {url}"
                                    print(f"Successfully shared with {org.get('name')}: {success_message}")
                                    success, message = True, success_message
                                else:
                                    print(f"Failed to share bundle with {org.get('name')}: {bundle_response.status_code} - {bundle_response.text}")
                                    success, message = False, f"Failed to share protocol: {bundle_response.text}"
                                    
                            except Exception as bundle_error:
                                print(f"Error creating or sending bundle: {str(bundle_error)}")
                                success, message = False, f"Error sharing protocol: {str(bundle_error)}"
                        else:
                            # If not sharing tests, just push the protocol
                            success, message = await push_protocol_to_external_server(
                                existing_protocol,
                                url,
                                api_key,
                                share_request.share_mode,
                                share_request.selected_tests
                            )
                        
                        share_results.append({
                            "organization_id": org_id,
                            "organization_name": org.get("name"),
                            "success": success,
                            "message": message
                        })
                    else:
                        share_results.append({
                            "organization_id": org_id,
                            "organization_name": org.get("name", "Unknown"),
                            "success": False,
                            "message": "No FHIR server URL provided for this organization"
                        })
                else:
                    share_results.append({
                        "organization_id": org_id,
                        "success": False,
                        "message": f"Could not retrieve organization details: {org_response.status_code}"
                    })
            except Exception as org_error:
                share_results.append({
                    "organization_id": org_id,
                    "success": False,
                    "message": f"Error processing organization: {str(org_error)}"
                })
        
        return {
            "message": f"Protocol {protocol_id} shared with {len(share_request.organization_ids)} organizations",
            "share_results": share_results,
            "batches_shared": hasattr(share_request, 'shareBatches') and share_request.shareBatches and 
                              hasattr(share_request, 'selectedBatches') and len(share_request.selectedBatches)
        }
    except HTTPException:
        raise
    except requests.RequestException as e:
        error_message = str(e)
        if hasattr(e, 'response') and e.response:
            try:
                error_detail = e.response.json()
                error_message = json.dumps(error_detail)
            except:
                error_message = e.response.text
            
        raise HTTPException(status_code=500, detail=f"Failed to share protocol: {error_message}")

@app.get("/protocols/{protocol_id}/shares")
async def get_protocol_shares(protocol_id: str):
    """Get organizations that this protocol is shared with by reading extension in the PlanDefinition"""
    try:
        # Get the protocol
        protocol_response = requests.get(
            f"{FHIR_SERVER_URL}/PlanDefinition/{protocol_id}",
            headers={"Accept": "application/fhir+json"}
        )
        protocol_response.raise_for_status()
        protocol = protocol_response.json()
        
        # Extract organization references
        share_ext_url = "http://example.org/fhir/StructureDefinition/plan-definition-shared-organizations"
        org_references = []
        
        for ext in protocol.get("extension", []):
            if ext.get("url") == share_ext_url:
                for org_ext in ext.get("extension", []):
                    if "valueReference" in org_ext and "reference" in org_ext["valueReference"]:
                        ref = org_ext["valueReference"]["reference"]
                        if ref.startswith("Organization/"):
                            org_id = ref.split("/")[1]
                            org_references.append(org_id)
        
        if not org_references:
            return []
        
        # Get details for each organization
        shared_orgs = []
        for org_id in org_references:
            try:
                org_response = requests.get(
                    f"{FHIR_SERVER_URL}/Organization/{org_id}",
                    headers={"Accept": "application/fhir+json"}
                )
                if org_response.status_code == 200:
                    org = org_response.json()
                    
                    # Extract URL from telecom
                    url = ""
                    for telecom in org.get("telecom", []):
                        if telecom.get("system") == "url":
                            url = telecom.get("value", "")
                            break
                    
                    # Extract API key from extension
                    api_key = ""
                    for ext in org.get("extension", []):
                        if ext.get("url") == "http://example.org/fhir/StructureDefinition/organization-api-key":
                            api_key = ext.get("valueString", "")
                            break
                    
                    shared_orgs.append({
                        "id": org.get("id"),
                        "name": org.get("name"),
                        "url": url,
                        "api_key": api_key,
                        "shared_at": None  # No timestamp in FHIR model
                    })
            except Exception as org_error:
                print(f"Error fetching organization {org_id}: {str(org_error)}")
                # Continue with other organizations
        
        return shared_orgs
    except requests.RequestException as e:
        if e.response and e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Protocol with ID {protocol_id} not found")
        raise HTTPException(status_code=500, detail=f"Failed to fetch protocol shares: {str(e)}")

# Stability Test Management Endpoints
@app.post("/tests")
async def create_test(test: TestDefinitionCreate):
    """Create a new stability test definition using FHIR ActivityDefinition"""
    try:
        # Log incoming test data for debugging
        print(f"Creating test with data: {test.dict()}")
        
        # Convert to FHIR ActivityDefinition
        test_data = {
            "resourceType": "ActivityDefinition",
            "name": test.title.replace(" ", "_").lower(),
            "title": test.title,
            "status": "active",
            "description": test.description,
            "topic": [
                {
                    "coding": [
                        {
                            "system": "http://example.org/fhir/stability-test-types",
                            "code": test.test_type,
                            "display": f"Stability Test {test.test_type}"
                        }
                    ]
                }
            ],
            "extension": [
                {
                    "url": "http://example.org/fhir/StructureDefinition/stability-test-protocol",
                    "valueReference": {
                        "reference": f"PlanDefinition/{test.protocol_id}"
                    }
                },
                {
                    "url": "http://example.org/fhir/StructureDefinition/stability-test-type",
                    "valueString": test.test_type
                }
            ]
        }
        
        # Add test subtype if provided
        if test.test_subtype:
            test_data["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/stability-test-subtype",
                "valueString": test.test_subtype
            })
        
        # Add parameters if provided
        if test.parameters:
            print(f"Adding test parameters: {test.parameters}")
            test_data["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/stability-test-parameters",
                "valueString": json.dumps(test.parameters)
            })
            
        # Add acceptance criteria if provided
        if test.acceptance_criteria:
            print(f"Adding acceptance criteria: {test.acceptance_criteria}")
            test_data["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/stability-test-acceptance-criteria",
                "valueString": json.dumps(test.acceptance_criteria)
            })
        
        response = requests.post(
            f"{FHIR_SERVER_URL}/ActivityDefinition",
            json=test_data,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        
        # Return the created test definition
        return response.json()
    except requests.RequestException as e:
        error_message = str(e)
        if hasattr(e, 'response') and e.response:
            try:
                error_detail = e.response.json()
                error_message = json.dumps(error_detail)
            except:
                error_message = e.response.text
        
        raise HTTPException(status_code=500, detail=f"Failed to create test: {error_message}")

@app.get("/tests")
async def get_tests(protocol_id: Optional[str] = None):
    """Get all stability test definitions, optionally filtered by protocol ID"""
    try:
        print(f"Fetching tests from FHIR server: {FHIR_SERVER_URL}")
        print(f"Protocol filter: {protocol_id or 'None'}")
        
        # Get all test definitions
        try:
            response = requests.get(
                f"{FHIR_SERVER_URL}/ActivityDefinition",
                headers={"Accept": "application/fhir+json"},
                timeout=5  # 5 second timeout
            )
            
            print(f"ActivityDefinition search status code: {response.status_code}")
            response.raise_for_status()
            all_tests = response.json()
            print(f"Found {all_tests.get('total', 0)} total ActivityDefinition resources")
            
            # Check if we have a valid bundle
            if not all_tests or all_tests.get("resourceType") != "Bundle":
                print(f"Warning: Expected Bundle but got {all_tests.get('resourceType', 'None')}")
                return {"resourceType": "Bundle", "type": "searchset", "total": 0, "entry": []}
                
            if not all_tests.get("entry"):
                print("Warning: Bundle contains no entries")
                return {"resourceType": "Bundle", "type": "searchset", "total": 0, "entry": []}
            
            if protocol_id:
                # Filter tests by protocol_id in the extension
                filtered_entries = []
                
                for entry in all_tests["entry"]:
                    test = entry.get("resource", {})
                    
                    # Check for protocol reference in extensions
                    for ext in test.get("extension", []):
                        if ext.get("url") == "http://example.org/fhir/StructureDefinition/stability-test-protocol":
                            if ext.get("valueReference", {}).get("reference") == f"PlanDefinition/{protocol_id}":
                                filtered_entries.append(entry)
                                break
                
                # Return filtered bundle
                filtered_bundle = {
                    "resourceType": "Bundle",
                    "type": "searchset",
                    "total": len(filtered_entries),
                    "entry": filtered_entries
                }
                
                print(f"Filtered to {len(filtered_entries)} tests for protocol {protocol_id}")
                return filtered_bundle
            
            return all_tests
            
        except requests.Timeout:
            print(f"Error: Connection to FHIR server at {FHIR_SERVER_URL} timed out")
            raise HTTPException(
                status_code=504, 
                detail=f"Connection to FHIR server timed out. Please check that the FHIR server is running at {FHIR_SERVER_URL}."
            )
    except requests.ConnectionError as e:
        error_message = f"Could not connect to FHIR server at {FHIR_SERVER_URL}: {str(e)}"
        print(f"Error: {error_message}")
        raise HTTPException(status_code=503, detail=error_message)
    except requests.RequestException as e:
        error_message = f"Failed to fetch tests: {str(e)}"
        print(f"Error: {error_message}")
        raise HTTPException(status_code=500, detail=error_message)

@app.get("/tests/{test_id}")
async def get_test(test_id: str):
    """Get a specific test definition by ID"""
    try:
        response = requests.get(
            f"{FHIR_SERVER_URL}/ActivityDefinition/{test_id}",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        if e.response and e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Test with ID {test_id} not found")
        raise HTTPException(status_code=500, detail=f"Failed to fetch test: {str(e)}")

# Batch Management Endpoints
@app.post("/batches")
async def create_batch(batch: BatchCreate):
    """Create a new test batch using FHIR Device resource"""
    try:
        # Convert to FHIR Device
        batch_data = {
            "resourceType": "Device",
            "deviceName": [
                {
                    "name": batch.name,
                    "type": "manufacturer-name"
                }
            ],
            "status": batch.status,
            "identifier": [
                {
                    "system": "http://example.org/batch-identifiers",
                    "value": batch.identifier
                }
            ],
            "manufactureDate": batch.manufacturing_date,
            "expirationDate": batch.expiry_date,
            "lotNumber": batch.lot_number,
            "extension": [
                {
                    "url": "http://example.org/fhir/StructureDefinition/batch-protocol",
                    "valueReference": {
                        "reference": f"PlanDefinition/{batch.protocol_id}"
                    }
                }
            ]
        }
        
        response = requests.post(
            f"{FHIR_SERVER_URL}/Device",
            json=batch_data,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        
        # Return the created batch
        return response.json()
    except requests.RequestException as e:
        error_message = str(e)
        if hasattr(e, 'response') and e.response:
            try:
                error_detail = e.response.json()
                error_message = json.dumps(error_detail)
            except:
                error_message = e.response.text
        
        raise HTTPException(status_code=500, detail=f"Failed to create batch: {error_message}")

@app.get("/batches")
async def get_batches(protocol_id: Optional[str] = None):
    """Get all batches, optionally filtered by protocol ID"""
    try:
        if protocol_id:
            # Get all devices first
            response = requests.get(
                f"{FHIR_SERVER_URL}/Device",
                headers={"Accept": "application/fhir+json"}
            )
            response.raise_for_status()
            all_devices = response.json()
            
            # Filter devices by protocol_id in the extension
            if all_devices and all_devices.get("resourceType") == "Bundle" and all_devices.get("entry"):
                filtered_entries = []
                
                for entry in all_devices["entry"]:
                    device = entry.get("resource", {})
                    protocol_reference = None
                    
                    # Check for protocol reference in extensions
                    for ext in device.get("extension", []):
                        if ext.get("url") == "http://example.org/fhir/StructureDefinition/batch-protocol":
                            if ext.get("valueReference", {}).get("reference") == f"PlanDefinition/{protocol_id}":
                                filtered_entries.append(entry)
                                break
                
                # Return filtered bundle
                filtered_bundle = {
                    "resourceType": "Bundle",
                    "type": "searchset",
                    "total": len(filtered_entries),
                    "entry": filtered_entries
                }
                return filtered_bundle
            
            return all_devices
        else:
            # Get all devices without filtering
            response = requests.get(
                f"{FHIR_SERVER_URL}/Device",
                headers={"Accept": "application/fhir+json"}
            )
            
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch batches: {str(e)}")

@app.get("/batches/{batch_id}")
async def get_batch(batch_id: str):
    """Get a specific batch by ID"""
    try:
        response = requests.get(
            f"{FHIR_SERVER_URL}/Device/{batch_id}",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        if e.response and e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Batch with ID {batch_id} not found")
        raise HTTPException(status_code=500, detail=f"Failed to fetch batch: {str(e)}")

# Test Results Endpoints
@app.post("/results")
async def create_test_result(result: TestResultCreate):
    """Create a new test result using FHIR Observation resource"""
    try:
        # Convert to FHIR Observation
        result_data = {
            "resourceType": "Observation",
            "status": result.status,
            "code": {
                "coding": [
                    {
                        "system": "http://example.org/stability-tests",
                        "code": "result",
                        "display": "Stability Test Result"
                    }
                ]
            },
            "effectiveDateTime": result.result_date,
            "valueString": json.dumps(result.value) if isinstance(result.value, (dict, list)) else str(result.value),
            "device": {
                "reference": f"Device/{result.batch_id}"
            },
            "extension": [
                {
                    "url": "http://example.org/fhir/StructureDefinition/test-definition",
                    "valueReference": {
                        "reference": f"ActivityDefinition/{result.test_id}"
                    }
                },
                {
                    "url": "http://example.org/fhir/StructureDefinition/result-organization",
                    "valueReference": {
                        "reference": f"Organization/{result.organization_id}"
                    }
                }
            ]
        }
        
        # Add unit if provided
        if result.unit:
            result_data["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/result-unit",
                "valueString": result.unit
            })
            
        # Add comments if provided
        if result.comments:
            result_data["note"] = [
                {
                    "text": result.comments
                }
            ]
        
        response = requests.post(
            f"{FHIR_SERVER_URL}/Observation",
            json=result_data,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        
        # Return the created result
        return response.json()
    except requests.RequestException as e:
        error_message = str(e)
        if hasattr(e, 'response') and e.response:
            try:
                error_detail = e.response.json()
                error_message = json.dumps(error_detail)
            except:
                error_message = e.response.text
        
        raise HTTPException(status_code=500, detail=f"Failed to create test result: {error_message}")

@app.get("/results")
async def get_results(
    batch_id: Optional[str] = None,
    test_id: Optional[str] = None,
    organization_id: Optional[str] = None
):
    """Get test results, optionally filtered by batch, test, or organization"""
    try:
        # Build standard query parameters
        query_params = []
        if batch_id:
            # 'device' is a valid search parameter for Observation
            query_params.append(f"device=Device/{batch_id}")
        
        query_string = "&".join(query_params)
        
        # Get observations
        if query_string:
            response = requests.get(
                f"{FHIR_SERVER_URL}/Observation?{query_string}",
                headers={"Accept": "application/fhir+json"}
            )
        else:
            response = requests.get(
                f"{FHIR_SERVER_URL}/Observation",
                headers={"Accept": "application/fhir+json"}
            )
            
        response.raise_for_status()
        all_observations = response.json()
        
        # If test_id or organization_id filters are specified, we need to filter in our code
        if (test_id or organization_id) and all_observations and all_observations.get("resourceType") == "Bundle" and all_observations.get("entry"):
            filtered_entries = []
            
            for entry in all_observations["entry"]:
                observation = entry.get("resource", {})
                include_entry = True
                
                # Check test_id filter
                if test_id and include_entry:
                    test_reference_found = False
                    for ext in observation.get("extension", []):
                        if ext.get("url") == "http://example.org/fhir/StructureDefinition/test-definition":
                            if ext.get("valueReference", {}).get("reference") == f"ActivityDefinition/{test_id}":
                                test_reference_found = True
                                break
                    include_entry = test_reference_found
                
                # Check organization_id filter
                if organization_id and include_entry:
                    org_reference_found = False
                    for ext in observation.get("extension", []):
                        if ext.get("url") == "http://example.org/fhir/StructureDefinition/result-organization":
                            if ext.get("valueReference", {}).get("reference") == f"Organization/{organization_id}":
                                org_reference_found = True
                                break
                    include_entry = org_reference_found
                
                if include_entry:
                    filtered_entries.append(entry)
            
            # Return filtered bundle
            filtered_bundle = {
                "resourceType": "Bundle",
                "type": "searchset",
                "total": len(filtered_entries),
                "entry": filtered_entries
            }
            return filtered_bundle
            
        return all_observations
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch test results: {str(e)}")

@app.get("/results/{result_id}")
async def get_result(result_id: str):
    """Get a specific test result by ID"""
    try:
        response = requests.get(
            f"{FHIR_SERVER_URL}/Observation/{result_id}",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        if e.response and e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Result with ID {result_id} not found")
        raise HTTPException(status_code=500, detail=f"Failed to fetch result: {str(e)}")

# Endpoint to fetch CRO test results
@app.get("/results/cro", response_model=List[Dict[str, Any]])
async def get_cro_results(protocol_id: Optional[str] = None, batch_id: Optional[str] = None):
    """
    Fetch test results from CROs for a specific protocol or batch
    
    Args:
        protocol_id: Optional filter for a specific protocol
        batch_id: Optional filter for a specific batch
    """
    try:
        # Build query to find results
        query_params = {
            "_count": 100,
            "category": "stability-test"
        }
        
        # Add tag filter for CRO-generated results
        query_params["_tag"] = "cro-generated-result"
        
        # Filter by batch if provided
        if batch_id:
            query_params["subject"] = f"Device/{batch_id}"
        
        # Execute the query
        response = requests.get(
            f"{FHIR_SERVER_URL}/Observation",
            params=query_params,
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        
        # Get all results
        all_results = []
        for entry in response.json().get("entry", []):
            observation = entry["resource"]
            
            # Process each result to extract key information
            processed_result = {
                "id": observation.get("id"),
                "status": observation.get("status"),
                "result_date": observation.get("effectiveDateTime"),
                "batch_id": observation.get("subject", {}).get("reference", "").replace("Device/", ""),
                "test_type": observation.get("code", {}).get("text", "Unknown test")
            }
            
            # Extract result value
            if "valueQuantity" in observation:
                processed_result["value"] = observation["valueQuantity"].get("value")
                processed_result["unit"] = observation["valueQuantity"].get("unit", "")
            elif "valueString" in observation:
                processed_result["value"] = observation["valueString"]
                processed_result["unit"] = ""
            else:
                processed_result["value"] = "No value recorded"
                processed_result["unit"] = ""
            
            # Extract protocol reference if available
            for ext in observation.get("extension", []):
                if ext.get("url") == "http://example.org/fhir/StructureDefinition/test-protocol":
                    if ext.get("valueReference", {}).get("reference", "").startswith("PlanDefinition/"):
                        processed_result["protocol_id"] = ext.get("valueReference", {}).get("reference", "").replace("PlanDefinition/", "")
                        break
            
            # Extract performer information
            if observation.get("performer") and len(observation["performer"]) > 0:
                processed_result["performed_by"] = observation["performer"][0].get("display", "Unknown")
            else:
                processed_result["performed_by"] = "Unknown"
                
            # Extract CRO organization information
            for ext in observation.get("extension", []):
                if ext.get("url") == "http://example.org/fhir/StructureDefinition/result-organization" and ext.get("valueReference"):
                    ref = ext.get("valueReference", {})
                    processed_result["cro_id"] = ref.get("reference", "").replace("Organization/", "")
                    processed_result["cro_name"] = ref.get("display", "Unknown CRO")
                    break
            
            # Filter by protocol if specified
            if protocol_id:
                if "protocol_id" in processed_result and processed_result["protocol_id"] == protocol_id:
                    all_results.append(processed_result)
                # If result doesn't have protocol ID but has batch ID, check if batch belongs to protocol
                elif batch_id and batch_id == processed_result.get("batch_id"):
                    # Check if batch belongs to protocol
                    try:
                        batch_response = requests.get(
                            f"{FHIR_SERVER_URL}/Device/{batch_id}",
                            headers={"Accept": "application/fhir+json"}
                        )
                        if batch_response.status_code == 200:
                            batch = batch_response.json()
                            # Check identifiers for protocol reference
                            for ident in batch.get("identifier", []):
                                if ident.get("system") == "http://example.org/fhir/identifier/protocol" and ident.get("value") == protocol_id:
                                    all_results.append(processed_result)
                                    break
                    except:
                        # If we can't fetch batch, skip this result
                        pass
            else:
                # No protocol filter, add all results
                all_results.append(processed_result)
                
        return all_results
    except Exception as e:
        error_message = str(e)
        if hasattr(e, 'response') and e.response:
            try:
                error_detail = e.response.json()
                error_message = json.dumps(error_detail)
            except:
                error_message = e.response.text
        
        raise HTTPException(status_code=500, detail=f"Failed to retrieve CRO results: {error_message}")

# External results endpoint for CROs to push results
@app.post("/results/external")
async def receive_external_result(result: Dict[str, Any]):
    """Receive test results from external CROs"""
    try:
        # Verify this is a valid result from a CRO
        is_cro_result = False
        
        # Check extensions for source indicator
        for ext in result.get("extension", []):
            if (ext.get("url") == "http://example.org/fhir/StructureDefinition/result-source" and
                ext.get("valueString") == "cro"):
                is_cro_result = True
                break
        
        if not is_cro_result:
            raise HTTPException(status_code=400, detail="Result does not appear to be from a CRO")
        
        # Create a copy and save to our server
        local_result = result.copy()
        
        # Remove any existing ID as our server will assign a new one
        if "id" in local_result:
            del local_result["id"]
        
        # Add shared status and processing metadata
        if "meta" not in local_result:
            local_result["meta"] = {}
        if "tag" not in local_result["meta"]:
            local_result["meta"]["tag"] = []
        
        # Add tag to indicate this is a CRO-provided result
        local_result["meta"]["tag"].append({
            "system": "http://example.org/fhir/tags",
            "code": "cro-provided-result"
        })
        
        # Save to our FHIR server
        response = requests.post(
            f"{FHIR_SERVER_URL}/Observation",
            json=local_result,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        
        return {
            "message": "Result received and saved successfully",
            "id": response.json().get("id")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process external result: {str(e)}")

# Run with: uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)