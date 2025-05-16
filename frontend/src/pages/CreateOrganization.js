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
      
      // Add logging to debug
      console.log('Submitting organization data:', formData);
      const response = await createOrganization(formData);
      console.log('Organization created successfully:', response);
      
      // Navigate back to the organization list and pass the new organization
      // This will allow us to immediately display it without waiting for a refresh
      navigate('/organizations', { 
        state: { 
          refresh: true,
          newItemId: response.id,
          newOrganization: response // Pass the entire organization object
        }
      });
      
    } catch (error) {
      console.error('Error creating organization:', error);
      setError('Failed to create organization. Please check your data and try again.');
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