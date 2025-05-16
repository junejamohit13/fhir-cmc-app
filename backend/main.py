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
                
                # If no subject found, look for extension with medicinal product reference
                if not medicinal_product_id:
                    for ext in protocol.get("extension", []):
                        if ext.get("url") == "http://example.org/fhir/StructureDefinition/medicinal-product":
                            if "valueReference" in ext and "reference" in ext["valueReference"]:
                                ref = ext["valueReference"]["reference"]
                                if ref.startswith("MedicinalProductDefinition/"):
                                    medicinal_product_id = ref.split("/")[1]
                                    print(f"Found medicinal product ID in extension: {medicinal_product_id}")
                                    break
            except Exception as e:
                print(f"Error getting protocol medicinal product: {str(e)}")
            
            # If we couldn't find a medicinal product ID, return empty results
            # This enforces proper FHIR PQ model where protocols must link to medicinal products
            if not medicinal_product_id:
                print("No medicinal product found for protocol, returning empty results")
                return {
                    "resourceType": "Bundle",
                    "type": "searchset",
                    "total": 0,
                    "entry": []
                }
                
            # Get all Medications
            response = requests.get(
                f"{FHIR_SERVER_URL}/Medication",
                headers={"Accept": "application/fhir+json"}
            )
            response.raise_for_status()
            all_medications = response.json()
            
            # Filter medications by medicinal_product_id
            if all_medications and all_medications.get("resourceType") == "Bundle" and all_medications.get("entry"):
                filtered_entries = []
                
                for entry in all_medications["entry"]:
                    medication = entry.get("resource", {})
                    include_entry = False
                    
                    # Check medicinal product reference in extensions
                    for ext in medication.get("extension", []):
                        if ext.get("url") == "http://example.org/fhir/StructureDefinition/medicinal-product":
                            if ext.get("valueReference", {}).get("reference") == f"MedicinalProductDefinition/{medicinal_product_id}":
                                include_entry = True
                                print(f"Found matching medicinal product in extension for batch {medication.get('id')}")
                                break
                    
                    # Also check ingredient references
                    if not include_entry and "ingredient" in medication:
                        for ingredient in medication["ingredient"]:
                            if "itemReference" in ingredient and ingredient["itemReference"].get("reference") == f"MedicinalProductDefinition/{medicinal_product_id}":
                                include_entry = True
                                print(f"Found matching medicinal product in ingredient for batch {medication.get('id')}")
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
                print(f"Returning {len(filtered_entries)} batches for medicinal product {medicinal_product_id}")
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

@app.get("/medicinal-products")
async def get_medicinal_products():
    """Get all medicinal products"""
    try:
        response = requests.get(
            f"{FHIR_SERVER_URL}/MedicinalProductDefinition",
            headers={"Accept": "application/fhir+json"}
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch medicinal products: {str(e)}")

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
        raise HTTPException(status_code=500, detail=f"Failed to fetch protocol: {str(e)}")

@app.put("/protocols/{protocol_id}/medicinal-product/{medicinal_product_id}")
async def update_protocol_medicinal_product(protocol_id: str, medicinal_product_id: str):
    """Update a protocol's medicinal product reference"""
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
        
        # Update the medicinal product reference
        if medicinal_product_id and medicinal_product_id != "none":
            # Add as subjectReference according to FHIR Pharmaceutical Quality IG
            existing_protocol["subjectReference"] = {
                "reference": f"MedicinalProductDefinition/{medicinal_product_id}"
            }
            print(f"Updating protocol {protocol_id} with medicinal product reference to {medicinal_product_id}")
        else:
            # Remove the subjectReference if medicinal_product_id is empty or "none"
            if "subjectReference" in existing_protocol:
                del existing_protocol["subjectReference"]
            print(f"Removing medicinal product reference from protocol {protocol_id}")
        
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

@app.post("/sample-batch")
async def create_sample_batch(medicinal_product_id: str, protocol_id: Optional[str] = None):
    """Create a sample batch using FHIR Medication resource"""
    try:
        # Convert to FHIR Medication
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
                "text": f"Sample Batch {datetime.now().strftime('%Y%m%d')}"
            },
            "status": "active",
            "identifier": [
                {
                    "system": "http://example.org/batch-identifiers",
                    "value": f"BATCH-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
                }
            ],
            "batch": {
                "lotNumber": f"LOT-{datetime.now().strftime('%Y%m%d')}",
                "expirationDate": (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d'),
                "extension": [
                    {
                        "url": "http://example.org/fhir/StructureDefinition/manufacturing-date",
                        "valueDateTime": datetime.now().strftime('%Y-%m-%d')
                    }
                ]
            },
            "definition": [
                {
                    "reference": f"MedicinalProductDefinition/{medicinal_product_id}",
                    "display": "Medicinal Product Definition"
                }
            ],
            # Add standard FHIR ingredient reference
            "ingredient": [
                {
                    "itemReference": {
                        "reference": f"MedicinalProductDefinition/{medicinal_product_id}"
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