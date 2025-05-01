import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getBatches, createResult, getProtocol, getProtocols, getSharedTests } from '../services/api';

function TestResultForm() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [batches, setBatches] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [testDefinitions, setTestDefinitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareWithSponsor, setShareWithSponsor] = useState(true);
  
  const [formData, setFormData] = useState({
    protocol_id: '',
    batch_id: '',
    test_definition_id: '',
    timepoint_id: '',
    result_date: new Date().toISOString().split('T')[0],
    result_value: '',
    result_unit: '',
    notes: '',
    status: 'completed',
    performed_by: '',
    meets_acceptance_criteria: true,
    share_with_sponsor: true
  });

  // Extract batch_id from query params if present
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const batchId = searchParams.get('batch');
    const protocolId = searchParams.get('protocol');
    
    if (batchId) {
      setFormData(prev => ({ ...prev, batch_id: batchId }));
    }
    
    if (protocolId) {
      setFormData(prev => ({ ...prev, protocol_id: protocolId }));
    }
  }, [location]);

  // Load protocols and batches
  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true);
        
        // Fetch protocols shared with CRO
        const protocolsResponse = await getProtocols();
        setProtocols(protocolsResponse.data);
        
        // Fetch batches shared with CRO
        const batchesResponse = await getBatches();
        setBatches(batchesResponse.data);
        
        setDataLoading(false);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to load data. Please try again later.');
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

  // State for timepoints in the selected protocol
  const [timepoints, setTimepoints] = useState([]);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(null);

  // Load protocol details and available test definitions when protocol is selected
  useEffect(() => {
    const fetchProtocolDetails = async () => {
      if (!formData.protocol_id) {
        setSelectedProtocol(null);
        setTestDefinitions([]);
        setTimepoints([]);
        return;
      }
      
      try {
        // Fetch protocol details
        const protocolResponse = await getProtocol(formData.protocol_id);
        const protocolData = protocolResponse.data;
        setSelectedProtocol(protocolData);
        
        // Fetch stability tests associated with this protocol
        const testsResponse = await getSharedTests(formData.protocol_id);
        const stabilityTests = testsResponse.data;
        
        // Map the test definitions
        const tests = [];
        const timepointsList = [];
        
        // Check if we have actual stability tests
        if (Array.isArray(stabilityTests) && stabilityTests.length > 0) {
          // Filter to actual stability tests (not protocol timepoints)
          const realTests = stabilityTests.filter(test => 
            test.type !== 'protocol_test' && test.type !== 'protocol_timepoint'
          );
          
          // Extract timepoints from protocol
          const protocolTimepoints = stabilityTests.filter(test => 
            test.type === 'protocol_timepoint'
          );
          
          if (protocolTimepoints.length > 0) {
            console.log('Found protocol timepoints:', protocolTimepoints);
            protocolTimepoints.forEach(timepoint => {
              const timingInfo = timepoint.timing?.repeat?.boundsDuration || null;
              timepointsList.push({
                id: timepoint.id,
                name: timepoint.title || `Timepoint ${timepoint.id}`,
                description: timepoint.description || '',
                timing: timingInfo || timepoint.timing || null
              });
            });
          } else {
            console.warn('No protocol timepoints found in test definitions');
            
            // If no timepoints found, check if they exist directly in the protocol structure
            if (protocolData.action && Array.isArray(protocolData.action)) {
              console.log('Checking protocol actions for timepoints');
              protocolData.action.forEach((condition, condIndex) => {
                if (condition.action && Array.isArray(condition.action)) {
                  condition.action.forEach((timepoint, tpIndex) => {
                    if (timepoint.timingTiming) {
                      const timepointId = timepoint.id || `timepoint-${condIndex}-${tpIndex}`;
                      const timingInfo = timepoint.timingTiming?.repeat?.boundsDuration || null;
                      const title = timepoint.title || 
                        (timingInfo ? `${timingInfo.value} ${timingInfo.unit}` : `Timepoint ${tpIndex+1}`);
                      
                      console.log(`Adding direct timepoint from protocol: ${title}`);
                      timepointsList.push({
                        id: timepointId,
                        name: title,
                        description: timepoint.description || '',
                        timing: timingInfo || timepoint.timingTiming || null
                      });
                    }
                  });
                }
              });
            }
          }
          
          if (realTests.length > 0) {
            realTests.forEach(test => {
              tests.push({
                id: test.id,
                name: test.title || `Test ${test.id}`,
                description: test.description || '',
                type: test.type || 'Unknown',
                parameters: test.parameters || {},
                acceptance_criteria: test.acceptance_criteria || {}
              });
            });
          } else {
            // Fall back to protocol timepoints if no real tests
            stabilityTests.forEach(test => {
              if (test.type !== 'protocol_timepoint') {
                tests.push({
                  id: test.id,
                  name: test.title || `Test ${test.id}`,
                  description: test.description || '',
                  type: test.type || 'Unknown',
                  timing: test.timing || null,
                  acceptance_criteria: test.acceptance_criteria || {}
                });
              }
            });
          }
        } else if (protocolData.action && Array.isArray(protocolData.action)) {
          // Fall back to extracting from protocol if no tests API results
          protocolData.action.forEach(condition => {
            // Add main condition as a test if it has an id
            if (condition.id) {
              tests.push({
                id: condition.id,
                name: condition.title || `Condition ${condition.id}`,
                description: condition.description || '',
                acceptance_criteria: condition.acceptance_criteria || {}
              });
            }
            
            // Add timepoints as tests
            if (condition.action && Array.isArray(condition.action)) {
              condition.action.forEach(timepoint => {
                if (timepoint.id) {
                  // Check if it's a timepoint or a test
                  if (timepoint.type === 'timepoint' || timepoint.timingTiming) {
                    const timingInfo = timepoint.timingTiming?.repeat?.boundsDuration || null;
                    const timepoint_title = timepoint.title || 
                      (timingInfo ? `${timingInfo.value} ${timingInfo.unit}` : `Timepoint ${timepoint.id}`);
                    
                    console.log(`Adding timepoint from protocol structure: ${timepoint_title}`);
                    timepointsList.push({
                      id: timepoint.id,
                      name: timepoint_title,
                      description: timepoint.description || '',
                      timing: timingInfo,
                      condition_id: condition.id  // Reference to parent condition
                    });
                  } else {
                    tests.push({
                      id: timepoint.id,
                      name: timepoint.title || `Test ${timepoint.id}`,
                      description: timepoint.description || '',
                      acceptance_criteria: timepoint.acceptance_criteria || {}
                    });
                  }
                }
              });
            }
          });
        }
        
        setTestDefinitions(tests);
        setTimepoints(timepointsList);
        console.log('Loaded timepoints:', timepointsList);
        console.log('Loaded tests:', tests);
      } catch (error) {
        console.error('Error fetching protocol details or tests:', error);
        setError('Failed to load protocol details or tests. Please try again.');
      }
    };
    
    fetchProtocolDetails();
  }, [formData.protocol_id]);

  // Update acceptance criteria when test definition changes
  useEffect(() => {
    if (formData.test_definition_id) {
      const selectedTest = testDefinitions.find(test => test.id === formData.test_definition_id);
      setAcceptanceCriteria(selectedTest?.acceptance_criteria || null);
      console.log('Selected test acceptance criteria:', selectedTest?.acceptance_criteria);
    } else {
      setAcceptanceCriteria(null);
    }
  }, [formData.test_definition_id, testDefinitions]);

  // Filter batches when protocol is selected
  const filteredBatches = formData.protocol_id 
    ? batches.filter(batch => batch.protocol_id === formData.protocol_id)
    : batches;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleShareToggle = (e) => {
    const { checked } = e.target;
    setShareWithSponsor(checked);
    setFormData({
      ...formData,
      share_with_sponsor: checked
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic validation
    if (!formData.protocol_id || !formData.test_definition_id || !formData.timepoint_id) {
      setError("Please select a protocol, test, and timepoint");
      setLoading(false);
      return;
    }

    if (!formData.result_value) {
      setError("Please enter a result value");
      setLoading(false);
      return;
    }

    try {
      // Get selected test and timepoint details for logging
      const selectedTest = testDefinitions.find(t => t.id === formData.test_definition_id);
      const selectedTimepoint = timepoints.find(t => t.id === formData.timepoint_id);
      
      console.log('Submitting test result:', {
        test: selectedTest?.name,
        timepoint: selectedTimepoint?.name,
        result_value: formData.result_value,
        result_unit: formData.result_unit,
        meets_criteria: formData.meets_acceptance_criteria
      });
      
      // Submit the result with all data
      await createResult({
        ...formData,
        share_with_sponsor: shareWithSponsor
      });
      
      // Navigate to results list on success
      navigate('/results');
    } catch (error) {
      console.error('Error creating test result:', error);
      setError('Failed to save test result. Please try again.');
      setLoading(false);
    }
  };

  const getTestByType = (type) => {
    return testDefinitions.filter(test => {
      // Here you would add logic to categorize tests
      // For this example, we're just returning all tests
      return true;
    });
  };

  if (dataLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Record Test Result
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="protocol-label">Protocol</InputLabel>
                <Select
                  labelId="protocol-label"
                  name="protocol_id"
                  value={formData.protocol_id}
                  onChange={handleChange}
                  required
                >
                  {protocols.map((protocol) => (
                    <MenuItem key={protocol.id} value={protocol.id}>
                      {protocol.title || protocol.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="batch-label">Batch (Optional)</InputLabel>
                <Select
                  labelId="batch-label"
                  name="batch_id"
                  value={formData.batch_id}
                  onChange={handleChange}
                  disabled={!formData.protocol_id}
                >
                  <MenuItem value="">
                    <em>None - No batch selected</em>
                  </MenuItem>
                  {filteredBatches.length === 0 ? (
                    <MenuItem disabled>No batches available for this protocol</MenuItem>
                  ) : (
                    filteredBatches.map((batch) => (
                      <MenuItem key={batch.id} value={batch.id}>
                        {batch.batch_number} {batch.status && <Chip size="small" label={batch.status} sx={{ ml: 1 }} />}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            
            {formData.protocol_id && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="test-definition-label">Test</InputLabel>
                    <Select
                      labelId="test-definition-label"
                      name="test_definition_id"
                      value={formData.test_definition_id}
                      onChange={handleChange}
                      required
                    >
                      {testDefinitions.length === 0 ? (
                        <MenuItem disabled>No tests available for this protocol</MenuItem>
                      ) : (
                        testDefinitions.map((test) => (
                          <MenuItem key={test.id} value={test.id}>
                            {test.name}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="timepoint-label">Timepoint</InputLabel>
                    <Select
                      labelId="timepoint-label"
                      name="timepoint_id"
                      value={formData.timepoint_id}
                      onChange={handleChange}
                      required
                    >
                      {timepoints.length === 0 ? (
                        <MenuItem disabled>No timepoints available for this protocol</MenuItem>
                      ) : (
                        timepoints.map((timepoint) => (
                          <MenuItem key={timepoint.id} value={timepoint.id}>
                            {timepoint.name}
                            {timepoint.timing && timepoint.timing.value !== undefined && 
                              <Chip size="small" 
                                label={`${timepoint.timing.value} ${timepoint.timing.unit || 'time point'}`} 
                                sx={{ ml: 1 }} />
                            }
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
            
            {formData.test_definition_id && (
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Test Details</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        {testDefinitions.find(t => t.id === formData.test_definition_id)?.description ? (
                          <Typography variant="body2" paragraph>
                            {testDefinitions.find(t => t.id === formData.test_definition_id)?.description}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No description available for this test.
                          </Typography>
                        )}
                      </Grid>
                      
                      {acceptanceCriteria && (
                        <Grid item xs={12}>
                          <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #eee' }}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                              Acceptance Criteria:
                            </Typography>
                            {typeof acceptanceCriteria === 'object' ? (
                              <>
                                {acceptanceCriteria.min_value && (
                                  <Typography variant="body2">
                                    Minimum Value: {acceptanceCriteria.min_value} {acceptanceCriteria.unit || ''}
                                  </Typography>
                                )}
                                {acceptanceCriteria.max_value && (
                                  <Typography variant="body2">
                                    Maximum Value: {acceptanceCriteria.max_value} {acceptanceCriteria.unit || ''}
                                  </Typography>
                                )}
                                {acceptanceCriteria.description && (
                                  <Typography variant="body2">
                                    {acceptanceCriteria.description}
                                  </Typography>
                                )}
                              </>
                            ) : (
                              <Typography variant="body2">
                                {acceptanceCriteria.toString()}
                              </Typography>
                            )}
                          </Box>
                        </Grid>
                      )}
                      
                      {formData.timepoint_id && timepoints.find(t => t.id === formData.timepoint_id)?.timing && (
                        <Grid item xs={12}>
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2">Timepoint Details:</Typography>
                            <Typography variant="body2">
                              {`${timepoints.find(t => t.id === formData.timepoint_id)?.timing.value} ${timepoints.find(t => t.id === formData.timepoint_id)?.timing.unit}`}
                            </Typography>
                            {timepoints.find(t => t.id === formData.timepoint_id)?.description && (
                              <Typography variant="body2">
                                {timepoints.find(t => t.id === formData.timepoint_id)?.description}
                              </Typography>
                            )}
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            )}
            
            <Grid item xs={12} md={6}>
              <TextField
                name="result_date"
                label="Test Date"
                type="date"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={formData.result_date}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="performed_by"
                label="Performed By"
                fullWidth
                required
                value={formData.performed_by}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="result_value"
                label="Result Value"
                fullWidth
                required
                value={formData.result_value}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="result_unit"
                label="Result Unit"
                fullWidth
                value={formData.result_unit}
                onChange={handleChange}
              />
            </Grid>
            
            {acceptanceCriteria && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.meets_acceptance_criteria}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          meets_acceptance_criteria: e.target.checked
                        });
                      }}
                      color="primary"
                    />
                  }
                  label="Result meets acceptance criteria"
                />
                <Typography variant="caption" color="textSecondary" display="block">
                  Indicate whether the test result meets the acceptance criteria defined in the protocol.
                </Typography>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Notes"
                fullWidth
                multiline
                rows={4}
                value={formData.notes}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                >
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="preliminary">Preliminary</MenuItem>
                  <MenuItem value="amended">Amended</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={shareWithSponsor}
                    onChange={handleShareToggle}
                    color="primary"
                  />
                }
                label="Share Results with Sponsor"
              />
              <Typography variant="caption" color="textSecondary" display="block">
                When enabled, the sponsor will be able to view these test results immediately.
              </Typography>
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              type="button"
              onClick={() => navigate('/results')}
              sx={{ mr: 1 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Result'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default TestResultForm;
