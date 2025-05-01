import React from 'react';
import { Typography, Box } from '@mui/material';
import TestResultForm from '../components/TestResultForm';

function CreateResult() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Submit Test Result
      </Typography>
      <TestResultForm />
    </Box>
  );
}

export default CreateResult;
