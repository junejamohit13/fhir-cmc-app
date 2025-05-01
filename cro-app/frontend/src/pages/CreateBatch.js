import React from 'react';
import { Typography, Box } from '@mui/material';
import BatchForm from '../components/BatchForm';

function CreateBatch() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Create New Batch
      </Typography>
      <BatchForm />
    </Box>
  );
}

export default CreateBatch;
