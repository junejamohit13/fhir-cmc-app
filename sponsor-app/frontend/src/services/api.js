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
    // Transform data format for FHIR Organization
    const data = {
      name: organizationData.name,
      url: organizationData.fhir_server_url,
      api_key: organizationData.api_key,
      organization_type: organizationData.organization_type || 'sponsor',
    };
    
    // Add debug logging
    console.log('Creating organization with data:', data);
    
    const response = await api.post('/organizations', data);
    console.log('Organization created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating organization:', error);
    throw error;
  }
};

export const updateOrganization = async (id, organizationData) => {
  try {
    // Transform data format for FHIR Organization
    const data = {
      name: organizationData.name,
      url: organizationData.fhir_server_url,
      api_key: organizationData.api_key,
      organization_type: organizationData.organization_type || 'sponsor',
    };
    
    const response = await api.put(`/organizations/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating organization ${id}:`, error);
    throw error;
  }
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
          //share_batches: sharingData.shareBatches,
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
    const response = await api.post('/tests', testData);
    
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
    const response = await api.post('/results', resultData);
    return response.data;
  } catch (error) {
    console.error('Error creating test result:', error);
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