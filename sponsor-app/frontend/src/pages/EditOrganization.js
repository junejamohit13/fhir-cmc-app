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
      await updateOrganization(id, formData);
      navigate('/organizations');
    } catch (error) {
      console.error('Error updating organization:', error);
      setError('Failed to update organization. Please check your data and try again.');
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