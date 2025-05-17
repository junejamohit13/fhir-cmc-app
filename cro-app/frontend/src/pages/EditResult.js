import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TestResultForm from '../components/TestResultForm';
import { getResult } from '../services/api';

function EditResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const response = await getResult(id);
        setResult(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching test result:', error);
        setError('Failed to load test result. Please try again later.');
        setLoading(false);
      }
    };

    fetchResult();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ my: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/results')}
        >
          Back to Results
        </Button>
      </Box>
    );
  }

  if (result && result.shared_with_sponsor) {
    return (
      <Box sx={{ my: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This test result has been shared with the sponsor and cannot be edited.
        </Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/results')}
        >
          Back to Results
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/results')}
          sx={{ mb: 2 }}
        >
          Back to Results
        </Button>
        <Typography variant="h4" gutterBottom>
          Edit Test Result
        </Typography>
      </Box>
      
      {result && (
        <TestResultForm isEdit={true} initialData={result} />
      )}
    </Box>
  );
}

export default EditResult; 