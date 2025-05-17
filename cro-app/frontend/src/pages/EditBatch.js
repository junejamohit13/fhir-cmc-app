import React from 'react';
import { Typography, Box } from '@mui/material';
import BatchForm from '../components/BatchForm';

function EditBatch() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Edit Batch
      </Typography>
      <BatchForm isEdit={true} />
    </Box>
  );
}

export default EditBatch; 