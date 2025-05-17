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
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { fetchProtocolById } from '../services/api';

function EnhancedTestDefinitionForm({ initialData = {}, onSubmit, protocols = [], isEdit = false }) {
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    test_type: '',
    test_subtype: '',
    protocol_id: '',
    timepoint: '',
    kind: 'Task',
    status: 'active',
    parameters: {},
    acceptance_criteria: {},
    specimen_definition: {
      title: '',
      description: '',
      type_code: 'stability-sample',
      type_display: 'Stability Test Sample',
      container_type: '',
      container_material: '',
      minimum_volume: null,
      minimum_volume_unit: '',
      temperature: null,
      temperature_unit: 'C',
      temperature_qualifier: '',
    },
    observation_definitions: [
      {
        title: '',
        description: '',
        code: 'observation1',
        code_display: '',
        category: 'laboratory',
        permitted_data_type: 'Quantity',
        unit: '',
        reference_range: {
          low: null,
          high: null,
        },
      },
    ],
    ...initialData,
  });

  const [loading, setLoading] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [timepoints, setTimepoints] = useState([]);
  const [parameterKey, setParameterKey] = useState('');
  const [parameterValue, setParameterValue] = useState('');
  const [criteriaKey, setCriteriaKey] = useState('');
  const [criteriaValue, setCriteriaValue] = useState('');

  // Load protocol details to get timepoints when protocol_id changes
  useEffect(() => {
    const loadProtocolDetails = async () => {
      if (!testData.protocol_id) {
        setSelectedProtocol(null);
        setTimepoints([]);
        return;
      }
      
      try {
        setLoading(true);
        const protocolData = await fetchProtocolById(testData.protocol_id);
        setSelectedProtocol(protocolData);
        
        // Extract timepoints from protocol actions
        const extractedTimepoints = [];
        if (protocolData.action && Array.isArray(protocolData.action)) {
          protocolData.action.forEach(action => {
            if (action.title && action.timingTiming) {
              extractedTimepoints.push({
                title: action.title,
                value: action.timingTiming.repeat?.boundsDuration?.value,
                unit: action.timingTiming.repeat?.boundsDuration?.unit
              });
            }
            
            // Check for nested timepoints
            if (action.action && Array.isArray(action.action)) {
              action.action.forEach(nestedAction => {
                if (nestedAction.title && nestedAction.timingTiming) {
                  extractedTimepoints.push({
                    title: nestedAction.title,
                    value: nestedAction.timingTiming.repeat?.boundsDuration?.value,
                    unit: nestedAction.timingTiming.repeat?.boundsDuration?.unit
                  });
                }
              });
            }
          });
        }
        
        setTimepoints(extractedTimepoints);
      } catch (error) {
        console.error('Error loading protocol details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProtocolDetails();
  }, [testData.protocol_id]);

  /** ---------- generic text-field handler ---------- **/
  const handleChange = (e) => {
    const { name, value } = e.target;
    setTestData((prev) => ({ ...prev, [name]: value }));
  };

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

  // Handle specimen definition changes
  const handleSpecimenChange = (e) => {
    const { name, value } = e.target;
    setTestData((prev) => ({
      ...prev,
      specimen_definition: {
        ...prev.specimen_definition,
        [name]: value,
      },
    }));
  };

  // Handle observation definition changes
  const handleObservationChange = (index, field, value) => {
    setTestData((prev) => {
      const updatedObservations = [...prev.observation_definitions];
      if (field === 'reference_range.low' || field === 'reference_range.high') {
        const [parent, child] = field.split('.');
        updatedObservations[index] = {
          ...updatedObservations[index],
          [parent]: {
            ...updatedObservations[index][parent],
            [child]: value
          }
        };
      } else {
        updatedObservations[index] = {
          ...updatedObservations[index],
          [field]: value
        };
      }
      return { ...prev, observation_definitions: updatedObservations };
    });
  };

  // Add new observation definition
  const handleAddObservation = () => {
    setTestData((prev) => ({
      ...prev,
      observation_definitions: [
        ...prev.observation_definitions,
        {
          title: '',
          description: '',
          code: `observation${prev.observation_definitions.length + 1}`,
          code_display: '',
          category: 'laboratory',
          permitted_data_type: 'Quantity',
          unit: '',
          reference_range: {
            low: null,
            high: null,
          },
        },
      ],
    }));
  };

  // Remove observation definition
  const handleRemoveObservation = (index) => {
    setTestData((prev) => {
      const updatedObservations = [...prev.observation_definitions];
      updatedObservations.splice(index, 1);
      return { ...prev, observation_definitions: updatedObservations };
    });
  };

  /** ---------- submit ---------- **/
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!testData.test_type) {
      window.alert('Please select test type');
      return;
    }

    // Validate subtype only when necessary
    if (['Degradation', 'Dissolution Values'].includes(testData.test_type) && !testData.test_subtype) {
      window.alert('Please select test subtype');
      return;
    }

    // Ensure specimen has a title if other specimen fields are filled
    const hasSpecimenData = Object.values(testData.specimen_definition).some(value => 
      value !== '' && value !== null && value !== testData.specimen_definition.type_code && 
      value !== testData.specimen_definition.type_display && value !== 'C'
    );
    
    if (hasSpecimenData && !testData.specimen_definition.title) {
      window.alert('Please provide a title for the specimen definition');
      return;
    }

    // Validate observation definitions
    const validObservations = testData.observation_definitions.filter(obs => obs.title);
    if (validObservations.length === 0) {
      window.alert('Please provide at least one valid observation definition with a title');
      return;
    }

    // Prepare submission data
    const submissionData = {
      ...testData,
      // Ensure subtype is empty if not used
      test_subtype: ['Degradation', 'Dissolution Values'].includes(testData.test_type)
        ? testData.test_subtype
        : '',
      // Only include specimen definition if it has a title
      specimen_definition: testData.specimen_definition.title ? testData.specimen_definition : null,
      // Only include valid observation definitions
      observation_definitions: validObservations,
    };

    onSubmit(submissionData);
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
                inputProps={{ name: 'test_subtype' }}
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
          <Grid item xs={12} sm={6}>
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
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel id="protocol-label">Protocol</InputLabel>
              <Select
                labelId="protocol-label"
                value={testData.protocol_id}
                label="Protocol"
                onChange={(e) =>
                  setTestData((prev) => ({ ...prev, protocol_id: e.target.value, timepoint: '' }))
                }
                inputProps={{ name: 'protocol_id' }}
              >
                <MenuItem value="">Select a protocol</MenuItem>
                {protocols.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.title} (v{p.version})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* timepoint selection */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required disabled={!testData.protocol_id || loading}>
              <InputLabel id="timepoint-label">Timepoint</InputLabel>
              <Select
                labelId="timepoint-label"
                value={testData.timepoint}
                label="Timepoint"
                onChange={(e) =>
                  setTestData((prev) => ({ ...prev, timepoint: e.target.value }))
                }
                inputProps={{ name: 'timepoint' }}
                endAdornment={loading && <CircularProgress size={20} />}
              >
                <MenuItem value="">Select a timepoint</MenuItem>
                {timepoints.map((tp, index) => (
                  <MenuItem key={index} value={tp.title}>
                    {tp.title} ({tp.value} {tp.unit})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          <Typography variant="caption" color="text.secondary">
            Timepoints are defined in the protocol. Select a protocol to see available timepoints.
          </Typography>
        </Grid>

        {/* status */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              value={testData.status}
              label="Status"
              onChange={(e) => setTestData((prev) => ({ ...prev, status: e.target.value }))}
              inputProps={{ name: 'status' }}
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="retired">Retired</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* kind */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="kind-label">Kind</InputLabel>
            <Select
              labelId="kind-label"
              value={testData.kind}
              label="Kind"
              onChange={(e) => setTestData((prev) => ({ ...prev, kind: e.target.value }))}
              inputProps={{ name: 'kind' }}
            >
              <MenuItem value="Task">Task</MenuItem>
              <MenuItem value="ServiceRequest">ServiceRequest</MenuItem>
              <MenuItem value="MedicationRequest">MedicationRequest</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      </Paper>

      {/* ---------- Observation Definitions (Measurements) ---------- */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Measurements (ObservationDefinitions)
          </Typography>
          <Tooltip title="Define what measurements this test will produce">
            <InfoIcon color="primary" />
          </Tooltip>
        </Box>
        
        {testData.observation_definitions.map((observation, index) => (
          <Accordion key={index} defaultExpanded={index === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>
                {observation.title || `Measurement ${index + 1}`}
                {observation.unit && ` (${observation.unit})`}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Measurement Title"
                    value={observation.title}
                    onChange={(e) => handleObservationChange(index, 'title', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Measurement Description"
                    value={observation.description || ''}
                    onChange={(e) => handleObservationChange(index, 'description', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Data Type</InputLabel>
                    <Select
                      value={observation.permitted_data_type}
                      label="Data Type"
                      onChange={(e) => handleObservationChange(index, 'permitted_data_type', e.target.value)}
                    >
                      <MenuItem value="Quantity">Quantity (Number)</MenuItem>
                      <MenuItem value="string">String (Text)</MenuItem>
                      <MenuItem value="boolean">Boolean (Yes/No)</MenuItem>
                      <MenuItem value="CodeableConcept">Code (Selected Value)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Unit of Measurement"
                    value={observation.unit || ''}
                    onChange={(e) => handleObservationChange(index, 'unit', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Reference Range (if applicable)</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Minimum Value"
                    type="number"
                    value={observation.reference_range?.low || ''}
                    onChange={(e) => handleObservationChange(index, 'reference_range.low', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Maximum Value"
                    type="number"
                    value={observation.reference_range?.high || ''}
                    onChange={(e) => handleObservationChange(index, 'reference_range.high', e.target.value)}
                  />
                </Grid>
                
                {testData.observation_definitions.length > 1 && (
                  <Grid item xs={12} sx={{ textAlign: 'right' }}>
                    <Button 
                      variant="outlined" 
                      color="error" 
                      startIcon={<DeleteIcon />}
                      onClick={() => handleRemoveObservation(index)}
                    >
                      Remove Measurement
                    </Button>
                  </Grid>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
        
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleAddObservation}
          >
            Add Another Measurement
          </Button>
        </Box>
      </Paper>

      {/* ---------- Specimen Definition (Sample Requirements) ---------- */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Sample Requirements (SpecimenDefinition)
          </Typography>
          <Tooltip title="Define what sample is needed for this test">
            <InfoIcon color="primary" />
          </Tooltip>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Sample Title"
              name="title"
              value={testData.specimen_definition.title}
              onChange={handleSpecimenChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Sample Description"
              name="description"
              value={testData.specimen_definition.description || ''}
              onChange={handleSpecimenChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Container Type"
              name="container_type"
              value={testData.specimen_definition.container_type || ''}
              onChange={handleSpecimenChange}
              placeholder="e.g., Plastic vial, Glass bottle"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Container Material"
              name="container_material"
              value={testData.specimen_definition.container_material || ''}
              onChange={handleSpecimenChange}
              placeholder="e.g., HDPE, Amber glass"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Minimum Volume"
              name="minimum_volume"
              type="number"
              value={testData.specimen_definition.minimum_volume || ''}
              onChange={handleSpecimenChange}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth>
              <InputLabel>Volume Unit</InputLabel>
              <Select
                label="Volume Unit"
                name="minimum_volume_unit"
                value={testData.specimen_definition.minimum_volume_unit || ''}
                onChange={handleSpecimenChange}
              >
                <MenuItem value="">Select</MenuItem>
                <MenuItem value="mL">mL</MenuItem>
                <MenuItem value="L">L</MenuItem>
                <MenuItem value="uL">μL</MenuItem>
                <MenuItem value="g">g</MenuItem>
                <MenuItem value="mg">mg</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              fullWidth
              label="Temperature"
              name="temperature"
              type="number"
              value={testData.specimen_definition.temperature || ''}
              onChange={handleSpecimenChange}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth>
              <InputLabel>Temp Unit</InputLabel>
              <Select
                label="Temp Unit"
                name="temperature_unit"
                value={testData.specimen_definition.temperature_unit || 'C'}
                onChange={handleSpecimenChange}
              >
                <MenuItem value="C">°C</MenuItem>
                <MenuItem value="F">°F</MenuItem>
                <MenuItem value="K">K</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Temperature Qualifier"
              name="temperature_qualifier"
              value={testData.specimen_definition.temperature_qualifier || ''}
              onChange={handleSpecimenChange}
              placeholder="e.g., Room Temperature (25°C)"
            />
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
          disabled={!testData.title || !testData.description || !testData.protocol_id || !testData.timepoint}
        >
          {isEdit ? 'Update Test' : 'Create Enhanced Test'}
        </Button>
      </Box>
    </Box>
  );
}

export default EnhancedTestDefinitionForm; 
