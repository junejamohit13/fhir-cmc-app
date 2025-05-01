import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BatchForm from '../components/BatchForm';
import { createBatch, fetchProtocols } from '../services/api';

function CreateBatch() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [protocols, setProtocols] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const protocolsData = await fetchProtocols();
        
        // FHIR returns a Bundle with entries
        let protocolList = [];
        if (protocolsData && protocolsData.resourceType === 'Bundle') {
          if (protocolsData.entry && Array.isArray(protocolsData.entry)) {
            protocolList = protocolsData.entry
              .filter(entry => entry && entry.resource)
              .map(entry => entry.resource);
          }
        }
        
        setProtocols(protocolList);
      } catch (error) {
        console.error('Error loading protocols:', error);
        setError('Failed to load protocols. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (batchData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await createBatch(batchData);
      
      // Navigate back to the batches list with a state flag to trigger refresh
      // and highlight the newly created batch
      navigate('/batches', { 
        state: { 
          refresh: true, 
          newItemId: response.id 
        } 
      });
    } catch (error) {
      console.error('Error creating batch:', error);
      setError('Failed to create batch. Please try again.');
      setSubmitting(false);
    }
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
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/batches')}
        >
          Back to Batches
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Batch
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <BatchForm 
          onSubmit={handleSubmit} 
          protocols={protocols}
        />
      </Paper>
    </Box>
  );
}

export default CreateBatch;