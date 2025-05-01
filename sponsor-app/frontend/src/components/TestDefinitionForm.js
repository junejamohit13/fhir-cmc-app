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
  IconButton,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Delete as DeleteIcon,
} from '@mui/icons-material';

function TestDefinitionForm({ initialData = {}, onSubmit, protocols = [], isEdit = false }) {
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    test_type: '',
    test_subtype: '',
    protocol_id: '',
    parameters: {},
    acceptance_criteria: {},
    ...initialData,
  });

  const [parameterKey, setParameterKey] = useState('');
  const [parameterValue, setParameterValue] = useState('');
  const [criteriaKey, setCriteriaKey] = useState('');
  const [criteriaValue, setCriteriaValue] = useState('');

  /** ---------- generic text-field handler ---------- **/
  const handleChange = (e) => {
    const { name, value } = e.target;
    setTestData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    /* eslint-disable no-console */
    console.log('Updated test data:', testData);
  }, [testData]);

  /** ---------- helpers for dynamic key/value lists ---------- **/
  const handleAddPair = (key, value, field) => {
    if (!key.trim()) return;
    setTestData((prev) => ({
      ...prev,
      [field]: { ...prev[field], [key]: value },
    }));
  };

  const handleRemovePair = (key, field) => {
    setTestData((prev) => {
      const updated = { ...prev[field] };
      delete updated[key];
      return { ...prev, [field]: updated };
    });
  };

  /** ---------- submit ---------- **/
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!testData.test_type) {
      window.alert('Please select test type');
      return;
    }

    // validate subtype only when necessary
    if (
      ['Degradation', 'Dissolution Values'].includes(testData.test_type) &&
      !testData.test_subtype
    ) {
      window.alert('Please select test subtype');
      return;
    }

    onSubmit({
      ...testData,
      // ensure subtype is empty if not used
      test_subtype: ['Degradation', 'Dissolution Values'].includes(testData.test_type)
        ? testData.test_subtype
        : '',
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate autoComplete="off">
      {/* ---------- top section ---------- */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Test Definition
        </Typography>

        <Grid container spacing={3}>
          {/* title */}
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Title"
              name="title"
              value={testData.title}
              onChange={handleChange}
            />
          </Grid>

          {/* test type */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel id="test-type-label">Test Type</InputLabel>
              <Select
                labelId="test-type-label"
                value={testData.test_type}
                label="Test Type"
                onChange={(e) =>
                  setTestData((prev) => ({ ...prev, test_type: e.target.value, test_subtype: '' }))
                }
                /*  ⬇️ forward the name so event.target.name exists */
                inputProps={{ name: 'test_type' }}
              >
                <MenuItem value="">Select a test type</MenuItem>
                <MenuItem value="Assay">Assay</MenuItem>
                <MenuItem value="Degradation">Degradation</MenuItem>
                <MenuItem value="Dissolution Values">Dissolution Values</MenuItem>
                <MenuItem value="Microbial Quality">Microbial Quality</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* subtype (enabled only when needed) */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required={['Degradation', 'Dissolution Values'].includes(testData.test_type)} disabled={!['Degradation', 'Dissolution Values'].includes(testData.test_type)}>
              <InputLabel id="test-subtype-label">Test Subtype</InputLabel>
              <Select
                labelId="test-subtype-label"
                value={testData.test_subtype}
                label="Test Subtype"
                onChange={(e) =>
                  setTestData((prev) => ({ ...prev, test_subtype: e.target.value }))
                }
                inputProps={{ name: 'test_subtype' }} /* important! */
              >
                <MenuItem value="">Select a subtype</MenuItem>
                {testData.test_type === 'Degradation' && (
                  <>
                    <MenuItem value="Degs1">Degs1</MenuItem>
                    <MenuItem value="Degs2">Degs2</MenuItem>
                    <MenuItem value="Degs3">Degs3</MenuItem>
                    <MenuItem value="Total Degradation">Total Degradation</MenuItem>
                  </>
                )}
                {testData.test_type === 'Dissolution Values' && (
                  <>
                    <MenuItem value="Individual">Individual</MenuItem>
                    <MenuItem value="Mean">Mean</MenuItem>
                    <MenuItem value="Conclusion">Conclusion</MenuItem>
                  </>
                )}
              </Select>
            </FormControl>
          </Grid>

          {/* description */}
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              multiline
              rows={3}
              label="Description"
              name="description"
              value={testData.description}
              onChange={handleChange}
            />
          </Grid>

          {/* protocol */}
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel id="protocol-label">Protocol</InputLabel>
              <Select
                labelId="protocol-label"
                value={testData.protocol_id}
                label="Protocol"
                onChange={(e) =>
                  setTestData((prev) => ({ ...prev, protocol_id: e.target.value }))
                }
                inputProps={{ name: 'protocol_id' }}
              >
                {protocols.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.title} (v{p.version})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* ---------- parameters ---------- */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Test Parameters
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              label="Parameter Name"
              value={parameterKey}
              onChange={(e) => setParameterKey(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              label="Parameter Value"
              value={parameterValue}
              onChange={(e) => setParameterValue(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="outlined"
              disabled={!parameterKey.trim()}
              sx={{ height: '100%' }}
              onClick={() => {
                handleAddPair(parameterKey, parameterValue, 'parameters');
                setParameterKey('');
                setParameterValue('');
              }}
            >
              Add
            </Button>
          </Grid>
        </Grid>

        <List dense>
          {Object.entries(testData.parameters).map(([key, value]) => (
            <ListItem
              key={key}
              secondaryAction={
                <IconButton edge="end" onClick={() => handleRemovePair(key, 'parameters')}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText primary={key} secondary={value} />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* ---------- acceptance criteria ---------- */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Acceptance Criteria
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              label="Criteria Name"
              value={criteriaKey}
              onChange={(e) => setCriteriaKey(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              label="Criteria Value"
              value={criteriaValue}
              onChange={(e) => setCriteriaValue(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="outlined"
              disabled={!criteriaKey.trim()}
              sx={{ height: '100%' }}
              onClick={() => {
                handleAddPair(criteriaKey, criteriaValue, 'acceptance_criteria');
                setCriteriaKey('');
                setCriteriaValue('');
              }}
            >
              Add
            </Button>
          </Grid>
        </Grid>

        <List dense>
          {Object.entries(testData.acceptance_criteria).map(([key, value]) => (
            <ListItem
              key={key}
              secondaryAction={
                <IconButton edge="end" onClick={() => handleRemovePair(key, 'acceptance_criteria')}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText primary={key} secondary={value} />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* ---------- submit ---------- */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          type="submit"
          disabled={!testData.title || !testData.description || !testData.protocol_id}
        >
          {isEdit ? 'Update Test' : 'Create Test'}
        </Button>
      </Box>
    </Box>
  );
}

export default TestDefinitionForm;
