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

// Protocol endpoints
export const getProtocols = () => api.get('/protocols');
export const getProtocol = (id) => api.get(`/protocols/${id}`);
export const getSharedTests = (protocolId) => api.get(`/protocols/${protocolId}/tests`);

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
export const getSharedBatches = (protocolId) => {
  // Try the regular endpoint first, then fall back to sponsor endpoint if needed
  return new Promise((resolve, reject) => {
    api.get(`/batches?protocol_id=${protocolId}`)
      .then(response => {
        if (Array.isArray(response.data) && response.data.length > 0) {
          resolve(response);
        } else {
          // If no batches found, try the sponsor-specific endpoint
          api.get(`/sponsor/protocols/${protocolId}/batches`)
            .then(sponsorResponse => resolve(sponsorResponse))
            .catch(error => reject(error));
        }
      })
      .catch(error => {
        // If first request fails, try sponsor endpoint
        api.get(`/sponsor/protocols/${protocolId}/batches`)
          .then(sponsorResponse => resolve(sponsorResponse))
          .catch(sponsorError => reject(sponsorError));
      });
  });
};

export default api;