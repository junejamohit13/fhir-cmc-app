from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import requests
import os
import json
from datetime import datetime
import uuid
app = FastAPI(title="Protocol Management API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# FHIR Server Configuration
FHIR_SERVER_URL = os.environ.get("FHIR_SERVER_URL", "http://localhost:8082/fhir")
# Port that this server is running on (for self-references)
SPONSOR_SERVER_URL = os.environ.get("SPONSOR_SERVER_URL", "http://localhost:8002")

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
    # Reference to medicinal product
    medicinal_product_id: Optional[str] = None

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
    medicinal_product_id: Optional[str] = None

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
    protocol_id: Optional[str] = None
    medicinal_product_id: Optional[str] = None
    lot_number: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    status: str = "active"
    
class TestResultCreate(BaseModel):
    test_id: str
    batch_id: str
    organization_id: str
    observation_definition_id: Optional[str] = None  # Link to test definition
    value: Any
    unit: Optional[str] = None
    result_date: str
    status: str = "completed"
    comments: Optional[str] = None

class MedicinalProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "active"
    identifier: str
    product_type: str = "drug"  # drug, device, etc.
    route_of_administration: Optional[List[str]] = None
    manufacturer_id: Optional[str] = None

class ObservationDefinitionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    code: str  # Code identifying the test
    code_display: Optional[str] = None
    category: Optional[str] = None  # e.g., "laboratory"
    permitted_data_type: str  # Quantity, CodeableConcept, string, boolean, etc.
    unit: Optional[str] = None
    reference_range: Optional[Dict[str, Any]] = None  # Min, max, etc.
    protocol_id: Optional[str] = None  # Link to protocol
    timepoint_id: Optional[str] = None  # Link to specific timepoint in protocol

class SpecimenDefinitionCreate(BaseModel):
    """Model for creating specimen definitions"""
    title: str
    description: Optional[str] = None
    type_code: str  # e.g., "stability-sample"
    type_display: Optional[str] = None
    container_type: Optional[str] = None  # e.g., "Plastic vial"
    container_material: Optional[str] = None
    minimum_volume: Optional[float] = None
    minimum_volume_unit: Optional[str] = None  # e.g., "mL"
    temperature: Optional[float] = None
    temperature_unit: Optional[str] = "C"  # Default to Celsius
    temperature_qualifier: Optional[str] = None  # e.g., "Room Temperature (25°C)"
    protocol_id: Optional[str] = None  # Link to protocol

class EnhancedTestDefinitionCreate(BaseModel):
    """Model for creating tests with the full FHIR hierarchy"""
    # Basic ActivityDefinition fields
    title: str
    description: str
    kind: str = "Task"  # Most stability tests are represented as tasks to perform
    status: str = "active"
    
    # Test specifics
    test_type: str  # e.g. Assay, Degradation, etc.
    test_subtype: Optional[str] = None  # e.g. Degs1, Mean, etc.
    protocol_id: str  # The PlanDefinition this test belongs to
    timepoint: Optional[str] = None  # e.g., "0-months", "3-months", etc.
    
    # Parameters and criteria
    parameters: Optional[Dict[str, Any]] = None  # Additional test parameters
    acceptance_criteria: Optional[Dict[str, Any]] = None  # Test acceptance criteria
    
    # Related resources - these will be created if provided
    observation_definitions: Optional[List[ObservationDefinitionCreate]] = None
    specimen_definition: Optional[SpecimenDefinitionCreate] = None

@app.get("/")
def read_root():
    return {"message": "Protocol Management API is running"}

@app.get("/protocols")
async def get_protocols():
    """Get all protocols (PlanDefinition resources)"""
    try:
        response = requests.get(
            f"{FHIR_SERVER_URL}/PlanDefinition",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch protocols: {str(e)}")

@app.get("/protocols/{protocol_id}")
async def get_protocol(protocol_id: str):
    """Get a specific protocol by ID"""
    try:
        response = requests.get(
            f"{FHIR_SERVER_URL}/PlanDefinition/{protocol_id}",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        if e.response and e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Protocol with ID {protocol_id} not found")
        raise HTTPException(status_code=500, detail=f"Failed to fetch protocol: {str(e)}")

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
        if "medicinal_product_id" in protocol_data:
            medicinal_product_id = protocol_data["medicinal_product_id"]
            del protocol_data["medicinal_product_id"]
            
            # Add medicinal product reference using extension instead of subject field
            # subject field is getting stripped by FHIR server validation
            if medicinal_product_id:
                protocol_data["extension"].append({
                    "url": "http://example.org/fhir/StructureDefinition/medicinal-product",
                    "valueReference": {
                        "reference": f"MedicinalProductDefinition/{medicinal_product_id}"
                    }
                })
                
                # Set the subjectReference field according to FHIR spec
                protocol_data["subjectReference"] = {
                    "reference": f"MedicinalProductDefinition/{medicinal_product_id}"
                }
        
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
        print(f"protocol_data is:{protocol_data}")
        response = requests.post(
            f"{FHIR_SERVER_URL}/PlanDefinition",
            json=protocol_data,
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
        
        # Handle medicinal product reference update
        if "medicinal_product_id" in update_data:
            medicinal_product_id = update_data.pop("medicinal_product_id")
            if medicinal_product_id:
                # Add medicinal product reference using extension
                # Check if we already have a medicinal product extension
                has_extension = False
                for i, ext in enumerate(existing_protocol.get("extension", [])):
                    if ext.get("url") == "http://example.org/fhir/StructureDefinition/medicinal-product":
                        # Update existing extension
                        existing_protocol["extension"][i] = {
                            "url": "http://example.org/fhir/StructureDefinition/medicinal-product",
                            "valueReference": {
                                "reference": f"MedicinalProductDefinition/{medicinal_product_id}"
                            }
                        }
                        has_extension = True
                        break
                
                if not has_extension:
                    # Add new extension
                    existing_protocol.setdefault("extension", []).append({
                        "url": "http://example.org/fhir/StructureDefinition/medicinal-product",
                        "valueReference": {
                            "reference": f"MedicinalProductDefinition/{medicinal_product_id}"
                        }
                    })
                
                # Set the subjectReference field according to FHIR spec
                existing_protocol["subjectReference"] = {
                    "reference": f"MedicinalProductDefinition/{medicinal_product_id}"
                }
            else:
                # Remove the medicinal product reference if it exists
                existing_protocol["extension"] = [
                    ext for ext in existing_protocol.get("extension", []) 
                    if ext.get("url") != "http://example.org/fhir/StructureDefinition/medicinal-product"
                ]
                
                # Remove the subjectReference if it exists
                if "subjectReference" in existing_protocol:
                    del existing_protocol["subjectReference"]
        
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
        try:
            # Try to get organizations directly
            response = requests.get(
                f"{FHIR_SERVER_URL}/Organization",
                headers={"Accept": "application/fhir+json"}
            )
            response.raise_for_status()
            response_data = response.json()
            
            # Ensure the response is a proper Bundle with entry array
            if response_data.get("resourceType") == "Bundle":
                # Forcibly add an empty entry array if it's missing
                if "entry" not in response_data or response_data["entry"] is None:
                    response_data["entry"] = []
            
            return response_data
        except requests.RequestException as inner_e:
            # If the request fails, check if it's due to version mismatch
            print(f"Error fetching organizations: {str(inner_e)}")
            
            # Return an empty bundle to avoid breaking the frontend
            empty_bundle = {
                "resourceType": "Bundle",
                "type": "searchset",
                "total": 0,
                "entry": []
            }
            
            # Add required metadata fields
            empty_bundle["id"] = str(uuid.uuid4())
            empty_bundle["meta"] = {"lastUpdated": datetime.now().isoformat()}
            empty_bundle["link"] = [{"relation": "self", "url": f"{FHIR_SERVER_URL}/Organization"}]
            
            return empty_bundle
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch organizations: {str(e)}")

@app.post("/organizations")
async def create_organization(organization: OrganizationCreate):
    """Create a new organization using FHIR Organization resource"""
    try:
        # Validate URL format
        url = organization.url.strip()
        if not url:
            raise HTTPException(status_code=400, detail="FHIR server URL is required")
        
        # Attempt to normalize the URL format
        if not (url.startswith('http://') or url.startswith('https://')):
            url = 'http://' + url  # Add default scheme if missing
            
        organization_data = {
            "resourceType": "Organization",
            "name": organization.name,
            "active": True,
            # Store all data in extensions for consistency
            "extension": [
                {
                    "url": "http://example.org/fhir/StructureDefinition/organization-api-key",
                    "valueString": organization.api_key or ""
                },
                {
                    "url": "http://example.org/fhir/StructureDefinition/organization-type",
                    "valueString": organization.organization_type or "sponsor"
                },
                {
                    "url": "http://example.org/fhir/StructureDefinition/organization-url",
                    "valueString": url
                }
            ]
        }
        
        # Log the request for debugging
        print(f"Creating organization: {organization.name} with URL: {url}")
        print(f"Organization data: {organization_data}")
        
        response = requests.post(
            f"{FHIR_SERVER_URL}/Organization",
            json=organization_data,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        created_org = response.json()
        
        # Verify that URL extension was correctly saved
        extension_url_found = False
        
        if "extension" in created_org and created_org["extension"]:
            for ext in created_org["extension"]:
                if ext.get("url") == "http://example.org/fhir/StructureDefinition/organization-url" and ext.get("valueString") == url:
                    extension_url_found = True
                    print(f"Verified URL in extension: {ext.get('valueString')}")
                    break
        
        # If URL extension is missing, update the organization
        if not extension_url_found:
            print(f"URL extension missing, updating organization to add it")
            try:
                # Prepare the data for update
                if "extension" not in created_org:
                    created_org["extension"] = []
                    
                # Add URL extension
                created_org["extension"].append({
                    "url": "http://example.org/fhir/StructureDefinition/organization-url",
                    "valueString": url
                })
                
                # Update the organization
                update_response = requests.put(
                    f"{FHIR_SERVER_URL}/Organization/{created_org['id']}",
                    json=created_org,
                    headers={
                        "Content-Type": "application/fhir+json",
                        "Accept": "application/fhir+json"
                    }
                )
                
                if update_response.status_code >= 200 and update_response.status_code < 300:
                    created_org = update_response.json()
                    print(f"Successfully updated organization {created_org['id']} with URL extension")
                else:
                    print(f"Warning: Failed to update organization with URL extension: {update_response.status_code}")
            except Exception as update_error:
                print(f"Error updating organization with URL extension: {str(update_error)}")
            
        return created_org
    except requests.RequestException as e:
        error_message = str(e)
        if hasattr(e, 'response') and e.response:
            try:
                error_detail = e.response.json()
                error_message = json.dumps(error_detail)
            except:
                error_message = e.response.text
        
        print(f"Error creating organization: {error_message}")
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
        org_data = response.json()
        
        # Check if telecom array exists and contains URL
        url_found = False
        if "telecom" in org_data and org_data["telecom"]:
            for telecom in org_data["telecom"]:
                if telecom.get("system") == "url":
                    url_found = True
                    print(f"Found URL for org {org_id}: {telecom.get('value')}")
                    break
        
        # If no telecom array or URL not found, try to find the URL in extensions
        # This is a workaround for organizations that may be missing the telecom array
        if not url_found:
            print(f"Warning: No URL found in telecom for organization {org_id}")
            
            # Look in extensions for a URL
            url_value = None
            for ext in org_data.get("extension", []):
                if ext.get("url") == "http://example.org/fhir/StructureDefinition/organization-url":
                    url_value = ext.get("valueString")
                    break
            
            # If we found a URL in extensions, add it to telecom
            if url_value:
                print(f"Found URL in extension: {url_value}")
                if "telecom" not in org_data:
                    org_data["telecom"] = []
                
                org_data["telecom"].append({
                    "system": "url",
                    "value": url_value,
                    "use": "work"
                })
                
                # Try to update the organization with the telecom data
                try:
                    update_response = requests.put(
                        f"{FHIR_SERVER_URL}/Organization/{org_id}",
                        json=org_data,
                        headers={
                            "Content-Type": "application/fhir+json",
                            "Accept": "application/fhir+json"
                        }
                    )
                    if update_response.status_code >= 200 and update_response.status_code < 300:
                        org_data = update_response.json()
                        print(f"Successfully added telecom data to organization {org_id}")
                    else:
                        print(f"Failed to update organization with telecom data: {update_response.status_code}")
                except Exception as update_error:
                    print(f"Error updating organization with telecom data: {str(update_error)}")
        
        return org_data
    except requests.RequestException as e:
        if e.response and e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Organization with ID {org_id} not found")
        raise HTTPException(status_code=500, detail=f"Failed to fetch organization: {str(e)}")

@app.put("/organizations/{org_id}")
async def update_organization(org_id: str, organization: OrganizationCreate):
    """Update an organization"""
    try:
        # Validate URL format
        url = organization.url.strip()
        if not url:
            raise HTTPException(status_code=400, detail="FHIR server URL is required")
            
        # Attempt to normalize the URL format
        if not (url.startswith('http://') or url.startswith('https://')):
            url = 'http://' + url  # Add default scheme if missing
            
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
        
        # Ensure extension array exists
        if "extension" not in existing_org or existing_org["extension"] is None:
            existing_org["extension"] = []
            
        # Update or add URL in extension array
        url_extension_found = False
        api_key_updated = False
        org_type_updated = False
        
        for ext in existing_org["extension"]:
            if ext.get("url") == "http://example.org/fhir/StructureDefinition/organization-url":
                ext["valueString"] = url
                url_extension_found = True
            elif ext.get("url") == "http://example.org/fhir/StructureDefinition/organization-api-key":
                ext["valueString"] = organization.api_key or ""
                api_key_updated = True
            elif ext.get("url") == "http://example.org/fhir/StructureDefinition/organization-type":
                ext["valueString"] = organization.organization_type or "sponsor"
                org_type_updated = True
        
        # Add any missing extensions
        if not url_extension_found:
            existing_org["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/organization-url",
                "valueString": url
            })
            
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
        
        # Log update for debugging
        print(f"Updating organization {org_id}: {organization.name} with URL: {url}")
        
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
        updated_org = response.json()
        
        # Verify the URL is present in the extension
        extension_url_found = False
        
        if "extension" in updated_org and updated_org["extension"]:
            for ext in updated_org["extension"]:
                if ext.get("url") == "http://example.org/fhir/StructureDefinition/organization-url" and ext.get("valueString") == url:
                    extension_url_found = True
                    break
                    
        print(f"After update - URL found in extension: {extension_url_found}")
        
        return updated_org
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
            
        print(f"Error updating organization: {error_message}")
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
                        f"{FHIR_SERVER_URL}/Medication/{batch_id}",
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
                    
                    # Add proper medication code for stability batches
                    batch["extension"].append({
                        "url": "http://example.org/fhir/StructureDefinition/medication-type",
                        "valueString": "stability-batch"
                    })
                    
                    # Update the batch
                    batch_update_response = requests.put(
                        f"{FHIR_SERVER_URL}/Medication/{batch_id}",
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
                    
                    # Debug the organization data
                    print(f"DEBUG - Organization {org_id} data: {json.dumps(org)}")
                    
                    # Extract URL directly from extension
                    url = None
                    if "extension" in org and org.get("extension"):
                        print(f"DEBUG - Found {len(org.get('extension'))} extensions")
                        for ext in org.get("extension", []):
                            print(f"DEBUG - Extension: {json.dumps(ext)}")
                            if ext.get("url") == "http://example.org/fhir/StructureDefinition/organization-url":
                                url = ext.get("valueString")
                                print(f"DEBUG - Found URL in extension: {url}")
                                break
                    else:
                        print(f"DEBUG - No extensions found in organization {org_id}")
                    
                    # Log what we found
                    if url:
                        print(f"DEBUG - Using URL for org {org_id}: {url}")
                    else:
                        print(f"DEBUG - No URL found for org {org_id} in extension")
                    
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
                                # Use the original protocol ID
                                protocol_logical_id = protocol_id
                                
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
                                        
                                        if is_for_protocol:
                                            # Create a copy of the test
                                            external_test = test.copy()
                                            
                                            # Update the protocol reference to use the logical ID
                                            for ext_idx, ext in enumerate(external_test.get("extension", [])):
                                                if ext.get("url") == "http://example.org/fhir/StructureDefinition/stability-test-protocol":
                                                    # Replace the reference with the logical ID
                                                    external_test["extension"][ext_idx]["valueReference"]["reference"] = f"PlanDefinition/{protocol_logical_id}"
                                                    break
                                            else:
                                                # Add the protocol reference if it doesn't exist
                                                if "extension" not in external_test:
                                                    external_test["extension"] = []
                                                external_test["extension"].append({
                                                    "url": "http://example.org/fhir/StructureDefinition/stability-test-protocol",
                                                    "valueReference": {
                                                        "reference": f"PlanDefinition/{protocol_logical_id}"
                                                    }
                                                })
                                            
                                            # Add test to bundle entries
                                            associated_tests.append({
                                                "fullUrl": f"ActivityDefinition/{test_id}",
                                                "resource": external_test,
                                                "request": {
                                                    "method": "PUT",  # Use PUT to preserve IDs
                                                    "url": f"ActivityDefinition/{test_id}"
                                                }
                                            })
                                
                                # Now check if we need to include batches
                                associated_batches = []
                                
                                # If batches are being shared, include them in the bundle
                                if (hasattr(share_request, 'shareBatches') and 
                                    share_request.shareBatches and 
                                    hasattr(share_request, 'selectedBatches') and
                                    share_request.selectedBatches):
                                    
                                    print(f"DEBUG - Processing {len(share_request.selectedBatches)} batches for sharing")
                                    
                                    for batch_id in share_request.selectedBatches:
                                        try:
                                            print(f"DEBUG - Fetching Medication resource for batch {batch_id}")
                                            # Get the batch
                                            batch_response = requests.get(
                                                f"{FHIR_SERVER_URL}/Medication/{batch_id}",
                                                headers={"Accept": "application/fhir+json"}
                                            )
                                            batch_response.raise_for_status()
                                            batch = batch_response.json()
                                            print(f"DEBUG - Retrieved Medication resource: {json.dumps(batch)}")
                                            
                                            # Create a copy for the external server
                                            external_batch = batch.copy()
                                            
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
                                                
                                            # Add proper medication code for stability batches
                                            external_batch["code"] = {
                                                "coding": [
                                                    {
                                                        "system": "http://example.org/fhir/medication-types",
                                                        "code": "stability-batch"
                                                    }
                                                ],
                                                "text": external_batch.get("code", {}).get("text", "Stability Test Batch")
                                            }
                                            
                                            # Update the protocol reference to use the logical ID
                                            for ext_idx, ext in enumerate(external_batch.get("extension", [])):
                                                if ext.get("url") == "http://example.org/fhir/StructureDefinition/batch-protocol":
                                                    # Replace the reference with the logical ID
                                                    external_batch["extension"][ext_idx]["valueReference"]["reference"] = f"PlanDefinition/{protocol_logical_id}"
                                                    break
                                            else:
                                                # Add the protocol reference if it doesn't exist
                                                external_batch["extension"].append({
                                                    "url": "http://example.org/fhir/StructureDefinition/batch-protocol",
                                                    "valueReference": {
                                                        "reference": f"PlanDefinition/{protocol_logical_id}"
                                                    }
                                                })
                                            
                                            # Add batch to bundle entries
                                            associated_batches.append({
                                                "fullUrl": f"Medication/{batch_id}",
                                                "resource": external_batch,
                                                "request": {
                                                    "method": "PUT",  # Use PUT to preserve IDs
                                                    "url": f"Medication/{batch_id}"
                                                }
                                            })
                                            print(f"DEBUG - Added Medication resource to bundle entries")
                                        except Exception as batch_error:
                                            print(f"Error processing batch {batch_id} for sharing: {str(batch_error)}")
                                
                                # Create the bundle with all resources
                                bundle = {
                                    "resourceType": "Bundle",
                                    "type": "transaction",
                                    "entry": [
                                        {
                                            "fullUrl": f"PlanDefinition/{protocol_logical_id}",
                                            "resource": external_protocol,
                                            "request": {
                                                "method": "PUT",  # Use PUT to preserve IDs
                                                "url": f"PlanDefinition/{protocol_logical_id}"
                                            }
                                        }
                                    ] + associated_tests + associated_batches
                                }
                                
                                print(f"DEBUG - Bundle contents:")
                                print(f"- 1 PlanDefinition")
                                print(f"- {len(associated_tests)} ActivityDefinitions")
                                print(f"- {len(associated_batches)} Medication resources")
                                print(f"DEBUG - Bundle entries: {json.dumps([entry['fullUrl'] for entry in bundle['entry']])}")
                                
                                # Add all referenced resources to the bundle
                                referenced_resources = set()
                                
                                # Helper function to add referenced resources
                                async def add_referenced_resource(reference, resource_type):
                                    if not reference or not reference.startswith(f"{resource_type}/"):
                                        return
                                    
                                    resource_id = reference.split("/")[1]
                                    if resource_id in referenced_resources:
                                        return
                                    
                                    try:
                                        print(f"DEBUG - Fetching referenced {resource_type} {resource_id}")
                                        response = requests.get(
                                            f"{FHIR_SERVER_URL}/{resource_type}/{resource_id}",
                                            headers={"Accept": "application/fhir+json"}
                                        )
                                        response.raise_for_status()
                                        resource = response.json()
                                        
                                        # Add to bundle
                                        bundle["entry"].append({
                                            "fullUrl": f"{resource_type}/{resource_id}",
                                            "resource": resource,
                                            "request": {
                                                "method": "PUT",
                                                "url": f"{resource_type}/{resource_id}"
                                            }
                                        })
                                        referenced_resources.add(resource_id)
                                        print(f"DEBUG - Added {resource_type} {resource_id} to bundle")
                                    except Exception as e:
                                        print(f"Error fetching referenced {resource_type} {resource_id}: {str(e)}")
                                
                                # Add MedicinalProductDefinition from PlanDefinition
                                if "subjectReference" in external_protocol and "reference" in external_protocol["subjectReference"]:
                                    await add_referenced_resource(external_protocol["subjectReference"]["reference"], "MedicinalProductDefinition")
                                
                                # Add Organization from PlanDefinition's shared organizations extension
                                for ext in external_protocol.get("extension", []):
                                    if ext.get("url") == "http://example.org/fhir/StructureDefinition/plan-definition-shared-organizations":
                                        for org_ext in ext.get("extension", []):
                                            if "valueReference" in org_ext and "reference" in org_ext["valueReference"]:
                                                await add_referenced_resource(org_ext["valueReference"]["reference"], "Organization")
                                
                                # Add all referenced resources from ActivityDefinitions
                                for test_entry in associated_tests:
                                    test = test_entry["resource"]
                                    for ext in test.get("extension", []):
                                        if ext.get("url") == "http://example.org/fhir/StructureDefinition/observation-definitions":
                                            for obs_ext in ext.get("extension", []):
                                                if "valueReference" in obs_ext and "reference" in obs_ext["valueReference"]:
                                                    await add_referenced_resource(obs_ext["valueReference"]["reference"], "ObservationDefinition")
                                        elif ext.get("url") == "http://example.org/fhir/StructureDefinition/specimen-definition":
                                            if "valueReference" in ext and "reference" in ext["valueReference"]:
                                                await add_referenced_resource(ext["valueReference"]["reference"], "SpecimenDefinition")
                                
                                print(f"DEBUG - Bundle contents:")
                                print(f"- 1 PlanDefinition")
                                print(f"- {len(associated_tests)} ActivityDefinitions")
                                print(f"- {len(associated_batches)} Medication resources")
                                print(f"- {len(referenced_resources)} referenced resources")
                                print(f"DEBUG - Bundle entries: {json.dumps([entry['fullUrl'] for entry in bundle['entry']])}")
                                
                                # Send the bundle to the external server
                                print(f"Pushing bundle with protocol, {len(associated_tests)} test definitions, {len(associated_batches)} batches, and {len(referenced_resources)} referenced resources to {url}")
                                
                                # Prepare headers
                                headers = {
                                    "Content-Type": "application/fhir+json",
                                    "Accept": "application/fhir+json"
                                }
                                
                                # Add API key if provided
                                if api_key:
                                    headers["Authorization"] = f"Bearer {api_key}"
                                
                                # Check if this is a CRO backend URL or a direct FHIR server URL
                                target_url = url
                                
                                # If URL is for a CRO FHIR server, check if we should use their middleware endpoint instead
                                if "/fhir" in url:
                                    # Try to see if there's a middleware endpoint available
                                    cro_backend_url = url.replace("/fhir", "/sponsor/shared-resources")
                                    print(f"Attempting to use CRO middleware endpoint: {cro_backend_url}")
                                    target_url = cro_backend_url
                                  
                                # For Docker connectivity, replace localhost with container names if needed
                                if "localhost:8001" in target_url:
                                    docker_url = target_url.replace("localhost:8001", "cro-backend:8000")
                                    print(f"Replacing {target_url} with Docker network URL: {docker_url}")
                                    target_url = docker_url
                                elif "localhost:8081" in target_url:
                                    docker_url = target_url.replace("localhost:8081", "cro-fhir-server:8080")
                                    print(f"Replacing {target_url} with Docker network URL: {docker_url}")
                                    target_url = docker_url
                                print(f"bundle: {bundle}")
                                bundle_response = requests.post(
                                    target_url,  # Use middleware endpoint if available
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
                                    
                                    # Include both the original URL and target URL if different
                                    endpoint_message = f" to {url}"
                                    if target_url != url:
                                        endpoint_message = f" to {url} via middleware {target_url}"
                                    
                                    success_message = " and ".join(message_parts) + endpoint_message
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
                    
                    # Extract URL from extension
                    url = ""
                    for ext in org.get("extension", []):
                        if ext.get("url") == "http://example.org/fhir/StructureDefinition/organization-url":
                            url = ext.get("valueString", "")
                            if url:
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

@app.post("/enhanced-tests")
async def create_enhanced_test(test: EnhancedTestDefinitionCreate):
    """
    Create a new stability test using the full FHIR resource hierarchy:
    - ActivityDefinition: the main test definition
    - ObservationDefinition(s): defines what measurements to take
    - SpecimenDefinition: defines what samples are needed
    
    This endpoint creates all resources and links them together.
    """
    try:
        print(f"Creating enhanced test with data: {test.dict(exclude_none=True)}")
        created_resources = {}
        
        # Step 1: Create ObservationDefinition resources if provided
        observation_refs = []
        if test.observation_definitions:
            for obs_def in test.observation_definitions:
                # Create each observation definition
                obs_def_with_protocol = obs_def.copy()
                if not obs_def_with_protocol.protocol_id:
                    obs_def_with_protocol.protocol_id = test.protocol_id
                
                try:
                    obs_response = await create_observation_definition(obs_def_with_protocol)
                    obs_id = obs_response.get("id")
                    if obs_id:
                        observation_refs.append({
                            "reference": f"ObservationDefinition/{obs_id}",
                            "display": obs_def.title
                        })
                        created_resources[f"ObservationDefinition/{obs_id}"] = obs_response
                except Exception as obs_error:
                    print(f"Error creating ObservationDefinition: {str(obs_error)}")
                    # Continue with other definitions
            
            print(f"Created {len(observation_refs)} ObservationDefinition resources")
        
        # Step 2: Create SpecimenDefinition if provided
        specimen_ref = None
        if test.specimen_definition:
            specimen_def = test.specimen_definition.copy()
            if not specimen_def.protocol_id:
                specimen_def.protocol_id = test.protocol_id
                
            try:
                specimen_response = await create_specimen_definition(specimen_def)
                specimen_id = specimen_response.get("id")
                if specimen_id:
                    specimen_ref = {
                        "reference": f"SpecimenDefinition/{specimen_id}",
                        "display": specimen_def.title
                    }
                    created_resources[f"SpecimenDefinition/{specimen_id}"] = specimen_response
                    print(f"Created SpecimenDefinition with id: {specimen_id}")
            except Exception as specimen_error:
                print(f"Error creating SpecimenDefinition: {str(specimen_error)}")
                # Continue without specimen definition
        
        # Step 3: Create the main ActivityDefinition (test definition)
        activity_data = {
            "resourceType": "ActivityDefinition",
            "name": test.title.replace(" ", "_").lower(),
            "title": test.title,
            "status": test.status,
            "description": test.description,
            "kind": test.kind,
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
            activity_data["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/stability-test-subtype",
                "valueString": test.test_subtype
            })
        
        # Add timepoint if provided
        if test.timepoint:
            activity_data["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/stability-test-timepoint",
                "valueString": test.timepoint
            })
            
            # Remove redundant timing information from ActivityDefinition
            # The timing should only be in the PlanDefinition, not duplicated here
            
        # Add parameters if provided
        if test.parameters:
            activity_data["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/stability-test-parameters",
                "valueString": json.dumps(test.parameters)
            })
            
        # Add acceptance criteria if provided
        if test.acceptance_criteria:
            activity_data["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/stability-test-acceptance-criteria",
                "valueString": json.dumps(test.acceptance_criteria)
            })
        
        # Add links to ObservationDefinitions using extensions instead of observationResultRequirement
        if observation_refs:
            activity_data["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/observation-definitions",
                "extension": [
                    {
                        "url": "reference",
                        "valueReference": ref
                    } for ref in observation_refs
                ]
            })
        
        # Add link to SpecimenDefinition using extension instead of specimenRequirement
        if specimen_ref:
            activity_data["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/specimen-definition",
                "valueReference": specimen_ref
            })
        
        # Create the ActivityDefinition
        activity_response = requests.post(
            f"{FHIR_SERVER_URL}/ActivityDefinition",
            json=activity_data,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        activity_response.raise_for_status()
        activity_result = activity_response.json()
        activity_id = activity_result.get("id")
        
        if activity_id:
            created_resources[f"ActivityDefinition/{activity_id}"] = activity_result
            print(f"Created ActivityDefinition with id: {activity_id}")
        
        # Step 4: Update the PlanDefinition to include this test in its actions if needed
        try:
            protocol_response = requests.get(
                f"{FHIR_SERVER_URL}/PlanDefinition/{test.protocol_id}",
                headers={"Accept": "application/fhir+json"}
            )
            protocol_response.raise_for_status()
            protocol = protocol_response.json()
            
            # Check if we need to add this as an action
            actions = protocol.get("action", [])
            action_exists = False
            
            for action in actions:
                # Check if this action references our new ActivityDefinition
                def_canonical = action.get("definitionCanonical")
                if def_canonical and def_canonical == f"ActivityDefinition/{activity_id}":
                    action_exists = True
                    break
                    
                # Also check for timepoint match if provided
                if test.timepoint and action.get("title") == test.timepoint:
                    # If we're adding to an existing timepoint action, see if we need to add our test
                    action_actions = action.get("action", [])
                    for sub_action in action_actions:
                        if sub_action.get("definitionCanonical") == f"ActivityDefinition/{activity_id}":
                            action_exists = True
                            break
            
            if not action_exists and activity_id:
                if test.timepoint:
                    # Try to find a matching timepoint action to add this to
                    timepoint_action = None
                    for i, action in enumerate(actions):
                        if action.get("title") == test.timepoint:
                            timepoint_action = action
                            timepoint_idx = i
                            break
                    
                    if timepoint_action:
                        # Add this test to the existing timepoint action
                        if "action" not in timepoint_action:
                            timepoint_action["action"] = []
                            
                        timepoint_action["action"].append({
                            "title": test.title,
                            "definitionCanonical": f"ActivityDefinition/{activity_id}"
                        })
                        
                        # Update the action in the protocol
                        protocol["action"][timepoint_idx] = timepoint_action
                    else:
                        # Create a new timepoint action with this test
                        protocol["action"].append({
                            "title": test.timepoint,
                            "timingTiming": {
                                "repeat": {
                                    "boundsDuration": {
                                        "value": int(test.timepoint.split("-")[0]) if "-" in test.timepoint else 0,
                                        "unit": "months"
                                    }
                                }
                            },
                            "action": [
                                {
                                    "title": test.title,
                                    "definitionCanonical": f"ActivityDefinition/{activity_id}"
                                }
                            ]
                        })
                else:
                    # Add as a top-level action
                    protocol["action"].append({
                        "title": test.title,
                        "definitionCanonical": f"ActivityDefinition/{activity_id}"
                    })
                
                # Update the protocol
                update_response = requests.put(
                    f"{FHIR_SERVER_URL}/PlanDefinition/{test.protocol_id}",
                    json=protocol,
                    headers={
                        "Content-Type": "application/fhir+json",
                        "Accept": "application/fhir+json"
                    }
                )
                update_response.raise_for_status()
                created_resources[f"PlanDefinition/{test.protocol_id}"] = "updated to include test"
                print(f"Updated PlanDefinition/{test.protocol_id} to include the new test")
        except Exception as protocol_error:
            print(f"Warning: Failed to update protocol with test action: {str(protocol_error)}")
            # Continue without updating protocol
        
        # Return a summary of all created resources
        return {
            "test_id": activity_id,
            "resources_created": len(created_resources),
            "resources": created_resources
        }
        
    except Exception as e:
        error_message = str(e)
        print(f"Error creating enhanced test: {error_message}")
        if hasattr(e, 'response') and e.response:
            try:
                error_detail = e.response.json()
                error_message = json.dumps(error_detail)
            except:
                error_message = e.response.text
        
        raise HTTPException(status_code=500, detail=f"Failed to create enhanced test: {error_message}")

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
    """Create a new test batch using FHIR Medication resource"""
    try:
        # Convert to FHIR Medication with proper structure
        batch_data = {
            "resourceType": "Medication",
            "code": {
                "coding": [
                    {
                        "system": "http://example.org/stability-batches",
                        "code": "stability-batch",
                        "display": "Stability Test Batch"
                    }
                ],
                "text": batch.name
            },
            "status": batch.status,
            "identifier": [
                {
                    "system": "http://example.org/batch-identifiers",
                    "value": batch.identifier
                }
            ],
            "batch": {
                "lotNumber": batch.lot_number,
                "expirationDate": batch.expiry_date,
                "extension": []
            },
            "extension": []
        }
        
        # Add manufacturing date as extension in batch
        if batch.manufacturing_date:
            batch_data["batch"]["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/manufacturing-date",
                "valueDateTime": batch.manufacturing_date
            })
        
        # Add reference to medicinal product if provided
        if batch.medicinal_product_id:
            # Use extension for MedicinalProductDefinition reference
            batch_data["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/medicinal-product",
                "valueReference": {
                    "reference": f"MedicinalProductDefinition/{batch.medicinal_product_id}",
                    "display": "Medicinal Product Definition"
                }
            })
        
        response = requests.post(
            f"{FHIR_SERVER_URL}/Medication",
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
    """Get all batches (Medication resources), optionally filtered by protocol ID"""
    try:
        if protocol_id:
            # First, get the protocol to find its medicinal product
            medicinal_product_id = None
            try:
                protocol_response = requests.get(
                    f"{FHIR_SERVER_URL}/PlanDefinition/{protocol_id}",
                    headers={"Accept": "application/fhir+json"}
                )
                protocol_response.raise_for_status()
                protocol = protocol_response.json()
                
                # Check if protocol has a subject reference to medicinal product
                if "subjectReference" in protocol and "reference" in protocol["subjectReference"]:
                    ref = protocol["subjectReference"]["reference"]
                    if ref.startswith("MedicinalProductDefinition/"):
                        medicinal_product_id = ref.split("/")[1]
                        print(f"Found medicinal product ID in protocol: {medicinal_product_id}")
            except Exception as e:
                print(f"Error getting protocol medicinal product: {str(e)}")
            
            # Get all Medications
            response = requests.get(
                f"{FHIR_SERVER_URL}/Medication",
                headers={"Accept": "application/fhir+json"}
            )
            response.raise_for_status()
            all_medications = response.json()
            
            # Filter medications by medicinal_product_id or direct protocol reference
            if all_medications and all_medications.get("resourceType") == "Bundle" and all_medications.get("entry"):
                filtered_entries = []
                
                for entry in all_medications["entry"]:
                    medication = entry.get("resource", {})
                    include_entry = False
                    
                    # First check for direct protocol reference (backward compatibility)
                    for ext in medication.get("extension", []):
                        if ext.get("url") == "http://example.org/fhir/StructureDefinition/batch-protocol":
                            if ext.get("valueReference", {}).get("reference") == f"PlanDefinition/{protocol_id}":
                                include_entry = True
                                break
                    
                    # If not included yet and we have a medicinal product ID, check for that
                    if not include_entry and medicinal_product_id:
                        # Check medicinal product reference in extensions
                        for ext in medication.get("extension", []):
                            if ext.get("url") == "http://example.org/fhir/StructureDefinition/medicinal-product":
                                if ext.get("valueReference", {}).get("reference") == f"MedicinalProductDefinition/{medicinal_product_id}":
                                    include_entry = True
                                    break
                        
                        # Also check ingredient references
                        if not include_entry and "ingredient" in medication:
                            for ingredient in medication["ingredient"]:
                                if "itemReference" in ingredient and ingredient["itemReference"].get("reference") == f"MedicinalProductDefinition/{medicinal_product_id}":
                                    include_entry = True
                                    break
                    
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
            
            return all_medications
        else:
            # Get all Medications without filtering
            response = requests.get(
                f"{FHIR_SERVER_URL}/Medication",
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
            f"{FHIR_SERVER_URL}/Medication/{batch_id}",
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
        print(f"Creating test result with data: {result.dict()}")
        
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
            "subject": {
                "reference": f"Medication/{result.batch_id}"
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
        
        print(f"Converted to FHIR Observation: {json.dumps(result_data, indent=2)}")
        
        # Link to ObservationDefinition if provided
        if result.observation_definition_id:
            result_data["hasMember"] = [
                {
                    "reference": f"ObservationDefinition/{result.observation_definition_id}"
                }
            ]
            
            # Also add as a specific extension
            result_data["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/observation-definition-reference",
                "valueReference": {
                    "reference": f"ObservationDefinition/{result.observation_definition_id}"
                }
            })
        
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
        
        print(f"Sending request to FHIR server: {FHIR_SERVER_URL}/Observation")
        response = requests.post(
            f"{FHIR_SERVER_URL}/Observation",
            json=result_data,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        
        if response.status_code >= 400:
            print(f"FHIR server error response: {response.status_code}")
            print(f"Error details: {response.text}")
            response.raise_for_status()
            
        print(f"Successfully created test result with ID: {response.json().get('id')}")
        return response.json()
    except requests.RequestException as e:
        error_message = str(e)
        if hasattr(e, 'response') and e.response:
            try:
                error_detail = e.response.json()
                error_message = json.dumps(error_detail)
                print(f"FHIR server error response: {error_message}")
            except:
                error_message = e.response.text
                print(f"FHIR server error response (text): {error_message}")
        
        print(f"Failed to create test result: {error_message}")
        raise HTTPException(status_code=500, detail=f"Failed to create test result: {error_message}")
    except Exception as e:
        print(f"Unexpected error creating test result: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create test result: {str(e)}")

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
            # 'subject' is the appropriate search parameter for Observation when referencing a Medication
            query_params.append(f"subject=Medication/{batch_id}")
        
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
            query_params["subject"] = f"Medication/{batch_id}"
        
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
                "batch_id": observation.get("subject", {}).get("reference", "").replace("Medication/", ""),
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
                            f"{FHIR_SERVER_URL}/Medication/{batch_id}",
                            headers={"Accept": "application/fhir+json"}
                        )
                        if batch_response.status_code == 200:
                            batch = batch_response.json()
                            # Check extensions for protocol reference
                            for ext in batch.get("extension", []):
                                if ext.get("url") == "http://example.org/fhir/StructureDefinition/batch-protocol" and ext.get("valueReference", {}).get("reference") == f"PlanDefinition/{protocol_id}":
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

# Medicinal Product endpoints
@app.post("/medicinal-products")
async def create_medicinal_product(product: MedicinalProductCreate):
    """Create a new medicinal product using FHIR MedicinalProductDefinition resource"""
    try:
        # Convert to FHIR MedicinalProductDefinition
        product_data = {
            "resourceType": "MedicinalProductDefinition",
            "status": product.status,
            "name": [
                {
                    "productName": product.name
                }
            ],
            "description": product.description,
            "identifier": [
                {
                    "system": "http://example.org/medicinal-product-identifiers",
                    "value": product.identifier
                }
            ],
            "type": {
                "coding": [
                    {
                        "system": "http://example.org/medicinal-product-types",
                        "code": product.product_type
                    }
                ]
            }
        }
        
        # Add route of administration if provided
        if product.route_of_administration and len(product.route_of_administration) > 0:
            product_data["route"] = []
            for route in product.route_of_administration:
                product_data["route"].append({
                    "coding": [
                        {
                            "system": "http://example.org/route-of-administration",
                            "code": route
                        }
                    ]
                })
        
        # Add manufacturer reference if provided
        if product.manufacturer_id:
            product_data["manufacturer"] = [
                {
                    "reference": f"Organization/{product.manufacturer_id}"
                }
            ]
        
        response = requests.post(
            f"{FHIR_SERVER_URL}/MedicinalProductDefinition",
            json=product_data,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        
        # Return the created medicinal product
        return response.json()
    except requests.RequestException as e:
        error_message = str(e)
        if hasattr(e, 'response') and e.response:
            try:
                error_detail = e.response.json()
                error_message = json.dumps(error_detail)
            except:
                error_message = e.response.text
        
        raise HTTPException(status_code=500, detail=f"Failed to create medicinal product: {error_message}")

@app.get("/medicinal-products")
async def get_medicinal_products():
    """Get all medicinal products"""
    try:
        response = requests.get(
            f"{FHIR_SERVER_URL}/MedicinalProductDefinition",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        response_data = response.json()
        
        # Ensure the response is a proper Bundle with entry array
        if response_data.get("resourceType") == "Bundle":
            # Forcibly add an empty entry array if it's missing
            if "entry" not in response_data or response_data["entry"] is None:
                response_data["entry"] = []
        
        return response_data
    except requests.RequestException as e:
        # Create an empty bundle with proper structure
        empty_bundle = {
            "resourceType": "Bundle",
            "type": "searchset",
            "total": 0,
            "entry": []
        }
        
        # Add required metadata fields
        empty_bundle["id"] = str(uuid.uuid4())
        empty_bundle["meta"] = {"lastUpdated": datetime.now().isoformat()}
        empty_bundle["link"] = [{"relation": "self", "url": f"{FHIR_SERVER_URL}/MedicinalProductDefinition"}]
        
        # Log the error but return an empty bundle
        print(f"Error fetching medicinal products: {str(e)}")
        return empty_bundle

@app.get("/medicinal-products/{product_id}")
async def get_medicinal_product(product_id: str):
    """Get a specific medicinal product by ID"""
    try:
        response = requests.get(
            f"{FHIR_SERVER_URL}/MedicinalProductDefinition/{product_id}",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        if e.response and e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Medicinal product with ID {product_id} not found")
        raise HTTPException(status_code=500, detail=f"Failed to fetch medicinal product: {str(e)}")

# ObservationDefinition endpoints
@app.post("/observation-definitions")
async def create_observation_definition(observation_def: ObservationDefinitionCreate):
    """Create a new test definition using FHIR ObservationDefinition resource"""
    try:
        # Convert to FHIR ObservationDefinition
        obs_def_data = {
            "resourceType": "ObservationDefinition",
            "status": "active",
            "code": {
                "coding": [
                    {
                        "system": "http://example.org/stability-tests",
                        "code": observation_def.code,
                        "display": observation_def.code_display or observation_def.title
                    }
                ],
                "text": observation_def.title
            },
            "permittedDataType": [observation_def.permitted_data_type],
        }
        
        # Add description if provided
        if observation_def.description:
            obs_def_data["description"] = observation_def.description
            
        # Add category if provided
        if observation_def.category:
            obs_def_data["category"] = [
                {
                    "coding": [
                        {
                            "system": "http://example.org/stability-test-categories",
                            "code": observation_def.category
                        }
                    ]
                }
            ]
        
        # Add reference range if provided
        if observation_def.reference_range:
            obs_def_data["qualifiedInterval"] = [
                {
                    "category": "reference",
                    "range": {
                        "low": observation_def.reference_range.get("low"),
                        "high": observation_def.reference_range.get("high")
                    }
                }
            ]
        
        # Add unit if provided
        if observation_def.unit:
            obs_def_data["quantitativeDetails"] = {
                "unit": {
                    "coding": [
                        {
                            "system": "http://unitsofmeasure.org",
                            "code": observation_def.unit
                        }
                    ],
                    "text": observation_def.unit
                }
            }
        
        # Add extensions for protocol and timepoint links
        obs_def_data["extension"] = []
        
        if observation_def.protocol_id:
            obs_def_data["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/protocol-reference",
                "valueReference": {
                    "reference": f"PlanDefinition/{observation_def.protocol_id}"
                }
            })
            
        if observation_def.timepoint_id:
            obs_def_data["extension"].append({
                "url": "http://example.org/fhir/StructureDefinition/timepoint-reference",
                "valueString": observation_def.timepoint_id
            })
        
        response = requests.post(
            f"{FHIR_SERVER_URL}/ObservationDefinition",
            json=obs_def_data,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        
        # Return the created observation definition
        return response.json()
    except requests.RequestException as e:
        error_message = str(e)
        if hasattr(e, 'response') and e.response:
            try:
                error_detail = e.response.json()
                error_message = json.dumps(error_detail)
            except:
                error_message = e.response.text
        
        raise HTTPException(status_code=500, detail=f"Failed to create observation definition: {error_message}")

@app.get("/observation-definitions")
async def get_observation_definitions(protocol_id: Optional[str] = None):
    """Get all observation definitions, optionally filtered by protocol ID"""
    try:
        # Get all definitions first
        response = requests.get(
            f"{FHIR_SERVER_URL}/ObservationDefinition",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        all_defs = response.json()
        
        # If protocol_id is provided, filter by protocol reference
        if protocol_id and all_defs and all_defs.get("resourceType") == "Bundle" and all_defs.get("entry"):
            filtered_entries = []
            
            for entry in all_defs["entry"]:
                obs_def = entry.get("resource", {})
                
                # Check for protocol reference in extensions
                for ext in obs_def.get("extension", []):
                    if ext.get("url") == "http://example.org/fhir/StructureDefinition/protocol-reference":
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
        
        return all_defs
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch observation definitions: {str(e)}")

@app.get("/observation-definitions/{obs_def_id}")
async def get_observation_definition(obs_def_id: str):
    """Get a specific observation definition by ID"""
    try:
        response = requests.get(
            f"{FHIR_SERVER_URL}/ObservationDefinition/{obs_def_id}",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        if e.response and e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Observation definition with ID {obs_def_id} not found")
        raise HTTPException(status_code=500, detail=f"Failed to fetch observation definition: {str(e)}")

# SpecimenDefinition endpoints
@app.post("/specimen-definitions")
async def create_specimen_definition(specimen_def: SpecimenDefinitionCreate):
    """Create a new specimen definition using FHIR SpecimenDefinition resource"""
    try:
        # Convert to FHIR SpecimenDefinition
        specimen_data = {
            "resourceType": "SpecimenDefinition",
            "status": "active",
            "typeCollected": {
                "coding": [
                    {
                        "system": "http://example.org/specimen-types",
                        "code": specimen_def.type_code,
                        "display": specimen_def.type_display or specimen_def.title
                    }
                ],
                "text": specimen_def.title
            },
            "typeTested": [
                {
                    "preference": "preferred",
                    "container": {
                        "material": {
                            "text": specimen_def.container_material or specimen_def.container_type or "Not specified"
                        }
                    }
                }
            ]
        }
        
        # Add description if provided
        if specimen_def.description:
            specimen_data["description"] = specimen_def.description
            
        # Add container type if provided
        if specimen_def.container_type:
            specimen_data["typeTested"][0]["container"]["type"] = {
                "text": specimen_def.container_type
            }
        
        # Add minimum volume if provided
        if specimen_def.minimum_volume and specimen_def.minimum_volume_unit:
            specimen_data["typeTested"][0]["container"]["minimumVolumeQuantity"] = {
                "value": specimen_def.minimum_volume,
                "unit": specimen_def.minimum_volume_unit
            }
        
        # Add temperature handling information if provided
        if specimen_def.temperature_qualifier or specimen_def.temperature:
            handling = {}
            
            if specimen_def.temperature_qualifier:
                handling["temperatureQualifier"] = {
                    "text": specimen_def.temperature_qualifier
                }
            
            if specimen_def.temperature:
                handling["temperatureRange"] = {
                    "low": {
                        "value": specimen_def.temperature,
                        "unit": specimen_def.temperature_unit or "C"
                    },
                    "high": {
                        "value": specimen_def.temperature,
                        "unit": specimen_def.temperature_unit or "C"
                    }
                }
            
            specimen_data["typeTested"][0]["handling"] = [handling]
        
        # Add protocol reference as extension if provided
        if specimen_def.protocol_id:
            specimen_data["extension"] = [{
                "url": "http://example.org/fhir/StructureDefinition/protocol-reference",
                "valueReference": {
                    "reference": f"PlanDefinition/{specimen_def.protocol_id}"
                }
            }]
        
        response = requests.post(
            f"{FHIR_SERVER_URL}/SpecimenDefinition",
            json=specimen_data,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        
        # Return the created specimen definition
        return response.json()
    except requests.RequestException as e:
        error_message = str(e)
        if hasattr(e, 'response') and e.response:
            try:
                error_detail = e.response.json()
                error_message = json.dumps(error_detail)
            except:
                error_message = e.response.text
        
        raise HTTPException(status_code=500, detail=f"Failed to create specimen definition: {error_message}")

@app.get("/specimen-definitions")
async def get_specimen_definitions(protocol_id: Optional[str] = None):
    """Get all specimen definitions, optionally filtered by protocol ID"""
    try:
        # Get all definitions
        response = requests.get(
            f"{FHIR_SERVER_URL}/SpecimenDefinition",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        all_defs = response.json()
        
        # If protocol_id is provided, filter by protocol reference
        if protocol_id and all_defs and all_defs.get("resourceType") == "Bundle" and all_defs.get("entry"):
            filtered_entries = []
            
            for entry in all_defs["entry"]:
                specimen_def = entry.get("resource", {})
                
                # Check for protocol reference in extensions
                for ext in specimen_def.get("extension", []):
                    if ext.get("url") == "http://example.org/fhir/StructureDefinition/protocol-reference":
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
        
        return all_defs
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch specimen definitions: {str(e)}")

@app.get("/specimen-definitions/{specimen_def_id}")
async def get_specimen_definition(specimen_def_id: str):
    """Get a specific specimen definition by ID"""
    try:
        response = requests.get(
            f"{FHIR_SERVER_URL}/SpecimenDefinition/{specimen_def_id}",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        if e.response and e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Specimen definition with ID {specimen_def_id} not found")
        raise HTTPException(status_code=500, detail=f"Failed to fetch specimen definition: {str(e)}")

async def get_observation_definitions_for_test(test_id: str):
    """Get all ObservationDefinitions linked to a specific test (ActivityDefinition)"""
    try:
        # First get the ActivityDefinition
        response = requests.get(
            f"{FHIR_SERVER_URL}/ActivityDefinition/{test_id}",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        test = response.json()
        
        # Look for our custom extension with ObservationDefinition references
        observation_refs = []
        for extension in test.get("extension", []):
            if extension.get("url") == "http://example.org/fhir/StructureDefinition/observation-definitions":
                # Extract references from nested extensions
                for nested_ext in extension.get("extension", []):
                    if nested_ext.get("url") == "reference" and nested_ext.get("valueReference"):
                        ref = nested_ext.get("valueReference").get("reference")
                        if ref and ref.startswith("ObservationDefinition/"):
                            observation_refs.append(ref.split("/")[1])
        
        if not observation_refs:
            return []
            
        # Now fetch all the referenced ObservationDefinitions
        results = []
        for obs_id in observation_refs:
            try:
                obs_response = requests.get(
                    f"{FHIR_SERVER_URL}/ObservationDefinition/{obs_id}",
                    headers={"Accept": "application/fhir+json"}
                )
                obs_response.raise_for_status()
                results.append(obs_response.json())
            except Exception as e:
                print(f"Error fetching ObservationDefinition {obs_id}: {str(e)}")
                
        return results
    except Exception as e:
        print(f"Error getting ObservationDefinitions for test {test_id}: {str(e)}")
        return []

async def get_specimen_definition_for_test(test_id: str):
    """Get the SpecimenDefinition linked to a specific test (ActivityDefinition)"""
    try:
        # First get the ActivityDefinition
        response = requests.get(
            f"{FHIR_SERVER_URL}/ActivityDefinition/{test_id}",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        test = response.json()
        
        # Look for our custom extension with SpecimenDefinition reference
        for extension in test.get("extension", []):
            if extension.get("url") == "http://example.org/fhir/StructureDefinition/specimen-definition":
                if extension.get("valueReference"):
                    ref = extension.get("valueReference").get("reference")
                    if ref and ref.startswith("SpecimenDefinition/"):
                        specimen_id = ref.split("/")[1]
                        try:
                            specimen_response = requests.get(
                                f"{FHIR_SERVER_URL}/SpecimenDefinition/{specimen_id}",
                                headers={"Accept": "application/fhir+json"}
                            )
                            specimen_response.raise_for_status()
                            return specimen_response.json()
                        except Exception as e:
                            print(f"Error fetching SpecimenDefinition {specimen_id}: {str(e)}")
        
        return None
    except Exception as e:
        print(f"Error getting SpecimenDefinition for test {test_id}: {str(e)}")
        return None

@app.get("/tests/{test_id}/observation-definitions")
async def get_test_observation_definitions(test_id: str):
    """Get all ObservationDefinitions linked to a specific test"""
    try:
        results = await get_observation_definitions_for_test(test_id)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get observation definitions: {str(e)}")

@app.get("/tests/{test_id}/specimen-definition")
async def get_test_specimen_definition(test_id: str):
    """Get the SpecimenDefinition linked to a specific test"""
    try:
        result = await get_specimen_definition_for_test(test_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"No specimen definition found for test {test_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get specimen definition: {str(e)}")

# Run with: uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)