import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import OrganizationForm from '../components/OrganizationForm';
import { fetchOrganizationById, updateOrganization } from '../services/api';

function EditOrganization() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [organizationData, setOrganizationData] = useState(null);

  useEffect(() => {
    const getOrganizationDetails = async () => {
      try {
        setLoading(true);
        const data = await fetchOrganizationById(id);
        setOrganizationData(data);
        setError(null);
      } catch (error) {
        console.error(`Error fetching organization ${id}:`, error);
        setError('Failed to load organization details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    getOrganizationDetails();
  }, [id]);

  const handleSubmit = async (formData) => {
    try {
      setSaving(true);
      setError(null);
      
      // Validate URL
      if (!formData.fhir_server_url) {
        setError('FHIR server URL is required');
        setSaving(false);
        return;
      }
      
      console.log('Updating organization with data:', formData);
      const updatedOrg = await updateOrganization(id, formData);
      
      // Check if the response includes a telecom URL
      let hasValidUrl = false;
      if (updatedOrg.telecom && Array.isArray(updatedOrg.telecom)) {
        hasValidUrl = updatedOrg.telecom.some(t => t.system === 'url' && t.value);
      }
      
      if (!hasValidUrl) {
        console.warn('Organization updated but FHIR server URL may not have been saved correctly');
      }
      
      navigate('/organizations', { 
        state: { 
          refresh: true,
          newItemId: id,  // Highlight this item
          newOrganization: updatedOrg // Use the updated org to refresh the list
        } 
      });
    } catch (error) {
      console.error('Error updating organization:', error);
      let errorMsg = 'Failed to update organization.';
      
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
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !organizationData) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/organizations')}
          sx={{ mt: 2 }}
        >
          Back to Organizations
        </Button>
      </Box>
    );
  }

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
        Edit Organization
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {organizationData && (
        <OrganizationForm
          organizationData={organizationData}
          onSubmit={handleSubmit}
          isLoading={saving}
          buttonText="Update Organization"
        />
      )}
    </Box>
  );
}

export default EditOrganization;