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
  Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import { getBatches, createResult, getProtocol, getProtocols, getSharedTests, updateResult, getBatch } from '../services/api';

function TestResultForm({ isEdit = false, initialData = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [batches, setBatches] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [testDefinitions, setTestDefinitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareWithSponsor, setShareWithSponsor] = useState(initialData?.share_with_sponsor ?? true);
  
  const [formData, setFormData] = useState({
    protocol_id: initialData?.protocol_id || '',
    batch_id: initialData?.batch_id || '',
    test_definition_id: initialData?.test_definition_id || '',
    timepoint_id: initialData?.timepoint_id || '',
    result_date: initialData?.result_date || new Date().toISOString().split('T')[0],
    result_value: initialData?.result_value || '',
    result_unit: initialData?.result_unit || '',
    notes: initialData?.notes || '',
    status: initialData?.status || 'completed',
    performed_by: initialData?.performed_by || '',
    meets_acceptance_criteria: initialData?.meets_acceptance_criteria ?? true,
    share_with_sponsor: initialData?.share_with_sponsor ?? true,
    validation_status: initialData?.validation_status || 'pending',
    review_status: initialData?.review_status || 'pending',
    review_notes: initialData?.review_notes || '',
    reviewed_by: initialData?.reviewed_by || '',
    review_date: initialData?.review_date || '',
    validation_notes: initialData?.validation_notes || '',
    validated_by: initialData?.validated_by || '',
    validation_date: initialData?.validation_date || ''
  });

  // Extract batch_id and protocol_id from query params if not in edit mode
  useEffect(() => {
    if (!isEdit) {
      const searchParams = new URLSearchParams(location.search);
      const batchId = searchParams.get('batch');
      const protocolId = searchParams.get('protocol');
      
      if (batchId) {
        setFormData(prev => ({ ...prev, batch_id: batchId }));
        
        // Fetch the batch details to get protocol_id
        const fetchBatch = async () => {
          try {
            const response = await getBatch(batchId);
            const batch = response.data;
            setSelectedBatch(batch);
            
            if (batch.protocol_id) {
              setFormData(prev => ({ ...prev, protocol_id: batch.protocol_id }));
            }
          } catch (error) {
            console.error('Error fetching batch details:', error);
            setError('Failed to fetch batch details. Please try again.');
          }
        };
        
        fetchBatch();
      }
      
      if (protocolId) {
        setFormData(prev => ({ ...prev, protocol_id: protocolId }));
      }
    }
  }, [location, isEdit]);

  // Load protocols and batches
  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true);
        
        // Fetch protocols shared with CRO
        const protocolsResponse = await getProtocols();
        console.log('Protocols response:', protocolsResponse.data);
        setProtocols(protocolsResponse.data);
        
        // Fetch batches shared with CRO
        const batchesResponse = await getBatches();
        console.log('Batches response:', batchesResponse.data);
        setBatches(batchesResponse.data);
        
        // If in edit mode or batch_id is provided, fetch the selected batch details
        if ((isEdit || formData.batch_id) && formData.batch_id) {
          try {
            const batchResponse = await getBatch(formData.batch_id);
            console.log('Selected batch response:', batchResponse.data);
            setSelectedBatch(batchResponse.data);
          } catch (err) {
            console.error('Error fetching selected batch:', err);
            setError('Failed to fetch batch details. Please try again.');
          }
        }
        
        setDataLoading(false);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to load data. Please try again later.');
        setDataLoading(false);
      }
    };

    fetchData();
  }, [formData.batch_id, isEdit]);

  // State for timepoints in the selected protocol
  const [timepoints, setTimepoints] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);

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
        // Clear previously selected test when protocol changes
        setSelectedTest(null);
        
        // Fetch protocol details
        const protocolResponse = await getProtocol(formData.protocol_id);
        const protocolData = protocolResponse.data;
        setSelectedProtocol(protocolData);
        
        // Extract tests and timepoints from protocol action
        const { tests, timepointsList } = extractTestsAndTimepoints(protocolData);
        setTestDefinitions(tests);
        setTimepoints(timepointsList);
        
      } catch (error) {
        console.error('Error fetching protocol details:', error);
        setError('Failed to load protocol details. Please try again.');
      }
    };
    
    fetchProtocolDetails();
  }, [formData.protocol_id]);
  
  // Extract tests and timepoints from protocol action
  const extractTestsAndTimepoints = (protocolData) => {
    const tests = [];
    const timepointsList = [];
    
    console.log('Protocol Data:', protocolData);
    
    if (protocolData.action && Array.isArray(protocolData.action)) {
      protocolData.action.forEach(action => {
        console.log('Processing action:', action);
        
        // Process timepoints
        if (action.timingTiming || (action.title && /\d+\s*(day|week|month|year|hr|min|s)s?/i.test(action.title))) {
          const timingDetails = extractTimingDetails(action);
          console.log('Timing details:', timingDetails);
          
          if (timingDetails) {
            const timepoint = {
              id: action.id,
              name: action.title || `${timingDetails.value} ${timingDetails.unit}`,
              description: action.description || '',
              value: timingDetails.value,
              unit: timingDetails.unit,
              sort_order: parseFloat(timingDetails.value) || 0
            };
            console.log('Created timepoint:', timepoint);
            timepointsList.push(timepoint);
          }
        }
        
        // Process tests
        if (action.type === 'test' || action.code || action.definitionCanonical) {
          const test = {
            id: action.id,
            name: action.title || action.code?.text || `Test ${action.id}`,
            description: action.description || '',
            type: action.type || 'test',
            parameters: action.parameter || {},
            acceptance_criteria: action.acceptance_criteria || {}
          };
          console.log('Created test:', test);
          tests.push(test);
        }
        
        // Process nested actions
        if (action.action && Array.isArray(action.action)) {
          console.log('Processing nested actions:', action.action);
          const nestedResults = extractTestsAndTimepoints({ action: action.action });
          tests.push(...nestedResults.tests);
          timepointsList.push(...nestedResults.timepointsList);
        }
      });
    }
    
    // Sort timepoints
    timepointsList.sort((a, b) => a.sort_order - b.sort_order);
    console.log('Final timepoints list:', timepointsList);
    
    return { tests, timepointsList };
  };
  
  // Extract timing details from a timepoint object
  const extractTimingDetails = (timepoint) => {
    if (timepoint.timingTiming?.repeat?.boundsDuration) {
      return {
        value: timepoint.timingTiming.repeat.boundsDuration.value,
        unit: timepoint.timingTiming.repeat.boundsDuration.unit
      };
    } else if (timepoint.title && typeof timepoint.title === 'string') {
      const match = timepoint.title.match(/(\d+)\s*(day|week|month|year|hr|min|s)s?/i);
      if (match) {
        return {
          value: parseInt(match[1], 10),
          unit: match[2].toLowerCase() + (match[2].endsWith('s') ? '' : 's')
        };
      }
    }
    return null;
  };

  // Update selected test when test definition changes
  useEffect(() => {
    if (formData.test_definition_id) {
      const test = testDefinitions.find(test => test.id === formData.test_definition_id);
      setSelectedTest(test || null);
      
      // If test has a default unit, set it in the form
      if (test?.parameters?.unit) {
        setFormData(prev => ({
          ...prev,
          result_unit: test.parameters.unit
        }));
      }
    } else {
      setSelectedTest(null);
    }
  }, [formData.test_definition_id, testDefinitions]);

  // Filter batches when protocol is selected
  const filteredBatches = formData.protocol_id 
    ? batches.filter(batch => {
        console.log('Checking batch:', batch, 'against protocol_id:', formData.protocol_id);
        // Normalize both IDs by removing any prefixes and converting to string
        const normalizedBatchProtocolId = String(batch.protocol_id).replace(/^PlanDefinition\//, '');
        const normalizedFormProtocolId = String(formData.protocol_id).replace(/^PlanDefinition\//, '');
        return normalizedBatchProtocolId === normalizedFormProtocolId;
      })
    : batches;

  console.log('Current protocol_id:', formData.protocol_id);
  console.log('All batches:', batches);
  console.log('Filtered batches:', filteredBatches);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value || '' // Ensure value is never undefined
    }));
    
    // If batch changes, update selected batch
    if (name === 'batch_id') {
      const batch = batches.find(b => b.id === value);
      setSelectedBatch(batch || null);
    }
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

    try {
      // Submit or update the result with all data
      if (isEdit && initialData?.id) {
        await updateResult(initialData.id, {
          ...formData,
          share_with_sponsor: shareWithSponsor
        });
      } else {
        await createResult({
          ...formData,
          share_with_sponsor: shareWithSponsor
        });
      }
      
      // Navigate to results list on success
      navigate('/results');
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} test result:`, error);
      setError(`Failed to ${isEdit ? 'update' : 'save'} test result. Please try again.`);
      setLoading(false);
    }
  };
  
  const renderAcceptanceCriteria = () => {
    if (!selectedTest || !selectedTest.acceptance_criteria) return null;
    
    const criteria = selectedTest.acceptance_criteria;
    console.log('Acceptance criteria:', criteria); // Debug log
    
    if (typeof criteria === 'string') {
      return <Typography variant="body2">{criteria}</Typography>;
    }
    
    return (
      <Box sx={{ mt: 1 }}>
        {criteria.min_value !== undefined && (
          <Typography variant="body2">
            Minimum value: <strong>{criteria.min_value}</strong> {criteria.unit || formData.result_unit}
          </Typography>
        )}
        {criteria.max_value !== undefined && (
          <Typography variant="body2">
            Maximum value: <strong>{criteria.max_value}</strong> {criteria.unit || formData.result_unit}
          </Typography>
        )}
        {criteria.expected_value !== undefined && (
          <Typography variant="body2">
            Expected value: <strong>{criteria.expected_value}</strong> {criteria.unit || formData.result_unit}
          </Typography>
        )}
        {criteria.description && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {criteria.description}
          </Typography>
        )}
      </Box>
    );
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
          {isEdit ? 'Edit Test Result' : 'Record Test Result'}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            {/* Protocol Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="protocol-label">Protocol</InputLabel>
                <Select
                  labelId="protocol-label"
                  name="protocol_id"
                  value={formData.protocol_id}
                  onChange={handleChange}
                  disabled={Boolean(isEdit || formData.batch_id)}
                  required
                >
                  {protocols.length === 0 ? (
                    <MenuItem key="no-protocols" value="" disabled>No protocols available</MenuItem>
                  ) : (
                    protocols.map((protocol) => (
                      <MenuItem key={`protocol-${protocol.id}`} value={protocol.id}>
                        {protocol.title || protocol.id}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              {selectedProtocol && (
                <Typography variant="caption" color="text.secondary">
                  Protocol ID: {selectedProtocol.id}
                </Typography>
              )}
            </Grid>
            
            {/* Batch Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="batch-label">Batch</InputLabel>
                <Select
                  labelId="batch-label"
                  name="batch_id"
                  value={formData.batch_id}
                  onChange={handleChange}
                  disabled={Boolean(!formData.protocol_id || isEdit)}
                >
                  <MenuItem key="no-batch" value="">
                    <em>None - No batch selected</em>
                  </MenuItem>
                  {filteredBatches.length === 0 ? (
                    <MenuItem key="no-batches" value="" disabled>No batches available for this protocol</MenuItem>
                  ) : (
                    filteredBatches.map((batch) => (
                      <MenuItem key={`batch-${batch.id}`} value={batch.id}>
                        {batch.batch_number} {batch.status && <Chip size="small" label={batch.status} sx={{ ml: 1 }} />}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              {selectedBatch && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Batch Number: {selectedBatch.batch_number} | 
                    Manufacture Date: {new Date(selectedBatch.manufacture_date).toLocaleDateString()}
                  </Typography>
                </Box>
              )}
            </Grid>
            
            {/* Test and Timepoint Selection */}
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
                        <MenuItem key="no-tests" value="" disabled>No tests available for this protocol</MenuItem>
                      ) : (
                        testDefinitions.map((test, index) => (
                          <MenuItem key={`test-${test.id || index}`} value={test.id || `test-${index}`}>
                            {test.name}
                            {test.type && test.type !== 'Unknown' && test.type !== 'test' && (
                              <Chip size="small" label={test.type} sx={{ ml: 1 }} />
                            )}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                  
                  {selectedTest && selectedTest.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      {selectedTest.description}
                    </Typography>
                  )}
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
                        <MenuItem key="no-timepoints" value="" disabled>No timepoints available for this protocol</MenuItem>
                      ) : (
                        timepoints.map((timepoint, index) => (
                          <MenuItem key={`timepoint-${timepoint.id || index}`} value={timepoint.id || `timepoint-${index}`}>
                            {timepoint.name}
                            {(timepoint.value !== undefined && timepoint.unit) && (
                              <Chip size="small" 
                                label={`${timepoint.value} ${timepoint.unit}`} 
                                sx={{ ml: 1 }} />
                            )}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
            
            {/* Test Details and Acceptance Criteria */}
            {selectedTest && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fafafa' }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <InfoIcon sx={{ mr: 1, fontSize: '1rem', color: 'primary.main' }} />
                    Test Details and Acceptance Criteria
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {/* Test Parameters */}
                    {selectedTest.parameters && Object.keys(selectedTest.parameters).length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>Test Parameters:</Typography>
                        <Box sx={{ ml: 2 }}>
                          {Object.entries(selectedTest.parameters).map(([key, value]) => (
                            <Typography key={key} variant="body2">
                              {key}: <strong>{value}</strong>
                            </Typography>
                          ))}
                        </Box>
                      </Grid>
                    )}
                    
                    {/* Acceptance Criteria */}
                    {selectedTest.acceptance_criteria && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>Acceptance Criteria:</Typography>
                        <Box sx={{ ml: 2 }}>
                          {renderAcceptanceCriteria()}
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>
            )}
            
            {/* Result Data */}
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
                placeholder="Name of person who performed the test"
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
                type="number"
                inputProps={{ step: "any" }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="result_unit"
                label="Result Unit"
                fullWidth
                value={formData.result_unit}
                onChange={handleChange}
                placeholder={selectedTest?.parameters?.unit || "e.g., mg, %, pH units"}
              />
            </Grid>
            
            {/* Acceptance Criteria Check */}
            {selectedTest?.acceptance_criteria && (
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
                <Typography variant="caption" color="text.secondary" display="block">
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
                placeholder="Any additional notes about the test result"
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
              <Typography variant="caption" color="text.secondary" display="block">
                When enabled, the sponsor will be able to view these test results immediately.
              </Typography>
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={() => navigate('/results')}
              sx={{ mr: 2 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : (isEdit ? 'Update Result' : 'Submit Result')}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default TestResultForm;
