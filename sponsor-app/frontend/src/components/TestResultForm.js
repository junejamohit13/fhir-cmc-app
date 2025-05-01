import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Grid,
  Typography,
  Paper,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

function TestResultForm({ 
  initialData = {}, 
  onSubmit, 
  tests = [], 
  batches = [], 
  organizations = [],
  isEdit = false 
}) {
  const [resultData, setResultData] = useState({
    test_id: '',
    batch_id: '',
    organization_id: '',
    value: '',
    unit: '',
    result_date: new Date().toISOString().split('T')[0],
    status: 'completed',
    comments: '',
    ...initialData
  });

  const [selectedTest, setSelectedTest] = useState(null);

  useEffect(() => {
    if (resultData.test_id && tests.length > 0) {
      const test = tests.find(t => t.id === resultData.test_id);
      setSelectedTest(test);
    }
  }, [resultData.test_id, tests]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setResultData({
      ...resultData,
      [name]: value
    });
  };

  const handleDateChange = (date) => {
    setResultData({
      ...resultData,
      result_date: date ? date.toISOString().split('T')[0] : null
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(resultData);
  };

  // Extract test parameters and acceptance criteria
  const getTestParameters = () => {
    if (!selectedTest) return {};
    
    // Look for parameters in extensions
    const parameters = {};
    if (selectedTest.extension) {
      const parametersExt = selectedTest.extension.find(
        ext => ext.url === "http://example.org/fhir/StructureDefinition/stability-test-parameters"
      );
      
      if (parametersExt && parametersExt.valueString) {
        try {
          return JSON.parse(parametersExt.valueString);
        } catch (e) {
          console.error("Error parsing test parameters:", e);
        }
      }
    }
    
    return parameters;
  };

  const getTestCriteria = () => {
    if (!selectedTest) return {};
    
    // Look for acceptance criteria in extensions
    const criteria = {};
    if (selectedTest.extension) {
      const criteriaExt = selectedTest.extension.find(
        ext => ext.url === "http://example.org/fhir/StructureDefinition/stability-test-acceptance-criteria"
      );
      
      if (criteriaExt && criteriaExt.valueString) {
        try {
          return JSON.parse(criteriaExt.valueString);
        } catch (e) {
          console.error("Error parsing acceptance criteria:", e);
        }
      }
    }
    
    return criteria;
  };

  const testParameters = getTestParameters();
  const acceptanceCriteria = getTestCriteria();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box component="form" onSubmit={handleSubmit} noValidate autoComplete="off">
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Test Result Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="test-label">Test</InputLabel>
                <Select
                  labelId="test-label"
                  name="test_id"
                  value={resultData.test_id}
                  onChange={handleChange}
                  label="Test"
                >
                  {tests.map((test) => (
                    <MenuItem key={test.id} value={test.id}>
                      {test.title || test.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="batch-label">Batch</InputLabel>
                <Select
                  labelId="batch-label"
                  name="batch_id"
                  value={resultData.batch_id}
                  onChange={handleChange}
                  label="Batch"
                >
                  {batches.map((batch) => (
                    <MenuItem key={batch.id} value={batch.id}>
                      {batch.deviceName?.[0]?.name || batch.lotNumber || batch.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="org-label">Organization</InputLabel>
                <Select
                  labelId="org-label"
                  name="organization_id"
                  value={resultData.organization_id}
                  onChange={handleChange}
                  label="Organization"
                >
                  {organizations.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  value={resultData.status}
                  onChange={handleChange}
                  label="Status"
                >
                  <MenuItem value="registered">Registered</MenuItem>
                  <MenuItem value="preliminary">Preliminary</MenuItem>
                  <MenuItem value="final">Final</MenuItem>
                  <MenuItem value="amended">Amended</MenuItem>
                  <MenuItem value="corrected">Corrected</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                  <MenuItem value="entered-in-error">Entered in Error</MenuItem>
                  <MenuItem value="unknown">Unknown</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Result Date"
                value={resultData.result_date ? new Date(resultData.result_date) : null}
                onChange={handleDateChange}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Unit"
                name="unit"
                value={resultData.unit}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                multiline
                rows={3}
                label="Result Value"
                name="value"
                value={resultData.value}
                onChange={handleChange}
                placeholder="Enter result value or JSON data"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Comments"
                name="comments"
                value={resultData.comments}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        </Paper>

        {selectedTest && (
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Test Details
            </Typography>
            
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Test Parameters</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {Object.keys(testParameters).length > 0 ? (
                  <Grid container spacing={2}>
                    {Object.entries(testParameters).map(([key, value]) => (
                      <Grid item xs={12} sm={6} key={key}>
                        <Typography variant="subtitle2">{key}:</Typography>
                        <Typography variant="body2">{value}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography color="textSecondary">No parameters defined</Typography>
                )}
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Acceptance Criteria</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {Object.keys(acceptanceCriteria).length > 0 ? (
                  <Grid container spacing={2}>
                    {Object.entries(acceptanceCriteria).map(([key, value]) => (
                      <Grid item xs={12} sm={6} key={key}>
                        <Typography variant="subtitle2">{key}:</Typography>
                        <Typography variant="body2">{value}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography color="textSecondary">No acceptance criteria defined</Typography>
                )}
              </AccordionDetails>
            </Accordion>
          </Paper>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            color="primary" 
            type="submit"
            disabled={!resultData.test_id || !resultData.batch_id || !resultData.organization_id || !resultData.value || !resultData.result_date}
          >
            {isEdit ? 'Update Result' : 'Submit Result'}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}

export default TestResultForm;