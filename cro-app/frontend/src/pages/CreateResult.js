import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Stepper, 
  Step, 
  StepLabel,
  Divider,
  Alert,
  Card,
  CardContent,
  CardHeader 
} from '@mui/material';
import TestResultForm from '../components/TestResultForm';
import { useLocation } from 'react-router-dom';
import { getBatch, getProtocol } from '../services/api';

function CreateResult() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const batchId = searchParams.get('batch');
  const protocolId = searchParams.get('protocol');
  
  const [batchDetails, setBatchDetails] = useState(null);
  const [protocolDetails, setProtocolDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Determine which step to show initially
  const initialStep = batchId && protocolId ? 1 : 0;
  const [activeStep] = useState(initialStep);
  
  const steps = ['Select Protocol and Batch', 'Select Test and Timepoint', 'Enter Results'];
  
  // Fetch batch and protocol details if IDs are provided
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      
      try {
        if (batchId) {
          const batchResponse = await getBatch(batchId);
          setBatchDetails(batchResponse.data);
        }
        
        if (protocolId) {
          const protocolResponse = await getProtocol(protocolId);
          setProtocolDetails(protocolResponse.data);
        }
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (batchId || protocolId) {
      fetchDetails();
    }
  }, [batchId, protocolId]);
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Submit Test Result
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>
      
      {(batchId || protocolId) && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardHeader 
            title="Selected Context" 
            titleTypographyProps={{ variant: 'h6' }} 
            sx={{ pb: 1, backgroundColor: '#f8f9fc' }}
          />
          <CardContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
              {protocolId && (
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Protocol</Typography>
                  <Typography variant="body1" gutterBottom>
                    {protocolDetails?.title || protocolId}
                  </Typography>
                  {protocolDetails?.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {protocolDetails.description}
                    </Typography>
                  )}
                </Box>
              )}
              
              {protocolId && batchId && <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />}
              {protocolId && batchId && <Divider sx={{ display: { xs: 'block', md: 'none' }, width: '100%' }} />}
              
              {batchId && (
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Batch</Typography>
                  <Typography variant="body1">
                    Batch Number: <strong>{batchDetails?.batch_number || batchId}</strong>
                  </Typography>
                  {batchDetails?.manufacture_date && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Manufacture Date: {new Date(batchDetails.manufacture_date).toLocaleDateString()}
                    </Typography>
                  )}
                  {batchDetails?.quantity && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Quantity: {batchDetails.quantity}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      )}
      
      <Alert severity="info" sx={{ mb: 3 }}>
        All tests must be associated with a protocol, and optionally with a specific batch. 
        Select the test definition and timepoint, then enter your results.
      </Alert>
      
      <TestResultForm />
    </Box>
  );
}

export default CreateResult;
