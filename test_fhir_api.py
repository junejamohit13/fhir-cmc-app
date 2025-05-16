import requests
import json

# The URL of the FHIR server
FHIR_SERVER_URL = "http://localhost:8082/fhir"

def test_create_protocol_with_subject():
    """Test creating a protocol with a subject reference to a medicinal product"""
    print("Testing protocol creation with subject reference...")
    
    # Create a simple protocol
    protocol_data = {
        "resourceType": "PlanDefinition",
        "meta": {
            "profile": [
                "http://hl7.org/fhir/uv/pharm-quality/StructureDefinition/PlanDefinition-drug-pq"
            ]
        },
        "identifier": [
            {
                "system": "http://example.org/stability/protocols",
                "value": "STAB-Direct-Test"
            }
        ],
        "title": "Direct Reference Test",
        "status": "active",
        "description": "Testing direct subject reference",
        "date": "2025-05-15",
        # Standard FHIR way of referencing MedicinalProductDefinition
        "subjectReference": {
            "reference": "MedicinalProductDefinition/1"
        }
    }
    
    # Create the protocol
    try:
        response = requests.post(
            f"{FHIR_SERVER_URL}/PlanDefinition",
            json=protocol_data,
            headers={
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        protocol = response.json()
        print(f"Protocol created with ID: {protocol.get('id')}")
        
        # Get the protocol back to verify the subject was stored
        protocol_id = protocol.get("id")
        if protocol_id:
            get_response = requests.get(
                f"{FHIR_SERVER_URL}/PlanDefinition/{protocol_id}",
                headers={"Accept": "application/fhir+json"}
            )
            get_response.raise_for_status()
            retrieved_protocol = get_response.json()
            print("Retrieved protocol:")
            print(json.dumps(retrieved_protocol, indent=2))
            
            # Check if subject reference is preserved
            subject_ref = retrieved_protocol.get("subjectReference", {}).get("reference")
            if subject_ref:
                print(f"Success! Subject reference preserved: {subject_ref}")
            else:
                print("Subject reference not found in retrieved protocol")
        
    except requests.RequestException as e:
        print(f"Error: {e}")
        if hasattr(e, 'response') and e.response:
            try:
                print(f"Server response: {e.response.json()}")
            except:
                print(f"Server response: {e.response.text}")

def test_create_batch_structure():
    """Test creating a batch with proper structure (without actually posting to FHIR)"""
    print("\nTesting batch structure creation...")
    
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
            "text": "Test Batch with New Structure"
        },
        "status": "active",
        "identifier": [
            {
                "system": "http://example.org/batch-identifiers",
                "value": "TEST-BATCH-NEW"
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
        "definition": [
            {
                "reference": "MedicinalProductDefinition/1",
                "display": "Amoxicillin Oral Suspension"
            }
        ]
    }
    
    # Instead of posting to FHIR server, just show the structure
    print("This is the proper batch structure that should be sent to FHIR server:")
    print(json.dumps(batch_data, indent=2))
    
    # Mock a successful response
    mock_response = {
        "resourceType": "Medication",
        "id": "12345",
        **batch_data
    }
    
    print("\nThis is how it would look when retrieved from FHIR server:")
    print(json.dumps(mock_response, indent=2))

if __name__ == "__main__":
    test_create_protocol_with_subject()
    test_create_batch_structure() 