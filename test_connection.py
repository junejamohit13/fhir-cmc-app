import requests
import time
import json
import traceback

FHIR_SERVER_URL = "http://localhost:8082/fhir"
BACKEND_URL = "http://localhost:8002"

def test_fhir_connection():
    """Test connection to FHIR server"""
    print("Testing connection to FHIR server...")
    max_retries = 5
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            response = requests.get(
                f"{FHIR_SERVER_URL}/metadata",
                headers={"Accept": "application/fhir+json"},
                timeout=5
            )
            response.raise_for_status()
            print(f"Success! Connected to FHIR server. Status code: {response.status_code}")
            return True
        except requests.RequestException as e:
            print(f"Failed to connect to FHIR server (attempt {retry_count + 1}/{max_retries}): {str(e)}")
            retry_count += 1
            if retry_count < max_retries:
                print(f"Retrying in 5 seconds...")
                time.sleep(5)
            else:
                print("Max retries reached. Unable to connect to FHIR server.")
                return False

def test_direct_fhir_batch():
    """Test creating a batch directly using the FHIR server"""
    print("\nTesting batch creation directly using FHIR API...")
    try:
        # This is the proper structure according to FHIR standards, but using extension for MedicinalProductDefinition
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
                "text": "Test Batch with Proper Structure"
            },
            "status": "active",
            "identifier": [
                {
                    "system": "http://example.org/batch-identifiers",
                    "value": "TEST-BATCH-FHIR-DIRECT"
                }
            ],
            "batch": {
                "lotNumber": "LOT-123",
                "expirationDate": "2026-05-15",
                "extension": [
                    {
                        "url": "http://example.org/fhir/StructureDefinition/manufacturing-date",
                        "valueDateTime": "2025-05-15"
                    }
                ]
            },
            "extension": [
                {
                    "url": "http://example.org/fhir/StructureDefinition/medicinal-product",
                    "valueReference": {
                        "reference": "MedicinalProductDefinition/1",
                        "display": "Medicinal Product Definition"
                    }
                }
            ]
        }
        
        response = requests.post(
            f"{FHIR_SERVER_URL}/Medication",
            json=batch_data,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            },
            timeout=10
        )
        
        print(f"Response status: {response.status_code}")
        print("Response body:")
        try:
            print(json.dumps(response.json(), indent=2))
        except:
            print(response.text)
            
        return response.status_code == 200 or response.status_code == 201
    except Exception as e:
        print(f"Failed to create batch directly with FHIR server: {str(e)}")
        traceback.print_exc()
        return False

def test_create_batch():
    """Test creating a batch directly using the API"""
    print("\nTesting batch creation via API...")
    try:
        batch_data = {
            "name": "Test Batch with Proper Structure",
            "identifier": "TEST-BATCH-FHIR",
            "status": "active",
            "lot_number": "LOT-123",
            "manufacturing_date": "2025-05-15",
            "expiry_date": "2026-05-15",
            "medicinal_product_id": "1"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/batches",
            json=batch_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Response status: {response.status_code}")
        print("Response body:")
        try:
            print(json.dumps(response.json(), indent=2))
        except:
            print(response.text)
            
        return response.status_code == 200 or response.status_code == 201
    except Exception as e:
        print(f"Failed to create batch: {str(e)}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Starting tests...")
    fhir_ok = test_fhir_connection()
    print(f"FHIR connection test result: {fhir_ok}")
    
    # Run tests regardless of connection test
    direct_result = test_direct_fhir_batch()
    print(f"Direct FHIR batch test result: {direct_result}")
    
    api_result = test_create_batch()
    print(f"API batch test result: {api_result}")
    
    print("All tests completed.") 