import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TestDefinitionForm from '../components/TestDefinitionForm';
import { fetchTestById, updateTest, fetchProtocols } from '../services/api';

function EditTest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [test, setTest] = useState(null);
  const [protocols, setProtocols] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch test details
        const testData = await fetchTestById(id);
        setTest(testData);
        
        // Fetch protocols for dropdown
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
        console.error('Error loading data:', error);
        setError('Failed to load test data or protocols. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Extract protocol ID from extension
  const getProtocolId = (test) => {
    if (!test || !test.extension) return '';
    
    const protocolExt = test.extension.find(ext => 
      ext.url === 'http://example.org/fhir/StructureDefinition/stability-test-protocol'
    );
    
    if (protocolExt && protocolExt.valueReference && protocolExt.valueReference.reference) {
      return protocolExt.valueReference.reference.split('/').pop();
    }
    
    return '';
  };

  // Extract test type from topic
  const getTestType = (test) => {
    if (!test || !test.topic || !test.topic.length) return '32P81';
    
    const topic = test.topic[0];
    if (topic.coding && topic.coding.length) {
      return topic.coding[0].code || '32P81';
    }
    
    return '32P81';
  };

  // Extract parameters from extension
  const getParameters = (test) => {
    if (!test || !test.extension) return {};
    
    const paramsExt = test.extension.find(ext => 
      ext.url === 'http://example.org/fhir/StructureDefinition/stability-test-parameters'
    );
    
    if (paramsExt && paramsExt.valueString) {
      try {
        return JSON.parse(paramsExt.valueString);
      } catch (e) {
        console.error('Error parsing test parameters:', e);
      }
    }
    
    return {};
  };

  // Extract acceptance criteria from extension
  const getAcceptanceCriteria = (test) => {
    if (!test || !test.extension) return {};
    
    const criteriaExt = test.extension.find(ext => 
      ext.url === 'http://example.org/fhir/StructureDefinition/stability-test-acceptance-criteria'
    );
    
    if (criteriaExt && criteriaExt.valueString) {
      try {
        return JSON.parse(criteriaExt.valueString);
      } catch (e) {
        console.error('Error parsing acceptance criteria:', e);
      }
    }
    
    return {};
  };

  const handleSubmit = async (testData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      await updateTest(id, testData);
      navigate(`/tests/${id}`);
    } catch (error) {
      console.error('Error updating test:', error);
      setError('Failed to update test. Please try again.');
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

  if (!test) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">
          Test not found or could not be loaded.
        </Alert>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/tests')}
          sx={{ mt: 2 }}
        >
          Back to Tests
        </Button>
      </Box>
    );
  }

  // Prepare data for the form
  const initialData = {
    title: test.title || '',
    description: test.description || '',
    test_type: getTestType(test),
    protocol_id: getProtocolId(test),
    parameters: getParameters(test),
    acceptance_criteria: getAcceptanceCriteria(test),
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/tests/${id}`)}
        >
          Back to Test Details
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Stability Test
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <TestDefinitionForm 
          onSubmit={handleSubmit} 
          protocols={protocols}
          initialData={initialData}
          isEdit={true}
        />
      </Paper>
    </Box>
  );
}

export default EditTest;