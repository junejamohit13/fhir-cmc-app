import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
  timeout: 10000, // 10 second timeout to prevent hanging requests
});

// Add response interceptor for better debugging
api.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    console.error('API Error:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Protocol endpoints
export const getProtocols = () => api.get('/protocols');
export const getProtocol = (id) => api.get(`/protocols/${id}`);

// Enhanced test fetching function with better error handling
export const getSharedTests = (protocolId) => {
  console.log(`Fetching tests for protocol ${protocolId}`);
  
  return new Promise((resolve, reject) => {
    api.get(`/protocols/${protocolId}/tests`)
      .then(response => {
        console.log(`Successfully fetched ${response.data.length || 0} tests`);
        resolve(response);
      })
      .catch(error => {
        console.error(`Error fetching tests for protocol ${protocolId}:`, error.response?.data || error.message);
        
        // Return empty array on error instead of rejecting
        resolve({ data: [] });
      });
  });
};

// Organization endpoints
export const getOrganizations = () => api.get('/organizations');
export const getOrganization = (id) => api.get(`/organizations/${id}`);
export const createOrganization = (data) => api.post('/organizations', data);
export const updateOrganization = (id, data) => api.put(`/organizations/${id}`, data);
export const deleteOrganization = (id) => api.delete(`/organizations/${id}`);

// Batch endpoints
export const getBatches = (protocolId = null) => {
  const url = protocolId ? `/batches?protocol_id=${protocolId}` : '/batches';
  return api.get(url);
};
export const getBatch = (id) => api.get(`/batches/${id}`);
export const createBatch = (data) => api.post('/batches', data);
export const updateBatch = (id, data) => api.put(`/batches/${id}`, data);
export const deleteBatch = (id) => api.delete(`/batches/${id}`);

// Test Result endpoints
export const getResults = (batchId = null, testId = null) => {
  let url = '/results';
  if (batchId || testId) {
    const params = [];
    if (batchId) params.push(`batch_id=${batchId}`);
    if (testId) params.push(`test_id=${testId}`);
    url += `?${params.join('&')}`;
  }
  return api.get(url);
};
export const getResult = (id) => api.get(`/results/${id}`);
export const createResult = (data) => api.post('/results', data);
export const updateResult = (id, data) => api.put(`/results/${id}`, data);
export const deleteResult = (id) => api.delete(`/results/${id}`);
export const shareResult = (id, shareWithSponsor = true) => 
  api.post(`/results/${id}/share`, { share_with_sponsor: shareWithSponsor });

// Sponsor communication endpoints
export const getSharedProtocols = () => api.get('/sponsor/protocols');

// Enhanced batch fetching with better logging and error handling
export const getSharedBatches = (protocolId) => {
  console.log(`Fetching batches for protocol ${protocolId}`);
  
  return new Promise((resolve, reject) => {
    // Try the regular endpoint first
    api.get(`/batches?protocol_id=${protocolId}`)
      .then(response => {
        if (Array.isArray(response.data) && response.data.length > 0) {
          console.log(`Found ${response.data.length} batches via standard endpoint`);
          resolve(response);
        } else {
          console.log(`No batches found via standard endpoint, trying sponsor endpoint`);
          // If no batches found, try the sponsor-specific endpoint
          api.get(`/sponsor/protocols/${protocolId}/batches`)
            .then(sponsorResponse => {
              console.log(`Found ${sponsorResponse.data.length || 0} batches via sponsor endpoint`);
              resolve(sponsorResponse);
            })
            .catch(error => {
              console.error(`Failed to fetch batches from sponsor endpoint:`, error.response?.data || error.message);
              // Return empty array instead of rejecting on sponsor endpoint failure
              resolve({ data: [] });
            });
        }
      })
      .catch(error => {
        console.error(`Failed to fetch batches via standard endpoint:`, error.response?.data || error.message);
        // Try sponsor endpoint as fallback
        api.get(`/sponsor/protocols/${protocolId}/batches`)
          .then(sponsorResponse => {
            console.log(`Found ${sponsorResponse.data.length || 0} batches via sponsor endpoint (fallback)`);
            resolve(sponsorResponse);
          })
          .catch(sponsorError => {
            console.error(`Failed to fetch batches from sponsor endpoint (fallback):`, sponsorError.response?.data || sponsorError.message);
            // Return empty array instead of rejecting
            resolve({ data: [] });
          });
      });
  });
};

export default api;