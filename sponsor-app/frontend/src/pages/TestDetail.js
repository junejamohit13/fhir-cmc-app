import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchTestById, fetchProtocolById, deleteTest } from '../services/api';

function TestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [protocol, setProtocol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch test details
      const testData = await fetchTestById(id);
      setTest(testData);
      
      // If test has protocol reference, fetch the protocol details
      const protocolRef = getProtocolReference(testData);
      if (protocolRef) {
        const protocolId = protocolRef.split('/').pop();
        try {
          const protocolData = await fetchProtocolById(protocolId);
          setProtocol(protocolData);
        } catch (protocolError) {
          console.error(`Error fetching protocol details:`, protocolError);
          // Don't fail the whole view if protocol fetch fails
        }
      }
    } catch (error) {
      console.error(`Error fetching test details:`, error);
      setError('Failed to load test details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("TestDetail: Loading test with ID:", id);
    loadData();
  }, [id]);

  const getProtocolReference = (test) => {
    if (!test || !test.extension) return null;
    
    const protocolExt = test.extension.find(ext => 
      ext.url === 'http://example.org/fhir/StructureDefinition/stability-test-protocol'
    );
    
    if (protocolExt && protocolExt.valueReference) {
      return protocolExt.valueReference.reference;
    }
    
    return null;
  };

  const getTestType = (test) => {
    if (!test || !test.topic || !test.topic.length) return 'Unknown';
    
    const topic = test.topic[0];
    if (topic.coding && topic.coding.length) {
      return topic.coding[0].code || 'Unknown';
    }
    
    return 'Unknown';
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      try {
        await deleteTest(id);
        navigate('/tests');
      } catch (error) {
        console.error('Error deleting test:', error);
        setError('Failed to delete test. Please try again.');
      }
    }
  };

  // Extract test parameters from extension
  const getTestParameters = () => {
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
  const getAcceptanceCriteria = () => {
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

  // Extract parameters and criteria from extensions
  const parameters = getTestParameters();
  const criteria = getAcceptanceCriteria();

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
        <Box>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/tests/${id}/edit`)}
            sx={{ mr: 1 }}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {test.title}
          </Typography>
          <Chip 
            label={getTestType(test)}
            color={getTestType(test) === '32P81' ? 'primary' : 'secondary'}
          />
        </Box>
        
        <Typography variant="body1" paragraph>
          {test.description}
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Test Details
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              <strong>ID:</strong> {test.id}
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              <strong>Status:</strong> {test.status}
            </Typography>
            
            {protocol && (
              <Typography variant="body2" color="text.secondary">
                <strong>Protocol:</strong> {protocol.title || 'Unknown'} (v{protocol.version || 'N/A'})
              </Typography>
            )}
            
            <Typography variant="body2" color="text.secondary">
              <strong>Test Type:</strong> {getTestType(test) === '32P81' ? 'Long-term stability' : 'Accelerated stability'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Test Parameters
            </Typography>
            
            {Object.keys(parameters).length > 0 ? (
              <List dense>
                {Object.entries(parameters).map(([key, value]) => (
                  <ListItem key={key} disableGutters>
                    <ListItemText 
                      primary={<Typography variant="body2"><strong>{key}:</strong> {value}</Typography>} 
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No parameters defined.
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Acceptance Criteria
            </Typography>
            
            {Object.keys(criteria).length > 0 ? (
              <List dense>
                {Object.entries(criteria).map(([key, value]) => (
                  <ListItem key={key} disableGutters>
                    <ListItemText 
                      primary={<Typography variant="body2"><strong>{key}:</strong> {value}</Typography>} 
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No acceptance criteria defined.
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default TestDetail;