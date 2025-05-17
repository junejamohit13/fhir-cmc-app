from fastapi import FastAPI, HTTPException
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

app = FastAPI(title="Regulator Stability Testing API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
FHIR_SERVER_URL = os.getenv("FHIR_SERVER_URL", "http://host.docker.internal:8083/fhir")

# Models
class StabilityTestResult(BaseModel):
    id: Optional[str] = None
    protocol_id: str
    batch_id: str
    test_type: str
    timepoint: str
    condition: str
    result_value: float
    unit: str
    acceptance_criteria: str
    status: str
    test_date: str
    sponsor: str
    cro: Optional[str] = None
    comments: Optional[str] = None

# Helper functions
def fetch_fhir_resource(resource_type, resource_id=None, params=None):
    """Fetch FHIR resources from the HAPI FHIR server."""
    url = f"{FHIR_SERVER_URL}/{resource_type}"
    if resource_id:
        url += f"/{resource_id}"
    
    logger.info(f"Fetching from FHIR server URL: {url}")
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
    url = f"{FHIR_SERVER_URL}/{resource_type}"
    
    logger.info(f"Creating {resource_type} resource on FHIR server URL: {url}")
    logger.info(f"Resource data: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(
            url, 
            json=data,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json",
                "Prefer": "return=representation"
            }
        )
        logger.info(f"FHIR server response status: {response.status_code}")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        error_msg = f"FHIR server error: {str(e)}"
        logger.error(error_msg)
        logger.error(f"Error occurred with URL: {url}")
        raise HTTPException(status_code=500, detail=error_msg)

# API Endpoints
@app.get("/")
def read_root():
    return {"message": "Welcome to Regulator Stability Testing API"}

@app.get("/stability-results")
def get_stability_results():
    """Get all stability test results."""
    try:
        # Fetch all Observation resources with stability-test category
        response = fetch_fhir_resource("Observation", params={
            "_count": 100,
            "category": "stability-test"
        })
        
        results = []
        if response and response.get("entry"):
            for entry in response.get("entry", []):
                observation = entry["resource"]
                
                # Extract test details from the observation
                test_type = observation.get("code", {}).get("text", "Unknown")
                timepoint = ""
                condition = ""
                sponsor = "Unknown"
                cro = "Unknown"
                
                # Extract timepoint and condition from extensions
                for ext in observation.get("extension", []):
                    if ext.get("url") == "http://example.org/fhir/StructureDefinition/protocol-timepoint":
                        timepoint = ext.get("valueString", "")
                    elif ext.get("url") == "http://example.org/fhir/StructureDefinition/test-condition":
                        condition = ext.get("valueString", "")
                    elif ext.get("url") == "http://example.org/fhir/StructureDefinition/sponsor":
                        sponsor = ext.get("valueString", "")
                    elif ext.get("url") == "http://example.org/fhir/StructureDefinition/cro":
                        cro = ext.get("valueString", "")
                
                # Get value and unit
                value = None
                unit = ""
                if "valueQuantity" in observation:
                    value = observation["valueQuantity"].get("value")
                    unit = observation["valueQuantity"].get("unit", "")
                
                # Create result object
                result = StabilityTestResult(
                    id=observation.get("id"),
                    protocol_id=observation.get("basedOn", [{}])[0].get("reference", "").replace("PlanDefinition/", ""),
                    batch_id=observation.get("subject", {}).get("reference", "").replace("Device/", ""),
                    test_type=test_type,
                    timepoint=timepoint,
                    condition=condition,
                    result_value=value if value is not None else 0.0,
                    unit=unit,
                    acceptance_criteria="Within specification",  # This would come from the test definition
                    status=observation.get("status", "unknown"),
                    test_date=observation.get("effectiveDateTime", datetime.now().isoformat()),
                    sponsor=sponsor,
                    cro=cro,
                    comments=observation.get("note", [{"text": ""}])[0].get("text", "")
                )
                
                results.append(result)
        
        return results
    except Exception as e:
        logger.error(f"Error fetching stability results: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stability-results/{result_id}")
def get_stability_result(result_id: str):
    """Get a specific stability test result."""
    try:
        observation = fetch_fhir_resource("Observation", result_id)
        
        # Extract test details from the observation
        test_type = observation.get("code", {}).get("text", "Unknown")
        timepoint = ""
        condition = ""
        sponsor = "Unknown"
        cro = "Unknown"
        
        # Extract timepoint and condition from extensions
        for ext in observation.get("extension", []):
            if ext.get("url") == "http://example.org/fhir/StructureDefinition/protocol-timepoint":
                timepoint = ext.get("valueString", "")
            elif ext.get("url") == "http://example.org/fhir/StructureDefinition/test-condition":
                condition = ext.get("valueString", "")
            elif ext.get("url") == "http://example.org/fhir/StructureDefinition/sponsor":
                sponsor = ext.get("valueString", "")
            elif ext.get("url") == "http://example.org/fhir/StructureDefinition/cro":
                cro = ext.get("valueString", "")
        
        # Get value and unit
        value = None
        unit = ""
        if "valueQuantity" in observation:
            value = observation["valueQuantity"].get("value")
            unit = observation["valueQuantity"].get("unit", "")
        
        # Create result object
        result = StabilityTestResult(
            id=observation.get("id"),
            protocol_id=observation.get("basedOn", [{}])[0].get("reference", "").replace("PlanDefinition/", ""),
            batch_id=observation.get("subject", {}).get("reference", "").replace("Device/", ""),
            test_type=test_type,
            timepoint=timepoint,
            condition=condition,
            result_value=value if value is not None else 0.0,
            unit=unit,
            acceptance_criteria="Within specification",  # This would come from the test definition
            status=observation.get("status", "unknown"),
            test_date=observation.get("effectiveDateTime", datetime.now().isoformat()),
            sponsor=sponsor,
            cro=cro,
            comments=observation.get("note", [{"text": ""}])[0].get("text", "")
        )
        
        return result
    except Exception as e:
        logger.error(f"Error fetching stability result {result_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003) 