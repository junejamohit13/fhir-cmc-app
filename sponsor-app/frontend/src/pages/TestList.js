import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Card,
  CardContent,
  Grid,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Science as ScienceIcon,
} from '@mui/icons-material';
import { fetchTests, deleteTest } from '../services/api';

function TestList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);

  const loadTests = async () => {
    try {
      setLoading(true);
      const response = await fetchTests();
      
      console.log('Tests API response:', response); // Add debug logging
      
      // FHIR returns a Bundle with entries
      if (response && response.resourceType === 'Bundle') {
        if (response.entry && Array.isArray(response.entry)) {
          const testList = response.entry
            .filter(entry => entry && entry.resource)
            .map(entry => entry.resource);
          
          console.log('Filtered test list:', testList); // Log the filtered list
          setTests(testList);
        } else {
          console.log('No entries in Bundle or entries is not an array');
          setTests([]);
        }
      } else {
        console.log('Response is not a Bundle:', response);
        setTests([]);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error fetching tests:', error);
      setError('Failed to load tests. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("TestList component mounted");
    loadTests();
    
    // Single refresh timer with longer interval (30 seconds)
    const refreshTimer = setInterval(() => {
      console.log("Auto-refreshing tests list");
      loadTests();
    }, 30000);
    
    // Clear interval when component unmounts
    return () => {
      console.log("TestList component unmounting, clearing timer");
      clearInterval(refreshTimer);
    };
  }, []); // Only run on mount
  
  // Handle location state changes in a separate effect
  useEffect(() => {
    // Check if we have a newly created test to highlight
    if (location.state?.refresh) {
      console.log("Location state refresh detected");
      
      // Set the highlighted ID if it exists in the state
      if (location.state.newItemId) {
        setHighlightedId(location.state.newItemId);
        console.log("Setting highlighted ID to", location.state.newItemId);
        
        // Clear highlight after a timeout
        setTimeout(() => {
          setHighlightedId(null);
        }, 5000);
        
        // Reload tests once
        loadTests();
      }
      
      // Clear the navigation state to prevent re-running on future renders
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this test?')) {
      try {
        await deleteTest(id);
        await loadTests(); // Reload the list
      } catch (error) {
        console.error('Error deleting test:', error);
        setError('Failed to delete test. Please try again.');
      }
    }
  };

  const getTestType = (test) => {
    if (!test.topic || !test.topic.length) return 'Unknown';
    
    const topic = test.topic[0];
    if (topic.coding && topic.coding.length) {
      return topic.coding[0].code || 'Unknown';
    }
    
    return 'Unknown';
  };

  const getProtocolReference = (test) => {
    if (!test.extension) return null;
    
    const protocolExt = test.extension.find(ext => 
      ext.url === 'http://example.org/fhir/StructureDefinition/stability-test-protocol'
    );
    
    if (protocolExt && protocolExt.valueReference) {
      return protocolExt.valueReference.reference;
    }
    
    return null;
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
        <Typography variant="h4" component="h1">
          Stability Tests
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/tests/create')}
            sx={{ mr: 2 }}
          >
            Create Test
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {tests.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ScienceIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Stability Tests Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Get started by creating your first stability test definition.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate('/tests/create')}
            >
              Create Test
            </Button>
          </Box>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {tests.map((test) => (
            <Grid item xs={12} sm={6} md={4} key={test.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  backgroundColor: highlightedId === test.id ? 'rgba(144, 202, 249, 0.3)' : 'inherit',
                  transition: 'background-color 0.5s ease'
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {test.title}
                    </Typography>
                    <Chip 
                      label={getTestType(test)}
                      color={getTestType(test) === '32P81' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {test.description}
                  </Typography>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Typography variant="body2" color="text.secondary">
                    <strong>Protocol:</strong> {getProtocolReference(test) || 'Not specified'}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    <strong>Status:</strong> {test.status}
                  </Typography>
                </CardContent>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Tooltip title="View Details">
                    <IconButton onClick={() => navigate(`/tests/${test.id}`)}>
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => navigate(`/tests/${test.id}/edit`)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton color="error" onClick={() => handleDelete(test.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default TestList;