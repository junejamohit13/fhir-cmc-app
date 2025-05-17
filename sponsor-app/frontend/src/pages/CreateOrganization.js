import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import OrganizationForm from '../components/OrganizationForm';
import { createOrganization } from '../services/api';

function CreateOrganization() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate URL
      if (!formData.fhir_server_url) {
        setError('FHIR server URL is required');
        setLoading(false);
        return;
      }
      
      console.log('Creating organization with data:', formData);
      const response = await createOrganization(formData);
      
      // Check if the response includes a telecom URL
      let hasValidUrl = false;
      if (response.telecom && Array.isArray(response.telecom)) {
        hasValidUrl = response.telecom.some(t => t.system === 'url' && t.value);
      }
      
      if (!hasValidUrl) {
        console.warn('Organization created but FHIR server URL may not have been saved correctly');
      }
      
      // Pass the newly created organization directly to avoid search/caching delays
      navigate('/organizations', { 
        state: { 
          refresh: true,
          newItemId: response.id,
          newOrganization: response // Pass the entire organization so we can add it to the list
        } 
      });
    } catch (error) {
      console.error('Error creating organization:', error);
      let errorMsg = 'Failed to create organization.';
      
      // Extract more specific error message if available
      if (error.response?.data?.detail) {
        errorMsg += ` ${error.response.data.detail}`;
      } else if (error.message) {
        errorMsg += ` ${error.message}`;
      } else {
        errorMsg += ' Please check your data and try again.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/organizations')}
        >
          Back to Organizations
        </Button>
      </Box>

      <Typography variant="h4" component="h1" gutterBottom>
        Add New Organization
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <OrganizationForm
        onSubmit={handleSubmit}
        isLoading={loading}
        buttonText="Create Organization"
      />
    </Box>
  );
}

export default CreateOrganization;