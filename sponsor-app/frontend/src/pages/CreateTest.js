import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoIcon from '@mui/icons-material/Info';
import EnhancedTestDefinitionForm from '../components/EnhancedTestDefinitionForm';
import { createTest, fetchProtocols } from '../services/api';

function CreateTest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [protocols, setProtocols] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const protocolsData = await fetchProtocols();
        
        // FHIR returns a Bundle with entries
        let protocolList = [];
        if (protocolsData && protocolsData.resourceType === 'Bundle') {
          if (protocolsData.entry && Array.isArray(protocolsData.entry)) {
            protocolList = protocolsData.entry
              .filter(entry => entry && entry.resource)
              .map(entry => entry.resource);
          }
        }
        
        setProtocols(protocolList);
      } catch (error) {
        console.error('Error loading protocols:', error);
        setError('Failed to load protocols. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (testData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Add a success message to indicate creation is in progress
      const successMessage = document.createElement('div');
      successMessage.innerHTML = 'Creating test... This may take a few moments.';
      successMessage.style.padding = '10px';
      successMessage.style.backgroundColor = '#e8f5e9';
      successMessage.style.color = '#2e7d32';
      successMessage.style.borderRadius = '4px';
      successMessage.style.marginBottom = '20px';
      document.querySelector('form').prepend(successMessage);
      
      console.log('Submitting test data:', testData);
      const response = await createTest(testData);
      console.log('Test created with ID:', response.test_id);
      
      // Navigate back to the tests list with a state flag to trigger refresh
      // and highlight the newly created test
      navigate('/tests', { 
        state: { 
          refresh: true, 
          newItemId: response.test_id 
        } 
      });
    } catch (error) {
      console.error('Error creating test:', error);
      setError('Failed to create test. Please try again.');
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
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/tests')}
        >
          Back to Tests
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Create Stability Test
          </Typography>
          <Tooltip title="This form creates a fully-compliant FHIR resource hierarchy for stability testing with proper ObservationDefinition and SpecimenDefinition resources">
            <InfoIcon sx={{ ml: 2, color: 'primary.main' }} />
          </Tooltip>
        </Box>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Create a new stability test following the HL7 FHIR dx-pq Implementation Guide structure. 
          This creates a proper resource hierarchy with ActivityDefinition, ObservationDefinition, and SpecimenDefinition.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <EnhancedTestDefinitionForm 
          onSubmit={handleSubmit} 
          protocols={protocols}
        />
      </Paper>
    </Box>
  );
}

export default CreateTest;
