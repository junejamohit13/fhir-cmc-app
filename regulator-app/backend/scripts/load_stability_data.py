import requests
import json
from datetime import datetime
import sys

FHIR_SERVER_URL = "http://localhost:8083/fhir"

# 1. Create MedicinalProductDefinition (stelbat)
product = {
    "resourceType": "MedicinalProductDefinition",
    "identifier": [{
        "system": "http://example.org/medicinal-product-identifiers",
        "value": "stelbat"
    }],
    "status": "active",
    "name": [{"productName": "stelbat"}],
    "description": "stelbat medicinal product"
}

# 2. Create PlanDefinition (test-protocol)
protocol = {
    "resourceType": "PlanDefinition",
    "identifier": [{
        "system": "http://example.org/stability/protocols",
        "value": "test-protocol"
    }],
    "title": "Test Protocol",
    "status": "active",
    "description": "Test protocol for 32p81 CMC",
    "version": "1.0",
    "date": "2024-05-16",
    "extension": [
        {
            "url": "http://example.org/fhir/StructureDefinition/sponsor",
            "valueString": "default-sponsor"
        }
    ]
}

# 3. Create Medication (BATCH-001)
batch = {
    "resourceType": "Medication",
    "identifier": [{
        "system": "http://example.org/batch-identifiers",
        "value": "BATCH-001"
    }],
    "code": {
        "coding": [{
            "system": "http://example.org/stability-batches",
            "code": "stability-batch",
            "display": "Stability Test Batch"
        }],
        "text": "BATCH-001"
    },
    "status": "active",
    "batch": {
        "lotNumber": "BATCH-001",
        "expirationDate": "2025-06-01"
    }
}

# 4. Create ActivityDefinition and ObservationDefinition for each test type
test_types = [
    {"code": "appearance", "display": "Appearance", "unit": None},
    {"code": "ph", "display": "pH", "unit": None},
    {"code": "assay", "display": "Assay", "unit": "%"}
]
activity_defs = []
observation_defs = []
for test in test_types:
    activity_defs.append({
        "resourceType": "ActivityDefinition",
        "status": "active",
        "name": test["display"],
        "code": {
            "coding": [{
                "system": "http://example.org/stability-tests",
                "code": test["code"],
                "display": test["display"]
            }],
            "text": test["display"]
        }
    })
    obs_def = {
        "resourceType": "ObservationDefinition",
        "status": "active",
        "code": {
            "coding": [{
                "system": "http://example.org/stability-tests",
                "code": test["code"],
                "display": test["display"]
            }],
            "text": test["display"]
        },
        "permittedDataType": ["string" if test["code"] == "appearance" else "Quantity"],
    }
    if test["unit"]:
        obs_def["quantitativeDetails"] = {
            "unit": {
                "coding": [{
                    "system": "http://unitsofmeasure.org",
                    "code": test["unit"]
                }],
                "text": test["unit"]
            }
        }
    observation_defs.append(obs_def)

# 5. Observations (results)
results = [
    # Appearance
    {"test_type": "appearance", "timepoint": "0 months", "result_value": "Clear, colorless solution", "date": "2024-03-01"},
    {"test_type": "appearance", "timepoint": "3 months", "result_value": "Clear, colorless solution", "date": "2024-06-01"},
    # pH
    {"test_type": "ph", "timepoint": "0 months", "result_value": 6.8, "date": "2024-03-01"},
    {"test_type": "ph", "timepoint": "3 months", "result_value": 6.9, "date": "2024-06-01"},
    # Assay
    {"test_type": "assay", "timepoint": "0 months", "result_value": 98.5, "date": "2024-03-01"},
    {"test_type": "assay", "timepoint": "3 months", "result_value": 97.8, "date": "2024-06-01"},
]

# Helper to POST a resource and return its FHIR id
def post_resource(resource):
    r = requests.post(f"{FHIR_SERVER_URL}/{resource['resourceType']}", json=resource, headers={"Content-Type": "application/fhir+json"})
    r.raise_for_status()
    return r.json()["id"]

def main():
    print("Creating MedicinalProductDefinition (stelbat)...")
    product_id = post_resource(product)
    print(f"MedicinalProductDefinition ID: {product_id}")

    print("Creating PlanDefinition (test-protocol)...")
    protocol["subjectReference"] = {"reference": f"MedicinalProductDefinition/{product_id}"}
    protocol_id = post_resource(protocol)
    print(f"PlanDefinition ID: {protocol_id}")

    print("Creating Medication (BATCH-001)...")
    batch["ingredient"] = [{"itemReference": {"reference": f"MedicinalProductDefinition/{product_id}"}}]
    batch_id = post_resource(batch)
    print(f"Medication ID: {batch_id}")

    print("Creating ActivityDefinitions and ObservationDefinitions...")
    activity_ids = []
    obsdef_ids = []
    for ad, od in zip(activity_defs, observation_defs):
        ad_id = post_resource(ad)
        od_id = post_resource(od)
        activity_ids.append(ad_id)
        obsdef_ids.append(od_id)
        print(f"  ActivityDefinition {ad['name']}: {ad_id}, ObservationDefinition: {od_id}")

    print("Creating Observations...")
    for i, result in enumerate(results):
        test_idx = next(idx for idx, t in enumerate(test_types) if t["code"] == result["test_type"])
        obs = {
            "resourceType": "Observation",
            "status": "final",
            "code": {
                "coding": [{
                    "system": "http://example.org/stability-tests",
                    "code": test_types[test_idx]["code"],
                    "display": test_types[test_idx]["display"]
                }],
                "text": test_types[test_idx]["display"]
            },
            "effectiveDateTime": result["date"],
            "subject": {"reference": f"Medication/{batch_id}"},
            "extension": [
                {
                    "url": "http://example.org/fhir/StructureDefinition/test-definition",
                    "valueReference": {"reference": f"ActivityDefinition/{activity_ids[test_idx]}"}
                },
                {
                    "url": "http://example.org/fhir/StructureDefinition/protocol-reference",
                    "valueReference": {"reference": f"PlanDefinition/{protocol_id}"}
                }
            ]
        }
        if test_types[test_idx]["code"] == "appearance":
            obs["valueString"] = result["result_value"]
        else:
            obs["valueQuantity"] = {"value": result["result_value"], "unit": test_types[test_idx]["unit"] or ""}
        obs_id = post_resource(obs)
        print(f"  Observation {test_types[test_idx]['display']} at {result['timepoint']}: {obs_id}")

if __name__ == "__main__":
    main() 