import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Grid,
  FormHelperText,
} from '@mui/material';

function OrganizationForm({ organizationData, onSubmit, isLoading, buttonText = 'Save' }) {
  // Extract data from FHIR Organization
  const extractFhirData = (fhirOrg) => {
    if (!fhirOrg) return { name: '', fhir_server_url: '', api_key: '' };
    
    // Extract URL from telecom - better handling with null checks
    let url = '';
    if (Array.isArray(fhirOrg.telecom)) {
      const urlTelecom = fhirOrg.telecom.find(t => t && t.system === 'url');
      url = urlTelecom?.value || '';
    }
    
    // Extract API key from extension with improved null handling
    let apiKey = '';
    if (Array.isArray(fhirOrg.extension)) {
      const apiKeyExt = fhirOrg.extension.find(
        e => e && e.url === 'http://example.org/fhir/StructureDefinition/organization-api-key'
      );
      apiKey = apiKeyExt?.valueString || '';
    }
    
    console.log('Extracted organization data:', { 
      name: fhirOrg.name || '', 
      fhir_server_url: url, 
      api_key: apiKey 
    });
    
    return {
      name: fhirOrg.name || '',
      fhir_server_url: url,
      api_key: apiKey,
    };
  };
  
  const [formData, setFormData] = useState(extractFhirData(organizationData));
  const [errors, setErrors] = useState({});

  // Re-extract data if organizationData changes
  useEffect(() => {
    if (organizationData) {
      setFormData(extractFhirData(organizationData));
    }
  }, [organizationData]);

  const validateUrl = (url) => {
    if (!url) return 'FHIR Server URL is required';
    
    // Basic URL validation
    try {
      new URL(url);
      return '';
    } catch (e) {
      return 'Please enter a valid URL (e.g., http://example.org/fhir)';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form before submitting
    const urlError = validateUrl(formData.fhir_server_url);
    const nameError = formData.name ? '' : 'Organization Name is required';
    
    if (urlError || nameError) {
      setErrors({
        fhir_server_url: urlError,
        name: nameError
      });
      return;
    }
    
    // Log before submitting to help with debugging
    console.log('Submitting organization data:', formData);
    onSubmit(formData);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              label="Organization Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              label="FHIR Server URL"
              name="fhir_server_url"
              value={formData.fhir_server_url}
              onChange={handleChange}
              placeholder="http://example.org/fhir"
              error={!!errors.fhir_server_url}
              helperText={errors.fhir_server_url || "Full URL to the external FHIR server"}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="API Key"
              name="api_key"
              value={formData.api_key}
              onChange={handleChange}
              placeholder="Optional API key for authentication"
              helperText="Leave blank if not required"
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : buttonText}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default OrganizationForm;