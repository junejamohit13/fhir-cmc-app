import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Grid,
} from '@mui/material';

function OrganizationForm({ organizationData, onSubmit, isLoading, buttonText = 'Save' }) {
  // Extract data from FHIR Organization
  const extractFhirData = (fhirOrg) => {
    if (!fhirOrg) return { name: '', fhir_server_url: '', api_key: '' };
    
    // Extract URL from telecom
    const url = fhirOrg.telecom?.find(t => t.system === 'url')?.value || '';
    
    // Extract API key from extension
    const apiKey = fhirOrg.extension?.find(
      e => e.url === 'http://example.org/fhir/StructureDefinition/organization-api-key'
    )?.valueString || '';
    
    return {
      name: fhirOrg.name || '',
      fhir_server_url: url,
      api_key: apiKey,
    };
  };
  
  const [formData, setFormData] = useState(extractFhirData(organizationData));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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
              helperText="Full URL to the external FHIR server"
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
            disabled={isLoading || !formData.name || !formData.fhir_server_url}
          >
            {isLoading ? 'Saving...' : buttonText}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default OrganizationForm;