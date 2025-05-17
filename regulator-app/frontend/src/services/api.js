import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8003';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getStabilityResults = async () => {
  try {
    const response = await api.get('/stability-results');
    return response.data;
  } catch (error) {
    console.error('Error fetching stability results:', error);
    throw error;
  }
};

export const getStabilityResult = async (resultId) => {
  try {
    const response = await api.get(`/stability-results/${resultId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching stability result ${resultId}:`, error);
    throw error;
  }
}; 