import axios from 'axios';

// Use absolute URL for local development but keep original for Docker
const BASE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:8002' : 'http://localhost:8002';

// Add timeout to prevent long waits and ensure no caching
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
  timeout: 10000, // 10 second timeout to prevent long hanging requests
});

// Protocol Management APIs
export const fetchProtocols = async () => {
  try {
    console.log('Fetching fresh protocols data');
    const response = await api.get('/protocols');
    return response.data;
  } catch (error) {
    console.error('Error fetching protocols:', error);
    throw error;
  }
};

export const fetchProtocolById = async (id) => {
  try {
    const response = await api.get(`/protocols/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching protocol ${id}:`, error);
    throw error;
  }
};

export const createProtocol = async (protocolData) => {
  try {
    const response = await api.post('/protocols', protocolData);
    return response.data;
  } catch (error) {
    console.error('Error creating protocol:', error);
    throw error;
  }
};

export const updateProtocol = async (id, protocolData) => {
  try {
    const response = await api.put(`/protocols/${id}`, protocolData);
    return response.data;
  } catch (error) {
    console.error(`Error updating protocol ${id}:`, error);
    throw error;
  }
};

export const deleteProtocol = async (id) => {
  try {
    const response = await api.delete(`/protocols/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting protocol ${id}:`, error);
    throw error;
  }
};

// Organization API endpoints
export const fetchOrganizations = async () => {
  try {
    console.log('Fetching fresh organizations data');
    const response = await api.get('/organizations');
    const bundle = response.data;
    
    // FHIR returns a Bundle with entries
    if (bundle && bundle.resourceType === 'Bundle') {
      if (bundle.entry && Array.isArray(bundle.entry)) {
        const organizations = bundle.entry
          .filter(entry => entry && entry.resource)
          .map(entry => entry.resource);
        
        console.log(`Processed ${organizations.length} organizations from bundle`);
        return organizations;
      } else {
        // Return empty array for empty bundles
        console.log('Bundle has no entries or entries is not an array');
        return [];
      }
    } else if (Array.isArray(bundle)) {
      // Direct array response
      console.log(`Received array of ${bundle.length} organizations`);
      return bundle;
    } else {
      console.warn('Unexpected response format:', bundle);
      return [];
    }
  } catch (error) {
    console.error('Error fetching organizations:', error);
    throw error;
  }
};

export const fetchOrganizationById = async (id) => {
  try {
    const response = await api.get(`/organizations/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching organization ${id}:`, error);
    throw error;
  }
};

export const createOrganization = async (organizationData) => {
  try {
    // Add validation for URL format
    let fhirUrl = organizationData.fhir_server_url?.trim();
    if (!fhirUrl) {
      throw new Error('FHIR server URL is required');
    }
    
    // Try to normalize URL if needed
    if (!fhirUrl.startsWith('http://') && !fhirUrl.startsWith('https://')) {
      fhirUrl = 'http://' + fhirUrl;
    }
    
    // For CRO middleware integration - IMPORTANT NOTES:
    // - Use http://localhost:8001/sponsor/shared-resources for middleware (recommended)
    // - If using Docker, use http://cro-backend:8000/sponsor/shared-resources
    // - Direct FHIR server URLs like http://localhost:8081/fhir can cause connection issues
    
    // Transform data format for FHIR Organization
    const data = {
      name: organizationData.name,
      url: fhirUrl,
      api_key: organizationData.api_key,
      organization_type: organizationData.organization_type || 'sponsor',
    };
    
    // Add debug logging
    console.log('Creating organization with data:', data);
    
    const response = await api.post('/organizations', data);
    console.log('Organization created successfully:', response.data);
    
    // Verify the URL in the response
    if (response.data && response.data.telecom) {
      const urlTelecom = response.data.telecom.find(t => t && t.system === 'url');
      if (urlTelecom) {
        console.log('Verified URL in created organization:', urlTelecom.value);
      } else {
        console.warn('URL not found in created organization telecom data');
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error creating organization:', error);
    throw error;
  }
};

export const updateOrganization = async (id, organizationData) => {
  try {
    // Add validation for URL format
    let fhirUrl = organizationData.fhir_server_url?.trim();
    if (!fhirUrl) {
      throw new Error('FHIR server URL is required');
    }
    
    // Try to normalize URL if needed
    if (!fhirUrl.startsWith('http://') && !fhirUrl.startsWith('https://')) {
      fhirUrl = 'http://' + fhirUrl;
    }
    
    // Transform data format for FHIR Organization
    const data = {
      name: organizationData.name,
      url: fhirUrl,
      api_key: organizationData.api_key,
      organization_type: organizationData.organization_type || 'sponsor',
    };
    
    console.log(`Updating organization ${id} with data:`, data);
    
    const response = await api.put(`/organizations/${id}`, data);
    
    // Verify the URL in the response
    if (response.data && response.data.telecom) {
      const urlTelecom = response.data.telecom.find(t => t && t.system === 'url');
      if (urlTelecom) {
        console.log('Verified URL in updated organization:', urlTelecom.value);
      } else {
        console.warn('URL not found in updated organization telecom data');
      }
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error updating organization ${id}:`, error);
    throw error;
  }
};

// Helper function to extract FHIR server URL from organization
export const extractFhirServerUrl = (organization) => {
  if (!organization) return '';
  
  // Check the extension field for the URL
  if (organization.extension && Array.isArray(organization.extension)) {
    const urlExt = organization.extension.find(
      e => e && e.url === 'http://example.org/fhir/StructureDefinition/organization-url'
    );
    if (urlExt && urlExt.valueString) {
      // Check if this is a middleware URL or direct FHIR server URL
      const url = urlExt.valueString;
      
      // Return the URL as is - the backend will handle conversion to middleware if needed
      return url;
    }
  }
  
  return '';
};

export const deleteOrganization = async (id) => {
  try {
    const response = await api.delete(`/organizations/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting organization ${id}:`, error);
    throw error;
  }
};

// Protocol sharing API endpoints
export const shareProtocol = async (protocolId, sharingData) => {
  try {
    // Handle both legacy format (array of IDs) and new format (object with organizationIds, shareMode, etc.)
    const requestData = Array.isArray(sharingData) 
      ? { organization_ids: sharingData }
      : {
          organization_ids: sharingData.organizationIds,
          share_mode: sharingData.shareMode,
          selected_tests: sharingData.selectedTests,
          share_batches: sharingData.shareBatches,
          selected_batches: sharingData.selectedBatches
        };
        
    const response = await api.post(`/protocols/${protocolId}/share`, requestData);
    return response.data;
  } catch (error) {
    console.error(`Error sharing protocol ${protocolId}:`, error);
    throw error;
  }
};

export const getProtocolShares = async (protocolId) => {
  try {
    const response = await api.get(`/protocols/${protocolId}/shares`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching protocol shares for ${protocolId}:`, error);
    throw error;
  }
};

// Stability Test API endpoints
export const fetchTests = async (protocolId = null) => {
  try {
    // Create the request
    let url = '/tests';
    if (protocolId) {
      url += `?protocol_id=${protocolId}`;
    }
    
    console.log(`Fetching fresh tests data from ${url}`);
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching tests:', error);
    throw error;
  }
};

export const fetchTestById = async (id) => {
  try {
    console.log(`API: Fetching test with ID: ${id}`);
    console.log(`API: URL: ${BASE_URL}/tests/${id}`);
    const response = await api.get(`/tests/${id}`);
    console.log('API: Test fetch response:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error fetching test ${id}:`, error);
    throw error;
  }
};

export const createTest = async (testData) => {
  try {
    console.log('Creating test with data:', testData);
    const response = await api.post('/enhanced-tests', testData);
    
    // No cache to invalidate now - we've removed caching
    
    console.log('Test created successfully, response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating test:', error);
    throw error;
  }
};

export const updateTest = async (id, testData) => {
  try {
    const response = await api.put(`/tests/${id}`, testData);
    return response.data;
  } catch (error) {
    console.error(`Error updating test ${id}:`, error);
    throw error;
  }
};

export const deleteTest = async (id) => {
  try {
    const response = await api.delete(`/tests/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting test ${id}:`, error);
    throw error;
  }
};

// Batch API endpoints
export const fetchBatches = async (protocolId = null) => {
  try {
    let url = '/batches';
    if (protocolId) {
      url += `?protocol_id=${protocolId}`;
    }
    console.log(`Fetching fresh batches data from ${url}`);
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching batches:', error);
    throw error;
  }
};

export const fetchBatchById = async (id) => {
  try {
    const response = await api.get(`/batches/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching batch ${id}:`, error);
    throw error;
  }
};

export const createBatch = async (batchData) => {
  try {
    const response = await api.post('/batches', batchData);
    return response.data;
  } catch (error) {
    console.error('Error creating batch:', error);
    throw error;
  }
};

export const updateBatch = async (id, batchData) => {
  try {
    const response = await api.put(`/batches/${id}`, batchData);
    return response.data;
  } catch (error) {
    console.error(`Error updating batch ${id}:`, error);
    throw error;
  }
};

export const deleteBatch = async (id) => {
  try {
    const response = await api.delete(`/batches/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting batch ${id}:`, error);
    throw error;
  }
};

// Test Results API endpoints
export const fetchResults = async (batchId = null, testId = null, organizationId = null) => {
  try {
    let url = '/results';
    
    const params = [];
    if (batchId) params.push(`batch_id=${batchId}`);
    if (testId) params.push(`test_id=${testId}`);
    if (organizationId) params.push(`organization_id=${organizationId}`);
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching test results:', error);
    throw error;
  }
};

export const fetchResultById = async (id) => {
  try {
    const response = await api.get(`/results/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching test result ${id}:`, error);
    throw error;
  }
};

export const createTestResult = async (resultData) => {
  try {
    console.log('Submitting test result with data:', resultData);
    const response = await api.post('/results', resultData);
    console.log('Test result created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating test result:', error);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
    }
    throw error;
  }
};

export const updateTestResult = async (id, resultData) => {
  try {
    const response = await api.put(`/results/${id}`, resultData);
    return response.data;
  } catch (error) {
    console.error(`Error updating test result ${id}:`, error);
    throw error;
  }
};

export const deleteResult = async (id) => {
  try {
    const response = await api.delete(`/results/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting test result ${id}:`, error);
    throw error;
  }
};

// Medicinal Product API endpoints
export const fetchMedicinalProducts = async () => {
  try {
    console.log('Fetching medicinal products data');
    const response = await api.get('/medicinal-products');
    return response.data;
  } catch (error) {
    console.error('Error fetching medicinal products:', error);
    throw error;
  }
};

export const fetchMedicinalProductById = async (id) => {
  try {
    const response = await api.get(`/medicinal-products/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching medicinal product ${id}:`, error);
    throw error;
  }
};

export const createMedicinalProduct = async (productData) => {
  try {
    const response = await api.post('/medicinal-products', productData);
    return response.data;
  } catch (error) {
    console.error('Error creating medicinal product:', error);
    throw error;
  }
};

// ObservationDefinition API endpoints
export const fetchObservationDefinitions = async (protocolId = null) => {
  try {
    let url = '/observation-definitions';
    if (protocolId) {
      url += `?protocol_id=${protocolId}`;
    }
    
    console.log(`Fetching observation definitions from ${url}`);
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching observation definitions:', error);
    throw error;
  }
};

export const fetchObservationDefinitionById = async (id) => {
  try {
    const response = await api.get(`/observation-definitions/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching observation definition ${id}:`, error);
    throw error;
  }
};

export const createObservationDefinition = async (definitionData) => {
  try {
    const response = await api.post('/observation-definitions', definitionData);
    return response.data;
  } catch (error) {
    console.error('Error creating observation definition:', error);
    throw error;
  }
};

export const fetchTestObservationDefinitions = async (testId) => {
  try {
    const response = await api.get(`/tests/${testId}/observation-definitions`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching observation definitions for test ${testId}:`, error);
    throw error;
  }
};

export const fetchTestSpecimenDefinition = async (testId) => {
  try {
    const response = await api.get(`/tests/${testId}/specimen-definition`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching specimen definition for test ${testId}:`, error);
    throw error;
  }
};


// Utility function to directly fetch a resource by its ID
// This is useful when a resource has just been created but might not yet appear in search results
export const fetchResourceById = async (resourceType, id) => {
  try {
    const response = await api.get(`/${resourceType.toLowerCase()}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${resourceType} with ID ${id}:`, error);
    throw error;
  }
};