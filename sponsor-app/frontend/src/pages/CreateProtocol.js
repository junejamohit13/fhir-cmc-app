import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import ProtocolForm from '../components/ProtocolForm';
import { createProtocol } from '../services/api';

function CreateProtocol() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [protocolData, setProtocolData] = useState({
    title: '',
    version: '1.0',
    description: '',
    status: 'active',
    date: new Date().toISOString().split('T')[0],
    subjectReference: {
      reference: ''
    },
    note: [{ text: '' }],
    extension: [
      {
        url: 'http://hl7.org/fhir/uv/pharm-quality/StructureDefinition/Extension-container-orientation-pq',
        valueCodeableConcept: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/container-orientation',
              code: 'horizontal',
              display: 'Horizontal'
            }
          ],
          text: 'Horizontal'
        }
      }
    ],
    action: [
      {
        title: '25°C/60% RH',
        description: 'Long-term storage condition',
        action: [
          { title: '0 months', timingTiming: { repeat: { boundsDuration: { value: 0, unit: 'month', system: 'http://unitsofmeasure.org' } } } },
          { title: '3 months', timingTiming: { repeat: { boundsDuration: { value: 3, unit: 'month', system: 'http://unitsofmeasure.org' } } } },
          { title: '6 months', timingTiming: { repeat: { boundsDuration: { value: 6, unit: 'month', system: 'http://unitsofmeasure.org' } } } }
        ]
      }
    ]
  });

  const steps = ['Protocol Information', 'Review & Submit'];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleProtocolDataChange = (newData) => {
    setProtocolData(newData);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await createProtocol(protocolData);
      
      // Navigate back to the protocols list with a state flag to trigger refresh
      navigate('/protocols', { state: { refresh: true, newProtocolId: response.id } });
    } catch (error) {
      console.error('Error creating protocol:', error);
      setError('Failed to create protocol. Please check your data and try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <ProtocolForm
            protocolData={protocolData}
            onChange={handleProtocolDataChange}
          />
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Protocol Information
            </Typography>
            <Paper sx={{ p: 2, mb: 3 }}>
              <pre>{JSON.stringify(protocolData, null, 2)}</pre>
            </Paper>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/protocols')}
        >
          Back to Protocols
        </Button>
      </Box>

      <Typography variant="h4" component="h1" gutterBottom>
        Create New Protocol
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {renderStepContent(activeStep)}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          variant="outlined"
        >
          Back
        </Button>
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained">
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading && <CircularProgress size={24} />}
          >
            {loading ? 'Creating...' : 'Create Protocol'}
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default CreateProtocol;
