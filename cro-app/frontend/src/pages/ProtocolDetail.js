import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Typography,
  Alert,
} from '@mui/material';
import { getProtocol, getSharedTests, getSharedBatches } from '../services/api';

function ProtocolDetail() {
  const { id } = useParams();
  const [protocol, setProtocol] = useState(null);
  const [testDefinitions, setTestDefinitions] = useState([]);
  const [sharedBatches, setSharedBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching protocol data for ID:', id);
        
        // Fetch protocol details, tests, and batches in parallel
        const [protocolResponse, testsResponse, batchesResponse] = await Promise.all([
          getProtocol(id),
          getSharedTests(id),
          getSharedBatches(id)
        ]);
        
        // Process protocol data
        console.log('Protocol data:', protocolResponse.data);
        setProtocol(protocolResponse.data);
        
        // Process test data
        console.log('Tests data count:', Array.isArray(testsResponse.data) ? testsResponse.data.length : 'Not an array');
        if (Array.isArray(testsResponse.data) && testsResponse.data.length > 0) {
          // Filter to actual stability tests (not protocol timepoints)
          const realTests = testsResponse.data.filter(test => 
            test.type !== 'protocol_test' && test.type !== 'protocol_timepoint'
          );
          
          console.log('Filtered real tests count:', realTests.length);
          if (realTests.length > 0) {
            // Format tests for display
            const formattedTests = realTests.map(test => ({
              id: test.id,
              name: test.title || `Test ${test.id}`,
              description: test.description || 'No description provided',
              specifications: formatSpecifications(test),
              method: formatMethod(test),
              type: test.type || 'Unknown',
              parameters: test.parameters || {},
              acceptance_criteria: test.acceptance_criteria || {}
            }));
            
            console.log('Formatted tests:', formattedTests);
            setTestDefinitions(formattedTests);
          } else {
            console.warn('No actual stability tests found, looking for protocol timepoints instead');
            
            // If no real tests are found, try to create tests from protocol timepoints
            const timepoints = extractTimepoints(testsResponse.data);
            if (timepoints.length > 0) {
              const timepointTests = timepoints.map(tp => ({
                id: tp.id,
                name: tp.title || `Timepoint ${tp.id}`,
                description: tp.description || 'Timepoint from protocol',
                specifications: 'From protocol timepoint',
                method: 'Protocol-defined',
                type: 'protocol_timepoint',
                parameters: {},
                timing: tp.timing
              }));
              
              console.log('Created timepoint tests:', timepointTests);
              setTestDefinitions(timepointTests);
            } else {
              console.warn('No protocol timepoints found either');
              setTestDefinitions([]);
            }
          }
        } else {
          console.warn('No tests found for this protocol');
          setTestDefinitions([]);
        }
        
        // Process batches data
        console.log('Shared batches data response:', batchesResponse);
        console.log('Shared batches data:', batchesResponse.data);
        
        if (Array.isArray(batchesResponse.data) && batchesResponse.data.length > 0) {
          console.log('Found shared batches:', batchesResponse.data.length);
          setSharedBatches(batchesResponse.data);
        } else {
          console.warn('No shared batches found for this protocol');
          setSharedBatches([]);
          
          // Try to fetch batches again using sponsor-specific endpoint as fallback
          try {
            const sponsorBatchesResponse = await fetch(`http://localhost:8001/sponsor/protocols/${id}/batches`);
            const sponsorBatchesData = await sponsorBatchesResponse.json();
            
            if (Array.isArray(sponsorBatchesData) && sponsorBatchesData.length > 0) {
              console.log('Found sponsor-shared batches:', sponsorBatchesData.length);
              setSharedBatches(sponsorBatchesData);
            }
          } catch (fallbackError) {
            console.error('Error fetching sponsor batches:', fallbackError);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching protocol data:', error);
        setError('Failed to load protocol details. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up a refresh timer to periodically check for new data
    const refreshTimer = setInterval(() => {
      fetchData();
    }, 30000);  // Refresh every 30 seconds
    
    // Clean up the timer when component unmounts
    return () => clearInterval(refreshTimer);
  }, [id]);

  // Helper function to format specifications from test data
  const formatSpecifications = (test) => {
    // Try to extract from acceptance_criteria
    if (test.acceptance_criteria && Object.keys(test.acceptance_criteria).length > 0) {
      return Object.entries(test.acceptance_criteria)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }
    
    // Try to extract from parameters.specifications
    if (test.parameters && test.parameters.specifications) {
      return test.parameters.specifications;
    }
    
    // Default
    return 'Not specified';
  };

  // Helper function to format method information
  const formatMethod = (test) => {
    // Try different locations where method might be stored
    if (test.parameters && test.parameters.method) {
      return test.parameters.method;
    }
    
    if (test.parameters && test.parameters.test_method) {
      return test.parameters.test_method;
    }
    
    if (test.parameters && test.parameters.procedure) {
      return test.parameters.procedure;
    }
    
    // Check if there's any method-like key in parameters
    if (test.parameters) {
      const methodKeys = Object.keys(test.parameters).filter(k => 
        k.toLowerCase().includes('method') || 
        k.toLowerCase().includes('procedure')
      );
      
      if (methodKeys.length > 0) {
        return test.parameters[methodKeys[0]];
      }
    }
    
    return 'Not specified';
  };

  // Helper function to extract timepoints from test data
  const extractTimepoints = (tests) => {
    return tests.filter(test => test.type === 'protocol_timepoint');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!protocol) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography>Protocol not found.</Typography>
      </Box>
    );
  }

  // Create test schedule based on protocol timepoints
  const createTestSchedule = () => {
    if (!protocol || !protocol.action || !Array.isArray(protocol.action)) {
      return [];
    }
    
    const schedule = [];
    
    // Look for timepoints in the protocol structure
    protocol.action.forEach(condition => {
      if (condition.action && Array.isArray(condition.action)) {
        condition.action.forEach(timepoint => {
          if (timepoint.title || timepoint.description) {
            const timepointName = timepoint.title || 
              (timepoint.timingTiming?.repeat?.boundsDuration ? 
                `${timepoint.timingTiming.repeat.boundsDuration.value} ${timepoint.timingTiming.repeat.boundsDuration.unit}` : 
                'Timepoint');
                
            // Assume all tests are performed at each timepoint for now
            schedule.push({
              timepoint: timepointName,
              tests: testDefinitions.map(test => test.id)
            });
          }
        });
      }
    });
    
    // If no timepoints found in protocol, create a default "Initial" timepoint
    if (schedule.length === 0 && testDefinitions.length > 0) {
      schedule.push({
        timepoint: 'Initial',
        tests: testDefinitions.map(test => test.id)
      });
    }
    
    return schedule;
  };

  // Generate testing schedule based on protocol structure
  const testingSchedule = createTestSchedule();

  const getTestNameById = (testId) => {
    const test = testDefinitions.find((t) => t.id === testId);
    return test ? test.name : testId;
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">{protocol.title}</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Protocol Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={protocol.status}
                  color={protocol.status === 'active' ? 'success' : 'default'}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Sponsor
                </Typography>
                <Typography variant="body1">
                  {protocol.sponsor}
                  {protocol.sponsor_id && (
                    <Chip 
                      size="small" 
                      label="Has Sponsor Link" 
                      color="primary" 
                      sx={{ ml: 1 }} 
                      title="This protocol is linked to a sponsor organization"
                    />
                  )}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Shared Date
                </Typography>
                <Typography variant="body1">
                  {new Date(protocol.shared_date).toLocaleDateString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body1">
                  {protocol.description || 'No description provided'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Definitions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {testDefinitions.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No stability tests were shared with this protocol. The sponsor may need to share the protocol again with tests included.
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {testDefinitions.map((test) => (
                    <Grid item xs={12} key={test.id}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          {test.name} {test.type && <Chip size="small" label={test.type} sx={{ ml: 1, fontSize: '0.7rem' }} />}
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <Typography variant="body2" color="text.secondary">
                              Description:
                            </Typography>
                            <Typography variant="body2">{test.description}</Typography>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Typography variant="body2" color="text.secondary">
                              Specifications:
                            </Typography>
                            <Typography variant="body2">{test.specifications}</Typography>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Typography variant="body2" color="text.secondary">
                              Method:
                            </Typography>
                            <Typography variant="body2">{test.method}</Typography>
                          </Grid>
                          {test.parameters && Object.keys(test.parameters).length > 0 && (
                            <Grid item xs={12}>
                              <Typography variant="body2" color="text.secondary">
                                Additional Parameters:
                              </Typography>
                              <Box component="ul" sx={{ pl: 2, mt: 0.5 }}>
                                {Object.entries(test.parameters)
                                  .filter(([key]) => !['method', 'procedure', 'specifications'].includes(key.toLowerCase()))
                                  .map(([key, value]) => (
                                    <Typography component="li" variant="body2" key={key}>
                                      <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : value}
                                    </Typography>
                                  ))}
                              </Box>
                            </Grid>
                          )}
                        </Grid>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Testing Schedule
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {testingSchedule.length === 0 ? (
                <Alert severity="info">
                  No testing schedule was defined for this protocol.
                </Alert>
              ) : (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {testingSchedule.map((timepoint) => (
                    <Grid item xs={12} sm={6} md={4} lg={2.4} key={timepoint.timepoint}>
                      <Paper
                        sx={{
                          p: 2,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <Typography variant="subtitle1" gutterBottom align="center">
                          {timepoint.timepoint}
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          {testDefinitions.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              No tests available
                            </Typography>
                          ) : (
                            timepoint.tests.map((testId) => (
                              <Typography key={testId} variant="body2" sx={{ mb: 0.5 }}>
                                • {getTestNameById(testId)}
                              </Typography>
                            ))
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Shared Batches from Sponsor
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {sharedBatches.length === 0 ? (
                <Alert severity="info">
                  No batches have been shared with this protocol by the sponsor.
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {sharedBatches.map((batch) => (
                    <Grid item xs={12} sm={6} md={4} key={batch.id}>
                      <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Batch {batch.batch_number || batch.id}
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Status
                          </Typography>
                          <Chip
                            label={batch.status || 'Unknown'}
                            color={batch.status === 'completed' ? 'success' : 
                                  batch.status === 'in-progress' ? 'warning' : 'default'}
                            size="small"
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                        
                        {batch.manufacture_date && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Manufacture Date
                            </Typography>
                            <Typography variant="body2">
                              {new Date(batch.manufacture_date).toLocaleDateString()}
                            </Typography>
                          </Box>
                        )}
                        
                        {batch.quantity && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Quantity
                            </Typography>
                            <Typography variant="body2">
                              {batch.quantity} {batch.unit || 'units'}
                            </Typography>
                          </Box>
                        )}
                        
                        {batch.description && (
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Description
                            </Typography>
                            <Typography variant="body2">
                              {batch.description}
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default ProtocolDetail;
