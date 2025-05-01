import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  createOrganization,
  getOrganization,
  updateOrganization,
} from '../services/api';

function OrganizationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'sponsor',
    fhir_server_url: '',
    api_key: '',
    status: 'active',
    description: '',
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      const fetchOrganization = async () => {
        try {
          setLoading(true);
          const response = await getOrganization(id);
          setFormData(response.data);
          setError(null);
        } catch (error) {
          console.error('Error fetching organization:', error);
          setError('Failed to load organization. Please try again later.');
        } finally {
          setLoading(false);
        }
      };

      fetchOrganization();
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleStatusChange = (e) => {
    const { checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      status: checked ? 'active' : 'inactive',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEditMode) {
        await updateOrganization(id, formData);
      } else {
        await createOrganization(formData);
      }
      navigate('/organizations');
    } catch (error) {
      console.error('Error saving organization:', error);
      setError('Failed to save organization. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          {isEditMode ? 'Edit Organization' : 'Add Organization'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Organization Name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel id="type-label">Organization Type</InputLabel>
                <Select
                  labelId="type-label"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <MenuItem value="sponsor">Sponsor</MenuItem>
                  <MenuItem value="cro">CRO</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="fhir_server_url"
                label="FHIR Server URL"
                value={formData.fhir_server_url}
                onChange={handleChange}
                fullWidth
                required
                placeholder="https://example.com/fhir"
                helperText="The complete URL to the organization's FHIR server"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="api_key"
                label="API Key (Optional)"
                value={formData.api_key || ''}
                onChange={handleChange}
                fullWidth
                helperText="API key or token for authentication, if required"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.status === 'active'}
                    onChange={handleStatusChange}
                    color="primary"
                  />
                }
                label="Active"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description (Optional)"
                value={formData.description || ''}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              type="button"
              onClick={() => navigate('/organizations')}
              sx={{ mr: 1 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default OrganizationForm;