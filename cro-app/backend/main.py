from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import requests
import os
import json
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CRO Stability Testing API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
FHIR_SERVER_URL = os.getenv("FHIR_SERVER_URL", "http://localhost:8081/fhir")
SPONSOR_SERVER_URL = os.getenv("SPONSOR_SERVER_URL", "http://localhost:8002")

# Models
class Protocol(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    sponsor: str
    status: str
    shared_date: str
    action: Optional[List[Dict[str, Any]]] = None

class Batch(BaseModel):
    id: Optional[str] = None
    protocol_id: str
    batch_number: str
    manufacture_date: str
    quantity: int
    status: str = "registered"

class Organization(BaseModel):
    id: Optional[str] = None
    name: str
    type: str = "sponsor"  # "sponsor" or "cro"
    fhir_server_url: str
    api_key: Optional[str] = None
    status: str = "active"
    description: Optional[str] = None
    
class TestResult(BaseModel):
    id: Optional[str] = None
    protocol_id: Optional[str] = None
    batch_id: Optional[str] = None
    test_definition_id: str
    timepoint_id: Optional[str] = None  # Protocol timepoint ID
    timepoint_title: Optional[str] = None  # Protocol timepoint title
    result_date: str
    result_time: Optional[str] = None  # Time of the test
    result_value: str
    result_unit: str
    notes: Optional[str] = None
    status: str = "completed"
    performed_by: str
    share_with_sponsor: Optional[bool] = False
    sponsor_id: Optional[str] = None  # Reference to the sponsor organization
    parameter_results: Optional[Dict[str, Any]] = None  # Results for test parameters
    criteria_results: Optional[Dict[str, bool]] = None  # Results for acceptance criteria
    result_details: Optional[Dict[str, Any]] = None  # Any additional result details

class ShareResultRequest(BaseModel):
    share_with_sponsor: bool = True
    finalize: Optional[bool] = False
    notes: Optional[str] = None

# Helper functions
def fetch_fhir_resource(resource_type, resource_id=None, params=None):
    """Fetch FHIR resources from the HAPI FHIR server."""
    url = f"{FHIR_SERVER_URL}/{resource_type}"
    if resource_id:
        url += f"/{resource_id}"
    
    logger.info(f"Fetching from CRO's FHIR server URL: {url}")
    if params:
        logger.info(f"With parameters: {params}")
    
    try:
        response = requests.get(url, params=params)
        logger.info(f"FHIR server response status: {response.status_code}")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        error_msg = f"FHIR server error: {str(e)}"
        logger.error(error_msg)
        logger.error(f"Error occurred with URL: {url}")
        raise HTTPException(status_code=500, detail=error_msg)

def create_fhir_resource(resource_type, data):
    """Create a FHIR resource on the HAPI FHIR server."""
    url = f"http://host.docker.internal:8081/fhir/{resource_type}"
    
    logger.info(f"Creating {resource_type} resource on CRO's FHIR server URL: {url}")
    logger.info(f"Resource data: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(url, json=data,headers={
        "Content-Type": "application/fhir+json"
    },)
        logger.info(f"FHIR server response status: {response.status_code}")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        error_msg = f"FHIR server error: {str(e)}"
        logger.error(error_msg)
        logger.error(f"Error occurred with URL: {url}")
        raise HTTPException(status_code=500, detail=error_msg)

def update_fhir_resource(resource_type, resource_id, data):
    """Update a FHIR resource on the HAPI FHIR server."""
    url = f"{FHIR_SERVER_URL}/{resource_type}/{resource_id}"
    
    logger.info(f"Updating {resource_type}/{resource_id} on CRO's FHIR server URL: {url}")
    
    try:
        response = requests.put(url, json=data)
        logger.info(f"FHIR server response status: {response.status_code}")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        error_msg = f"FHIR server error: {str(e)}"
        logger.error(error_msg)
        logger.error(f"Error occurred with URL: {url}")
        raise HTTPException(status_code=500, detail=error_msg)

def delete_fhir_resource(resource_type, resource_id):
    """Delete a FHIR resource on the HAPI FHIR server."""
    url = f"{FHIR_SERVER_URL}/{resource_type}/{resource_id}"
    
    logger.info(f"Deleting {resource_type}/{resource_id} from CRO's FHIR server URL: {url}")
    
    try:
        response = requests.delete(url)
        logger.info(f"FHIR server response status: {response.status_code}")
        response.raise_for_status()
        return True
    except requests.RequestException as e:
        error_msg = f"FHIR server error: {str(e)}"
        logger.error(error_msg)
        logger.error(f"Error occurred with URL: {url}")
        raise HTTPException(status_code=500, detail=error_msg)

# Convert FHIR resources to API models
def convert_plandefinition_to_protocol(plan_definition):
    """Convert a FHIR PlanDefinition to a Protocol model."""
    # Default sponsor name
    sponsor = "Unknown"
    
    # Check for sponsor name in extensions
    for ext in plan_definition.get("extension", []):
        if ext.get("url") == "http://example.org/fhir/StructureDefinition/sponsor":
            if "valueString" in ext:
                sponsor = ext["valueString"]
                break
    
    # If no sponsor found in extension, try to get from meta
    if sponsor == "Unknown" and "meta" in plan_definition:
        if "source" in plan_definition["meta"]:
            sponsor = plan_definition["meta"]["source"]
    
    # Get shared date
    shared_date = datetime.now().isoformat()
    for ext in plan_definition.get("extension", []):
        if ext.get("url") == "http://example.org/fhir/StructureDefinition/sharedDate":
            if "valueDateTime" in ext:
                shared_date = ext["valueDateTime"]
                break
    
    # If no specific shared date, use lastUpdated from meta
    if shared_date == datetime.now().isoformat() and "meta" in plan_definition:
        if "lastUpdated" in plan_definition["meta"]:
            shared_date = plan_definition["meta"]["lastUpdated"]
    
    return Protocol(
        id=plan_definition["id"],
        title=plan_definition.get("title", "Untitled Protocol"),
        description=plan_definition.get("description"),
        sponsor=sponsor,
        status=plan_definition.get("status", "unknown"),
        shared_date=shared_date,
        action=plan_definition.get("action", [])
    )

def convert_device_to_batch(device):
    """Convert a FHIR Device to a Batch model."""
    # Try to get protocol ID from identifier
    protocol_id = ""
    if "identifier" in device:
        for ident in device["identifier"]:
            if ident.get("system") == "http://example.org/fhir/identifier/protocol":
                protocol_id = ident.get("value", "")
                break
    
    # If not found in identifier, try to get from extension
    if not protocol_id and "extension" in device:
        for ext in device["extension"]:
            if ext.get("url") == "http://example.org/fhir/StructureDefinition/batch-protocol":
                ref = ext.get("valueReference", {}).get("reference", "")
                if ref and ref.startswith("PlanDefinition/"):
                    protocol_id = ref.split("/")[1]
                    break
    
    # Get manufacture date
    manufacture_date = device.get("manufactureDate", datetime.now().isoformat())
    
    # If not in the standard field, try extensions
    if not manufacture_date and "extension" in device:
        for ext in device["extension"]:
            if ext.get("url") == "http://example.org/fhir/StructureDefinition/manufactureDate":
                manufacture_date = ext.get("valueDateTime", datetime.now().isoformat())
                break
    
    # Get quantity
    quantity = 0
    if "extension" in device:
        for ext in device["extension"]:
            if ext.get("url") == "http://example.org/fhir/StructureDefinition/quantity":
                if "valueInteger" in ext:
                    quantity = ext["valueInteger"]
                    break
    
    # Get batch number from deviceName, lotNumber, or identifier
    batch_number = "Unknown Batch"
    if "deviceName" in device and device["deviceName"]:
        batch_number = device["deviceName"][0].get("name", "Unknown")
    elif "lotNumber" in device and device["lotNumber"]:
        batch_number = f"Lot {device['lotNumber']}"
    
    return Batch(
        id=device["id"],
        protocol_id=protocol_id,
        batch_number=batch_number,
        manufacture_date=manufacture_date,
        quantity=quantity,
        status=device.get("status", "registered")
    )

def convert_observation_to_test_result(observation):
    """Convert a FHIR Observation to a TestResult model."""
    batch_id = None
    if "subject" in observation and observation["subject"]:
        batch_id = observation.get("subject", {}).get("reference", "").replace("Device/", "")
    test_definition_id = observation.get("code", {}).get("text", "")
    
    # Extract from basedOn if present
    if "basedOn" in observation and observation["basedOn"]:
        for reference in observation["basedOn"]:
            if reference.get("reference", "").startswith("ActivityDefinition/"):
                test_definition_id = reference.get("reference", "").replace("ActivityDefinition/", "")
    
    # Extract protocol ID from extensions if available
    protocol_id = None
    timepoint_id = None
    timepoint_title = None
    
    for ext in observation.get("extension", []):
        if ext.get("url") == "http://example.org/fhir/StructureDefinition/test-protocol-reference":
            protocol_ref = ext.get("valueReference", {}).get("reference", "")
            if protocol_ref and protocol_ref.startswith("PlanDefinition/"):
                protocol_id = protocol_ref.replace("PlanDefinition/", "")
        elif ext.get("url") == "http://example.org/fhir/StructureDefinition/protocol-timepoint":
            timepoint_id = ext.get("valueString")
        elif ext.get("url") == "http://example.org/fhir/StructureDefinition/protocol-timepoint-title":
            timepoint_title = ext.get("valueString")
    
    # Extract share with sponsor flag
    shared_with_sponsor = False
    for ext in observation.get("extension", []):
        if ext.get("url") == "http://example.org/fhir/StructureDefinition/shared-with-sponsor":
            shared_with_sponsor = ext.get("valueBoolean", False)
    
    value = None
    value_unit = ""
    
    if "valueQuantity" in observation:
        value = observation["valueQuantity"].get("value", "")
        value_unit = observation["valueQuantity"].get("unit", "")
    elif "valueString" in observation:
        value = observation["valueString"]
    
    # Extract parameter results if available
    parameter_results = {}
    for ext in observation.get("extension", []):
        if ext.get("url") == "http://example.org/fhir/StructureDefinition/parameter-results":
            try:
                if "valueString" in ext:
                    parameter_results = json.loads(ext["valueString"])
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse parameter results for observation {observation.get('id')}")
    
    # Extract criteria results if available
    criteria_results = {}
    for ext in observation.get("extension", []):
        if ext.get("url") == "http://example.org/fhir/StructureDefinition/criteria-results":
            try:
                if "valueString" in ext:
                    criteria_results = json.loads(ext["valueString"])
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse criteria results for observation {observation.get('id')}")
    
    # Extract additional result details if available
    result_details = {}
    for ext in observation.get("extension", []):
        if ext.get("url") == "http://example.org/fhir/StructureDefinition/result-details":
            try:
                if "valueString" in ext:
                    result_details = json.loads(ext["valueString"])
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse result details for observation {observation.get('id')}")
    
    return TestResult(
        id=observation["id"],
        protocol_id=protocol_id,
        batch_id=batch_id,
        test_definition_id=test_definition_id,
        timepoint_id=timepoint_id,
        timepoint_title=timepoint_title,
        result_date=observation.get("effectiveDateTime", datetime.now().isoformat()),
        result_time=observation.get("effectiveDateTime", datetime.now().isoformat())[11:19],
        result_value=str(value) if value is not None else "",
        result_unit=value_unit,
        notes=observation.get("note", [{"text": ""}])[0].get("text", ""),
        status="final",
        performed_by=observation.get("performer", [{"display": "Unknown"}])[0].get("display", "Unknown"),
        share_with_sponsor=shared_with_sponsor,
        parameter_results=parameter_results,
        criteria_results=criteria_results,
        result_details=result_details
    )

# Convert API models to FHIR resources
def convert_batch_to_device(batch):
    """Convert a Batch model to a FHIR Device resource."""
    now = datetime.now().isoformat()
    
    device = {
        "resourceType": "Device",
        "status": batch.status,
        "deviceName": [
            {
                "name": batch.batch_number,
                "type": "user-friendly-name"
            }
        ],
        "identifier": [
            {
                "system": "http://example.org/fhir/identifier/protocol",
                "value": batch.protocol_id
            }
        ],
        "extension": [
            {
                "url": "http://example.org/fhir/StructureDefinition/manufactureDate",
                "valueDateTime": batch.manufacture_date
            },
            {
                "url": "http://example.org/fhir/StructureDefinition/quantity",
                "valueInteger": batch.quantity
            }
        ]
    }
    
    return device

def convert_test_result_to_observation(test_result):
    """Convert a TestResult model to a FHIR Observation resource."""
    observation = {
        "resourceType": "Observation",
        "status": test_result.status,
        "code": {
            "text": test_result.test_definition_id
        },
        "effectiveDateTime": test_result.result_date + (f"T{test_result.result_time}" if test_result.result_time else ""),
        "performer": [
            {
                "display": test_result.performed_by
            }
        ],
        "extension": []
    }
    
    # Add batch reference if provided
    if test_result.batch_id:
        observation["subject"] = {
            "reference": f"Device/{test_result.batch_id}"
        }
    
    # Add protocol reference if provided
    if test_result.protocol_id:
        observation["extension"].append({
            "url": "http://example.org/fhir/StructureDefinition/test-protocol-reference",
            "valueReference": {
                "reference": f"PlanDefinition/{test_result.protocol_id}"
            }
        })
    
    # Add timepoint reference if provided
    if test_result.timepoint_id:
        observation["extension"].append({
            "url": "http://example.org/fhir/StructureDefinition/protocol-timepoint",
            "valueString": test_result.timepoint_id
        })
        
    # Add timepoint title if provided
    if test_result.timepoint_title:
        observation["extension"].append({
            "url": "http://example.org/fhir/StructureDefinition/protocol-timepoint-title",
            "valueString": test_result.timepoint_title
        })
    
    # Add reference to ActivityDefinition (test definition)
    #observation["basedOn"] = [
    #    {
    #        "reference": f"ActivityDefinition/{test_result.test_definition_id}"
    #    }
    #]
    
    # Add shared with sponsor flag
    if test_result.share_with_sponsor:
        observation["extension"].append({
            "url": "http://example.org/fhir/StructureDefinition/shared-with-sponsor",
            "valueBoolean": True
        })
    
    # Add parameter results if present
    if test_result.parameter_results:
        observation["extension"].append({
            "url": "http://example.org/fhir/StructureDefinition/parameter-results",
            "valueString": json.dumps(test_result.parameter_results)
        })
    
    # Add criteria results if present
    if test_result.criteria_results:
        observation["extension"].append({
            "url": "http://example.org/fhir/StructureDefinition/criteria-results",
            "valueString": json.dumps(test_result.criteria_results)
        })
    
    # Add additional result details if present
    if test_result.result_details:
        observation["extension"].append({
            "url": "http://example.org/fhir/StructureDefinition/result-details",
            "valueString": json.dumps(test_result.result_details)
        })
    
    # Add value based on unit
    if test_result.result_unit:
        try:
            value = float(test_result.result_value)
            observation["valueQuantity"] = {
                "value": value,
                "unit": test_result.result_unit
            }
        except ValueError:
            observation["valueString"] = test_result.result_value
    else:
        observation["valueString"] = test_result.result_value
    
    # Add notes if present
    if test_result.notes:
        observation["note"] = [
            {
                "text": test_result.notes
            }
        ]
    
    return observation

# Helper function to find the sponsor for a protocol
def get_sponsor_for_protocol(protocol_id):
    """Get the sponsor organization that owns the protocol."""
    try:
        # First, fetch the protocol
        protocol = fetch_fhir_resource("PlanDefinition", protocol_id)
        
        # Look for sponsor information in extensions
        sponsor_id = None
        sponsor_name = None
        
        for ext in protocol.get("extension", []):
            if ext.get("url") == "http://example.org/fhir/StructureDefinition/sponsor-id":
                sponsor_id = ext.get("valueString")
            elif ext.get("url") == "http://example.org/fhir/StructureDefinition/sponsor":
                sponsor_name = ext.get("valueString")
                
        # If we have a sponsor ID or name, try to find the corresponding organization
        if sponsor_id or sponsor_name:
            # First, search by ID in our local organizations
            organizations = fetch_fhir_resource("Organization")
            
            if organizations and organizations.get("entry"):
                for entry in organizations.get("entry", []):
                    org = entry["resource"]
                    
                    # Check if this matches our sponsor
                    org_type = None
                    for ext in org.get("extension", []):
                        if ext.get("url") == "http://example.org/fhir/StructureDefinition/organization-type":
                            org_type = ext.get("valueString")
                    
                    if org_type == "sponsor":
                        # Check for matching ID or name
                        if sponsor_id:
                            for identifier in org.get("identifier", []):
                                if identifier.get("value") == sponsor_id:
                                    return convert_fhir_organization_to_model(org)
                        
                        if sponsor_name and org.get("name") == sponsor_name:
                            return convert_fhir_organization_to_model(org)
        
        return None
    except Exception as e:
        logger.error(f"Error finding sponsor for protocol {protocol_id}: {str(e)}")
        return None

# Convert FHIR Organization to our model
def convert_fhir_organization_to_model(org):
    """Convert FHIR Organization to our Organization model."""
    fhir_url = None
    api_key = None
    org_type = "sponsor"  # Default
    
    # Extract URL from telecom
    for telecom in org.get("telecom", []):
        if telecom.get("system") == "url":
            fhir_url = telecom.get("value")
            break
    
    # Extract organization type and API key from extensions
    for ext in org.get("extension", []):
        if ext.get("url") == "http://example.org/fhir/StructureDefinition/organization-type":
            org_type = ext.get("valueString")
        elif ext.get("url") == "http://example.org/fhir/StructureDefinition/organization-api-key":
            api_key = ext.get("valueString")
    
    return Organization(
        id=org.get("id"),
        name=org.get("name", "Unknown Organization"),
        type=org_type,
        fhir_server_url=fhir_url or "",
        api_key=api_key,
        status="active" if org.get("active", True) else "inactive",
        description=org.get("description")
    )

# Convert our Organization model to FHIR
def convert_organization_to_fhir(organization):
    """Convert our Organization model to a FHIR Organization resource."""
    fhir_organization = {
        "resourceType": "Organization",
        "name": organization.name,
        "active": organization.status == "active",
        "telecom": [
            {
                "system": "url",
                "value": organization.fhir_server_url,
                "use": "work"
            }
        ],
        "extension": [
            {
                "url": "http://example.org/fhir/StructureDefinition/organization-type",
                "valueString": organization.type
            }
        ]
    }
    
    # Add API key if provided
    if organization.api_key:
        fhir_organization["extension"].append({
            "url": "http://example.org/fhir/StructureDefinition/organization-api-key",
            "valueString": organization.api_key
        })
    
    # Add description if provided
    if organization.description:
        fhir_organization["description"] = organization.description
    
    return fhir_organization

# Forward result to sponsor
async def forward_result_to_sponsor(observation, sponsor_id=None):
    """Forward a test result to the sponsor's server and return the response."""
    try:
        # Prepare the result data for the sponsor
        sponsor_result = observation.copy()
        
        # Add source information
        if "extension" not in sponsor_result:
            sponsor_result["extension"] = []
        
        sponsor_result["extension"].append({
            "url": "http://example.org/fhir/StructureDefinition/result-source",
            "valueString": "cro"
        })
        
        # Determine where to send the result
        target_url = f"{SPONSOR_SERVER_URL}/results/external"
        
        # If we have a protocol ID, try to find the sponsor's server URL
        protocol_id = None
        for ext in observation.get("extension", []):
            if ext.get("url") == "http://example.org/fhir/StructureDefinition/test-protocol-reference":
                protocol_ref = ext.get("valueReference", {}).get("reference", "")
                if protocol_ref.startswith("PlanDefinition/"):
                    protocol_id = protocol_ref.replace("PlanDefinition/", "")
                    break
        
        # Get the sponsor's details
        sponsor = None
        if sponsor_id:
            # Try to get the sponsor by ID
            try:
                sponsor_org = fetch_fhir_resource("Organization", sponsor_id)
                sponsor = convert_fhir_organization_to_model(sponsor_org)
            except Exception as e:
                logger.error(f"Error fetching sponsor organization {sponsor_id}: {str(e)}")
        elif protocol_id:
            # Try to get the sponsor from the protocol
            sponsor = get_sponsor_for_protocol(protocol_id)
        
        # If we found a sponsor with a FHIR server URL, use it
        if sponsor and sponsor.fhir_server_url:
            # Use the sponsor's FHIR server URL - hardcoded for docker compatibility
            # This is the sponsor's FHIR server
            sponsor_fhir_url = "http://host.docker.internal:8082/fhir"
            
            # Create a FHIR transaction to upload the Observation
            transaction = {
                "resourceType": "Bundle",
                "type": "transaction",
                "entry": [
                    {
                        "resource": sponsor_result,
                        "request": {
                            "method": "POST",
                            "url": "Observation"
                        }
                    }
                ]
            }
            
            # Set the target URL to the sponsor's FHIR server root
            target_url = sponsor_fhir_url
            
            logger.info(f"Original sponsor FHIR URL: {sponsor.fhir_server_url}")
            logger.info(f"Using docker-compatible URL: {sponsor_fhir_url}")
            logger.info(f"Using FHIR transaction to create Observation resource")
            
            # Prepare headers with API key if available
            headers = {
                "Content-Type": "application/fhir+json"
            }
            
            if sponsor.api_key:
                headers["Authorization"] = f"Bearer {sponsor.api_key}"
                
            logger.info(f"Forwarding result to sponsor's FHIR server: {target_url}")
            logger.info(f"Transaction bundle: {json.dumps(transaction, indent=2)}")
            
            # Send the transaction to the FHIR server
            response = requests.post(
                target_url,
                json=transaction,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            
            # Parse the response to capture created resources
            response_data = response.json()
            logger.info(f"FHIR server response: {json.dumps(response_data, indent=2)}")
            
            # Return both success status and the response data
            return {
                "success": True,
                "response": response_data,
                "status_code": response.status_code,
                "target_url": target_url,
                "message": "Successfully created Observation resource on sponsor's FHIR server"
            }
        else:
            # Fall back to default sponsor endpoint using docker-compatible URL
            # This is still the sponsor's FHIR server
            sponsor_fhir_url = "http://host.docker.internal:8082/fhir"
            
            # Create a FHIR transaction for the fallback case
            transaction = {
                "resourceType": "Bundle",
                "type": "transaction",
                "entry": [
                    {
                        "resource": sponsor_result,
                        "request": {
                            "method": "POST",
                            "url": "Observation"
                        }
                    }
                ]
            }
            
            # Set the target URL to the sponsor's FHIR server root
            target_url = sponsor_fhir_url
            
            logger.warning(f"No specific sponsor FHIR server found, using docker-compatible URL: {sponsor_fhir_url}")
            logger.warning(f"Using FHIR transaction to create Observation resource")
            logger.warning(f"Transaction bundle: {json.dumps(transaction, indent=2)}")
            
            response = requests.post(
                target_url,
                json=transaction,
                headers={
                    "Content-Type": "application/fhir+json"
                },
                timeout=10
            )
            response.raise_for_status()
            
            # Parse the response to capture created resources
            response_data = response.json()
            logger.warning(f"FHIR server response (fallback): {json.dumps(response_data, indent=2)}")
            
            # Return both success status and the response data
            return {
                "success": True,
                "response": response_data,
                "status_code": response.status_code,
                "target_url": target_url,
                "message": "Successfully created Observation resource on default FHIR server"
            }
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error forwarding result to sponsor: {error_message}")
        return {
            "success": False,
            "error": error_message,
            "message": "Failed to send test result to sponsor's FHIR server"
        }

# API Endpoints
@app.get("/")
def read_root():
    return {"message": "Welcome to CRO Stability Testing API"}

# Protocol endpoints (read-only)
@app.get("/protocols", response_model=List[Protocol])
def get_protocols():
    """Get all shared protocols (PlanDefinitions) with CRO access."""
    # First, get all PlanDefinitions
    response = fetch_fhir_resource("PlanDefinition", params={
        "_count": 100,
        "status": "active,draft"
    })
    
    protocols = []
    if response and response.get("entry"):
        for entry in response.get("entry", []):
            plan_definition = entry["resource"]
            
            # Check if this has a shared tag or extension
            shared_with_cro = False
            
            # Check in meta tags
            if "meta" in plan_definition and "tag" in plan_definition["meta"]:
                for tag in plan_definition["meta"]["tag"]:
                    if (tag.get("system") == "http://example.org/fhir/tags" and 
                        tag.get("code") == "shared-protocol"):
                        shared_with_cro = True
                        break
            
            # Also check in extension (either way might be used)
            if not shared_with_cro and "extension" in plan_definition:
                shared_with_cro = any(
                    ext.get("url") in [
                        "http://example.org/fhir/StructureDefinition/sharedWithCRO",
                        "http://example.org/fhir/StructureDefinition/plan-definition-shared-organizations"
                    ]
                    for ext in plan_definition.get("extension", [])
                )
            
            # Include if shared
            if shared_with_cro:
                protocols.append(convert_plandefinition_to_protocol(plan_definition))
    
    return protocols

@app.get("/protocols/{protocol_id}", response_model=Protocol)
def get_protocol(protocol_id: str):
    """Get a specific protocol by ID."""
    plan_definition = fetch_fhir_resource("PlanDefinition", protocol_id)
    
    # Check if this protocol is shared with the CRO
    shared_with_cro = False
    
    # Check in meta tags
    if "meta" in plan_definition and "tag" in plan_definition["meta"]:
        for tag in plan_definition["meta"]["tag"]:
            if (tag.get("system") == "http://example.org/fhir/tags" and 
                tag.get("code") == "shared-protocol"):
                shared_with_cro = True
                break
    
    # Also check in extension (either way might be used)
    if not shared_with_cro and "extension" in plan_definition:
        shared_with_cro = any(
            ext.get("url") in [
                "http://example.org/fhir/StructureDefinition/sharedWithCRO",
                "http://example.org/fhir/StructureDefinition/plan-definition-shared-organizations"
            ]
            for ext in plan_definition.get("extension", [])
        )
    
    if not shared_with_cro:
        raise HTTPException(status_code=403, detail="This protocol is not shared with your organization")
    
    return convert_plandefinition_to_protocol(plan_definition)

@app.get("/protocols/{protocol_id}/tests")
def get_protocol_tests(protocol_id: str):
    """Get all stability tests associated with a protocol."""
    logger.info(f"Getting tests for protocol ID: {protocol_id}")
    
    # First, verify protocol is shared with this CRO
    try:
        protocol = get_protocol(protocol_id)
        logger.info(f"Successfully retrieved protocol {protocol_id} with title: {protocol.title}")
    except Exception as e:
        logger.error(f"Error retrieving protocol {protocol_id}: {str(e)}")
        raise
    
    # Fetch actual stability tests (ActivityDefinitions) that reference this protocol
    try:
        response = fetch_fhir_resource("ActivityDefinition")
        logger.info(f"Fetched ActivityDefinitions, total entries: {len(response.get('entry', []))}")
    except Exception as e:
        logger.error(f"Error fetching ActivityDefinitions: {str(e)}")
        raise
    
    tests = []
    if response and response.get("entry"):
        for entry in response.get("entry", []):
            test_definition = entry["resource"]
            test_id = test_definition.get("id", "unknown")
            
            # Check if this test references our protocol
            protocol_reference_found = False
            if "extension" in test_definition:
                for ext in test_definition["extension"]:
                    if ext.get("url") == "http://example.org/fhir/StructureDefinition/stability-test-protocol":
                        ref = ext.get("valueReference", {}).get("reference", "")
                        if ref == f"PlanDefinition/{protocol_id}":
                            protocol_reference_found = True
                            logger.info(f"Found matching test {test_id} for protocol {protocol_id}")
                            break
            
            if protocol_reference_found:
                # Extract parameters from extension
                parameters = {}
                if "extension" in test_definition:
                    for ext in test_definition["extension"]:
                        if ext.get("url") == "http://example.org/fhir/StructureDefinition/stability-test-parameters":
                            try:
                                if "valueString" in ext:
                                    parameters = json.loads(ext["valueString"])
                            except json.JSONDecodeError:
                                logger.warning(f"Failed to parse test parameters for test {test_id}")
                
                # Extract acceptance criteria from extension
                criteria = {}
                if "extension" in test_definition:
                    for ext in test_definition["extension"]:
                        if ext.get("url") == "http://example.org/fhir/StructureDefinition/stability-test-acceptance-criteria":
                            try:
                                if "valueString" in ext:
                                    criteria = json.loads(ext["valueString"])
                            except json.JSONDecodeError:
                                logger.warning(f"Failed to parse acceptance criteria for test {test_id}")
                
                # Extract test type
                test_type = "Unknown"
                if "topic" in test_definition and test_definition["topic"]:
                    for topic in test_definition["topic"]:
                        if "coding" in topic and topic["coding"]:
                            for coding in topic["coding"]:
                                if coding.get("system") == "http://example.org/fhir/stability-test-types":
                                    test_type = coding.get("code", "Unknown")
                
                # Create test object
                test = {
                    "id": test_id,
                    "title": test_definition.get("title", "Unknown Test"),
                    "description": test_definition.get("description", ""),
                    "type": test_type,
                    "parameters": parameters,
                    "acceptance_criteria": criteria
                }
                tests.append(test)
    
    logger.info(f"Found {len(tests)} test definitions referencing protocol {protocol_id}")
    
    # If no stability tests found, fall back to protocol timepoints as before
    if not tests and protocol.action:
        logger.info(f"No stability tests found, falling back to protocol timepoints")
        
        # Track unique IDs to avoid duplicates
        used_ids = set()
        test_id_counter = 1
        
        for condition_index, condition in enumerate(protocol.action):
            # Generate condition ID if not present
            condition_id = condition.get("id", f"condition-{condition_index}")
            
            # Add condition as a test
            test = {
                "id": condition_id,
                "title": condition.get("title", f"Test {condition_id}"),
                "description": condition.get("description", ""),
                "type": "protocol_test"
            }
            tests.append(test)
            used_ids.add(condition_id)
            logger.info(f"Added protocol test: {condition_id}")
            
            # Get nested timepoints
            if "action" in condition:
                for timepoint_index, timepoint in enumerate(condition["action"]):
                    # Generate a unique ID for timepoint if not present
                    timepoint_id = timepoint.get("id")
                    if not timepoint_id or timepoint_id in used_ids:
                        timepoint_id = f"timepoint-{condition_id}-{timepoint_index}"
                        # If still duplicated, use counter
                        if timepoint_id in used_ids:
                            timepoint_id = f"timepoint-{test_id_counter}"
                            test_id_counter += 1
                    
                    used_ids.add(timepoint_id)
                    
                    # Extract timing value and unit from timingTiming if available
                    timing_value = None
                    timing_unit = None
                    
                    if "timingTiming" in timepoint and timepoint["timingTiming"]:
                        if "repeat" in timepoint["timingTiming"] and "boundsDuration" in timepoint["timingTiming"]["repeat"]:
                            bounds = timepoint["timingTiming"]["repeat"]["boundsDuration"]
                            timing_value = bounds.get("value")
                            timing_unit = bounds.get("unit")
                    
                    # Create descriptive title if needed
                    timepoint_title = timepoint.get("title")
                    if not timepoint_title and timing_value is not None and timing_unit:
                        timepoint_title = f"{timing_value} {timing_unit}"
                    elif not timepoint_title:
                        timepoint_title = f"Timepoint {timepoint_index+1}"
                    
                    # Create the test/timepoint object
                    test = {
                        "id": timepoint_id,
                        "title": timepoint_title,
                        "description": timepoint.get("description", ""),
                        "type": "protocol_timepoint",
                        "condition_id": condition_id  # Track parent condition
                    }
                    
                    # Add timing information
                    if "timingTiming" in timepoint:
                        test["timing"] = timepoint["timingTiming"]
                    elif timing_value is not None and timing_unit:
                        # Create timing structure if we have extracted values
                        test["timing"] = {
                            "repeat": {
                                "boundsDuration": {
                                    "value": timing_value,
                                    "unit": timing_unit,
                                    "system": "http://unitsofmeasure.org"
                                }
                            }
                        }
                    
                    tests.append(test)
                    logger.info(f"Added protocol timepoint: {timepoint_id} ({timepoint_title})")
    
    logger.info(f"Returning total of {len(tests)} tests for protocol {protocol_id}")
    return tests

# Batch endpoints
@app.get("/batches", response_model=List[Batch])
def get_batches(protocol_id: Optional[str] = None):
    """Get batches shared with the CRO, optionally filtered by protocol."""
    logger.info(f"Looking for batches{' for protocol '+protocol_id if protocol_id else ''}")
    
    # Get all devices first
    try:
        response = fetch_fhir_resource("Device")
        logger.info(f"Fetched Device resources, total entries: {len(response.get('entry', []))}")
    except Exception as e:
        logger.error(f"Error fetching Device resources: {str(e)}")
        raise
    
    batches = []
    if response and response.get("entry"):
        for entry in response.get("entry", []):
            device = entry["resource"]
            device_id = device.get("id", "unknown")
            device_protocol_id = None
            
            # Extract protocol ID from extension
            if "extension" in device:
                for ext in device["extension"]:
                    if ext.get("url") == "http://example.org/fhir/StructureDefinition/batch-protocol":
                        if ext.get("valueReference", {}).get("reference", "").startswith("PlanDefinition/"):
                            device_protocol_id = ext.get("valueReference", {}).get("reference", "").split("/")[1]
                            logger.debug(f"Found protocol ID {device_protocol_id} in batch {device_id} extension")
                            break
            
            # Extract protocol ID from identifier
            if not device_protocol_id and "identifier" in device:
                for ident in device["identifier"]:
                    if ident.get("system") == "http://example.org/fhir/identifier/protocol":
                        device_protocol_id = ident.get("value")
                        logger.debug(f"Found protocol ID {device_protocol_id} in batch {device_id} identifier")
                        break
            
            # Check if this batch is shared with the CRO
            shared_with_cro = False
            
            # Check meta tags
            if "meta" in device and "tag" in device["meta"]:
                for tag in device["meta"]["tag"]:
                    if tag.get("system") == "http://example.org/fhir/tags" and tag.get("code") == "shared-batch":
                        shared_with_cro = True
                        logger.debug(f"Batch {device_id} is shared via meta tags")
                        break
            
            # Check extension
            if not shared_with_cro and "extension" in device:
                shared_with_cro = any(
                    ext.get("url") in [
                        "http://example.org/fhir/StructureDefinition/shared-with-cro",
                        "http://example.org/fhir/StructureDefinition/shared-with-organizations"
                    ]
                    for ext in device.get("extension", [])
                )
                if shared_with_cro:
                    logger.debug(f"Batch {device_id} is shared via extension")
            
            # Include batch if shared and matches protocol filter (if provided)
            if shared_with_cro:
                if not protocol_id or device_protocol_id == protocol_id:
                    logger.info(f"Adding batch {device_id} to results (protocol ID: {device_protocol_id})")
                    batches.append(convert_device_to_batch(device))
                else:
                    logger.debug(f"Skipping batch {device_id} as it doesn't match protocol filter {protocol_id}")
            else:
                logger.debug(f"Skipping batch {device_id} as it's not shared with this CRO")
    
    logger.info(f"Returning {len(batches)} batches{' for protocol '+protocol_id if protocol_id else ''}")
    return batches

@app.get("/batches/{batch_id}", response_model=Batch)
def get_batch(batch_id: str):
    """Get a specific batch by ID."""
    device = fetch_fhir_resource("Device", batch_id)
    
    # Check if this batch is shared with the CRO
    shared_with_cro = False
    
    # Check meta tags
    if "meta" in device and "tag" in device["meta"]:
        for tag in device["meta"]["tag"]:
            if tag.get("system") == "http://example.org/fhir/tags" and tag.get("code") == "shared-batch":
                shared_with_cro = True
                break
    
    # Check extension
    if not shared_with_cro and "extension" in device:
        shared_with_cro = any(
            ext.get("url") in [
                "http://example.org/fhir/StructureDefinition/shared-with-cro",
                "http://example.org/fhir/StructureDefinition/shared-with-organizations"
            ]
            for ext in device.get("extension", [])
        )
    
    if not shared_with_cro:
        raise HTTPException(status_code=403, detail="This batch is not shared with your organization")
    
    return convert_device_to_batch(device)

# Test Results endpoints (full CRUD)
@app.get("/results", response_model=List[TestResult])
def get_test_results(batch_id: Optional[str] = None, test_id: Optional[str] = None):
    """Get all test results created by this CRO, with optional filters."""
    # Build query parameters
    params = {
        "_count": 100,
        "category": "stability-test"
    }
    
    if batch_id:
        params["device"] = batch_id
    
    if test_id:
        params["code"] = test_id
    
    # Query for results
    response = fetch_fhir_resource("Observation", params=params)
    
    results = []
    for entry in response.get("entry", []):
        observation = entry["resource"]
        results.append(convert_observation_to_test_result(observation))
    
    return results

@app.post("/results")
async def create_test_result(test_result: TestResult):
    """Create a new test result."""
    # Verify the batch exists and is shared with the CRO (if batch_id is provided)
    if test_result.batch_id:
        try:
            batch = get_batch(test_result.batch_id)
        except HTTPException:
            raise HTTPException(status_code=400, detail="Invalid batch ID or batch not shared with your organization")
    
    # Extract ActivityDefinition ID if present in test_definition_id
    activity_definition_id = None
    if test_result.test_definition_id:
        # If it doesn't have a prefix, it's just an ID
        if not test_result.test_definition_id.startswith("ActivityDefinition/"):
            activity_definition_id = test_result.test_definition_id
        else:
            # Extract the ID part
            activity_definition_id = test_result.test_definition_id.split("/")[1]
    
    # Convert to FHIR Observation
    observation = convert_test_result_to_observation(test_result)
    
    # Add category for easier querying
    observation["category"] = [
        {
            "coding": [
                {
                    "system": "http://example.org/fhir/observation-categories",
                    "code": "stability-test"
                }
            ]
        }
    ]
    
    # Add direct reference to the test definition (ActivityDefinition)
    if activity_definition_id:
        # Use proper FHIR referencing
        #observation["basedOn"] = [
        #    {
        ##        "reference": f"ActivityDefinition/{activity_definition_id}"
         #   }
        #]
        
        # Also add to code for better querying
        observation["code"] = {
            "coding": [
                {
                    "system": "http://example.org/fhir/stability-tests",
                    "code": activity_definition_id
                }
            ],
            "text": activity_definition_id
        }
    else:
        # Add code for protocol-defined test/timepoint
        observation["code"] = {
            "text": test_result.test_definition_id
        }
    
    # Create the resource
    result = create_fhir_resource("Observation", observation)
    
    # Prepare the response data
    response_data = {
        "id": result["id"],
        "fhir_server_response": None
    }
    
    # If share_with_sponsor is True, forward to sponsor
    if test_result.share_with_sponsor:
        # Forward with sponsor_id to ensure it goes to the right organization
        logger.info(f"Forwarding result to sponsor_id: {test_result.sponsor_id}")
        fhir_response = await forward_result_to_sponsor(result, sponsor_id=test_result.sponsor_id)
        
        # Store the FHIR server response in our response
        response_data["fhir_server_response"] = fhir_response
    
    # Return the created test result with FHIR server response
    test_result.id = result["id"]
    
    # Create a custom response that includes both the test result and the FHIR server response
    return {
        "test_result": test_result.dict(),
        "fhir_response": response_data["fhir_server_response"]
    }

@app.get("/results/{result_id}", response_model=TestResult)
def get_test_result(result_id: str):
    """Get a specific test result by ID."""
    observation = fetch_fhir_resource("Observation", result_id)
    return convert_observation_to_test_result(observation)

@app.put("/results/{result_id}", response_model=TestResult)
def update_test_result(result_id: str, test_result: TestResult):
    """Update a test result."""
    # Verify result exists
    existing_result = get_test_result(result_id)
    
    # Check if it's already shared with sponsor
    if existing_result.share_with_sponsor:
        raise HTTPException(status_code=403, detail="Cannot update a result that has been shared with the sponsor")
    
    # Convert to FHIR Observation
    observation = convert_test_result_to_observation(test_result)
    observation["id"] = result_id
    
    # Add category for easier querying
    observation["category"] = [
        {
            "coding": [
                {
                    "system": "http://example.org/fhir/observation-categories",
                    "code": "stability-test"
                }
            ]
        }
    ]
    
    # Update the resource
    updated = update_fhir_resource("Observation", result_id, observation)
    
    # If share_with_sponsor is True, forward to sponsor
    if test_result.share_with_sponsor and not existing_result.share_with_sponsor:
        forward_result_to_sponsor(updated)
    
    # Return the updated test result
    test_result.id = result_id
    return test_result

# Organization endpoints
@app.get("/organizations", response_model=List[Organization])
def get_organizations():
    """Get all organizations."""
    # Fetch all Organization resources
    response = fetch_fhir_resource("Organization")
    
    organizations = []
    if response and response.get("entry"):
        for entry in response.get("entry", []):
            org = entry["resource"]
            organizations.append(convert_fhir_organization_to_model(org))
    
    return organizations

@app.post("/organizations", response_model=Organization)
def create_organization(organization: Organization):
    """Create a new organization."""
    # Convert to FHIR Organization
    fhir_organization = convert_organization_to_fhir(organization)
    
    # Create in FHIR server
    result = create_fhir_resource("Organization", fhir_organization)
    
    # Return the created organization
    organization.id = result["id"]
    return organization

@app.get("/organizations/{org_id}", response_model=Organization)
def get_organization(org_id: str):
    """Get a specific organization."""
    org = fetch_fhir_resource("Organization", org_id)
    return convert_fhir_organization_to_model(org)

@app.put("/organizations/{org_id}", response_model=Organization)
def update_organization(org_id: str, organization: Organization):
    """Update an organization."""
    # First, get the existing organization
    existing_org = fetch_fhir_resource("Organization", org_id)
    
    # Update with our model data
    fhir_organization = convert_organization_to_fhir(organization)
    fhir_organization["id"] = org_id
    
    # Update in FHIR server
    result = update_fhir_resource("Organization", org_id, fhir_organization)
    
    # Return the updated organization
    organization.id = org_id
    return organization

@app.delete("/organizations/{org_id}")
def delete_organization(org_id: str):
    """Delete an organization."""
    # Verify it exists
    org = fetch_fhir_resource("Organization", org_id)
    
    # Delete from FHIR server - this might not be fully supported by all FHIR servers
    # Alternative: Set active=false
    try:
        response = requests.delete(
            f"{FHIR_SERVER_URL}/Organization/{org_id}",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        return {"message": f"Organization {org_id} deleted successfully"}
    except Exception as e:
        # If delete fails, try to mark as inactive
        try:
            org["active"] = False
            update_fhir_resource("Organization", org_id, org)
            return {"message": f"Organization {org_id} marked as inactive"}
        except:
            raise HTTPException(status_code=500, detail=f"Failed to delete organization: {str(e)}")

@app.post("/results/{result_id}/share")
def share_test_result(result_id: str, share_request: ShareResultRequest):
    """Share a test result with the sponsor."""
    # Verify result exists
    existing_result = get_test_result(result_id)
    
    # Check if it's already shared with sponsor
    if existing_result.share_with_sponsor:
        return {"message": "Result already shared with sponsor"}
    
    # Get the FHIR resource
    observation = fetch_fhir_resource("Observation", result_id)
    
    # Update sharing flag
    if "extension" not in observation:
        observation["extension"] = []
    
    # Remove any existing share flag
    observation["extension"] = [ext for ext in observation["extension"] 
                              if ext.get("url") != "http://example.org/fhir/StructureDefinition/shared-with-sponsor"]
    
    # Add new share flag
    observation["extension"].append({
        "url": "http://example.org/fhir/StructureDefinition/shared-with-sponsor",
        "valueBoolean": True
    })
    
    # Add sharing notes if provided
    if share_request.notes:
        if "note" not in observation:
            observation["note"] = []
        
        observation["note"].append({
            "text": f"Sharing notes: {share_request.notes}"
        })
    
    # If finalize is requested, update status to 'completed'
    if share_request.finalize and observation.get("status") != "completed":
        observation["status"] = "completed"
    
    # Update the resource
    updated = update_fhir_resource("Observation", result_id, observation)
    
    # Forward to sponsor
    forwarded = forward_result_to_sponsor(updated)
    
    return {
        "message": "Result shared with sponsor successfully",
        "forwarded": forwarded
    }

@app.delete("/results/{result_id}")
def delete_test_result(result_id: str):
    """Delete a test result."""
    # Verify result exists
    existing_result = get_test_result(result_id)
    
    # Check if it's already shared with sponsor
    if existing_result.share_with_sponsor:
        raise HTTPException(status_code=403, detail="Cannot delete a result that has been shared with the sponsor")
    
    # Delete the resource
    delete_fhir_resource("Observation", result_id)
    
    return {"detail": "Test result deleted successfully"}

# Sponsor integration endpoints
@app.get("/sponsor/protocols")
def get_sponsor_protocols():
    """Get protocols shared by the sponsor."""
    return get_protocols()

@app.get("/sponsor/protocols/{protocol_id}/batches")
def get_sponsor_protocol_batches(protocol_id: str):
    """Get batches shared by the sponsor for a specific protocol."""
    logger.info(f"Getting batches for sponsor protocol ID: {protocol_id}")
    try:
        # First try regular endpoint
        regular_batches = get_batches(protocol_id=protocol_id)
        if regular_batches:
            logger.info(f"Retrieved {len(regular_batches)} regular batches for protocol {protocol_id}")
            return regular_batches
        
        # If no regular batches found, search the FHIR server directly for sponsor-shared batches
        logger.info(f"No regular batches found, searching FHIR server directly for protocol {protocol_id}")
        try:
            # Build specific query for devices with protocol reference
            params = {
                "_count": 100,
                "_include": "PlanDefinition:extension"
            }
            
            # Search for devices with the protocol reference
            response = fetch_fhir_resource("Device", params=params)
            
            protocol_batches = []
            if response and response.get("entry"):
                for entry in response.get("entry", []):
                    if "resource" in entry and entry["resource"].get("resourceType") == "Device":
                        device = entry["resource"]
                        device_id = device.get("id", "unknown")
                        
                        # Look for protocol reference in extensions
                        device_protocol_id = None
                        if "extension" in device:
                            for ext in device["extension"]:
                                if ext.get("url") == "http://example.org/fhir/StructureDefinition/batch-protocol":
                                    ref = ext.get("valueReference", {}).get("reference", "")
                                    if ref and ref.startswith("PlanDefinition/"):
                                        device_protocol_id = ref.split("/")[1]
                                        logger.info(f"Found protocol reference {device_protocol_id} in device {device_id}")
                                        break
                        
                        # Also check identifiers for protocol reference
                        if not device_protocol_id and "identifier" in device:
                            for ident in device["identifier"]:
                                if ident.get("system") == "http://example.org/fhir/identifier/protocol":
                                    device_protocol_id = ident.get("value")
                                    logger.info(f"Found protocol identifier {device_protocol_id} in device {device_id}")
                                    break
                        
                        # Check for shared tag
                        is_shared = False
                        if "meta" in device and "tag" in device["meta"]:
                            is_shared = any(tag.get("code") == "shared-batch" for tag in device["meta"]["tag"])
                        
                        # If protocol matches and is shared, add to results
                        if device_protocol_id == protocol_id or protocol_id == "*":
                            logger.info(f"Adding shared device {device_id} for protocol {protocol_id}")
                            protocol_batches.append(convert_device_to_batch(device))
            
            logger.info(f"Retrieved {len(protocol_batches)} sponsor-shared batches for protocol {protocol_id}")
            return protocol_batches
        
        except Exception as search_error:
            logger.error(f"Error during direct FHIR search: {str(search_error)}")
            return []
    
    except Exception as e:
        logger.error(f"Error retrieving batches for protocol {protocol_id}: {str(e)}")
        return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)