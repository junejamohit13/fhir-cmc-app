import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TestResultForm from '../components/TestResultForm';
import { createTestResult, fetchTests, fetchBatches, fetchOrganizations } from '../services/api';

function CreateResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const batchId = searchParams.get('batch');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [tests, setTests] = useState([]);
  const [batches, setBatches] = useState([]);
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch all required data in parallel
        const [testsData, batchesData, orgsData] = await Promise.all([
          fetchTests(),
          fetchBatches(),
          fetchOrganizations()
        ]);
        
        // Process tests
        let testsList = [];
        if (testsData && testsData.resourceType === 'Bundle') {
          if (testsData.entry && Array.isArray(testsData.entry)) {
            testsList = testsData.entry
              .filter(entry => entry && entry.resource)
              .map(entry => entry.resource);
          }
        }
        setTests(testsList);
        
        // Process batches
        let batchesList = [];
        if (batchesData && batchesData.resourceType === 'Bundle') {
          if (batchesData.entry && Array.isArray(batchesData.entry)) {
            batchesList = batchesData.entry
              .filter(entry => entry && entry.resource)
              .map(entry => entry.resource);
          }
        }
        setBatches(batchesList);
        
        // Process organizations
        let orgsList = [];
        if (orgsData && orgsData.resourceType === 'Bundle') {
          if (orgsData.entry && Array.isArray(orgsData.entry)) {
            orgsList = orgsData.entry
              .filter(entry => entry && entry.resource)
              .map(entry => entry.resource);
          }
        }
        setOrganizations(orgsList);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load required data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (resultData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      await createTestResult(resultData);
      navigate('/results');
    } catch (error) {
      console.error('Error submitting test result:', error);
      setError('Failed to submit test result. Please try again.');
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

  // Filter organizations to only include CROs
  const croOrganizations = organizations.filter(org => {
    if (!org.extension) return true;
    
    const typeExt = org.extension.find(ext => 
      ext.url === 'http://example.org/fhir/StructureDefinition/organization-type'
    );
    
    if (typeExt && typeExt.valueString === 'cro') {
      return true;
    }
    
    return false;
  });

  const initialData = batchId ? { batch_id: batchId } : {};

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/results')}
        >
          Back to Results
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Submit Test Result
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {tests.length === 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No tests available. Please create tests before submitting results.
          </Alert>
        )}
        
        {batches.length === 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No batches available. Please create batches before submitting results.
          </Alert>
        )}
        
        {croOrganizations.length === 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No CRO organizations available. Please add CRO organizations before submitting results.
          </Alert>
        )}
        
        <TestResultForm 
          initialData={initialData}
          onSubmit={handleSubmit} 
          tests={tests}
          batches={batches}
          organizations={croOrganizations.length > 0 ? croOrganizations : organizations}
        />
      </Paper>
    </Box>
  );
}

export default CreateResult;