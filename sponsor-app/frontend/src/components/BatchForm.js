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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

function BatchForm({ initialData = {}, onSubmit, medicinalProducts = [], isEdit = false }) {
  const [batchData, setBatchData] = useState({
    name: '',
    identifier: '',
    medicinal_product_id: '',
    lot_number: '',
    manufacturing_date: null,
    expiry_date: null,
    status: 'active',
    ...initialData
  });

  // Log the initial state
  useEffect(() => {
    console.log('BatchForm mounted');
    // Only log initial state in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Initial state:', batchData);
    }
  }, []);

  useEffect(() => {
    // Skip processing if initialData is an empty object (default value)
    if (initialData && Object.keys(initialData).length > 0) {
      const updatedData = { ...initialData };
      
      if (initialData.manufacturing_date) {
        try {
          updatedData.manufacturing_date = new Date(initialData.manufacturing_date);
        } catch (e) {
          console.error("Invalid manufacturing date:", initialData.manufacturing_date);
          updatedData.manufacturing_date = null;
        }
      }
      
      if (initialData.expiry_date) {
        try {
          updatedData.expiry_date = new Date(initialData.expiry_date);
        } catch (e) {
          console.error("Invalid expiry date:", initialData.expiry_date);
          updatedData.expiry_date = null;
        }
      }
      
      setBatchData(updatedData);
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Processed initialData');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount, not on every initialData change

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Change: ${name}`);
    }
    
    // Using functional update to ensure we're working with the latest state
    setBatchData(prevData => {
      const newData = {
        ...prevData,
        [name]: value
      };
      return newData;
    });
  };

  const handleDateChange = (name, date) => {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Date change: ${name}`);
    }
    
    setBatchData(prevData => ({
      ...prevData,
      [name]: date
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submissionData = { ...batchData };
    
    if (submissionData.manufacturing_date instanceof Date) {
      submissionData.manufacturing_date = submissionData.manufacturing_date.toISOString().split('T')[0];
    }
    
    if (submissionData.expiry_date instanceof Date) {
      submissionData.expiry_date = submissionData.expiry_date.toISOString().split('T')[0];
    }
    
    // Log the exact data being submitted
    console.log('SUBMISSION DATA:', JSON.stringify(submissionData, null, 2));
    
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Submitting batch');
    }
    
    onSubmit(submissionData);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box component="form" onSubmit={handleSubmit} noValidate autoComplete="off">
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Batch Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Batch Name"
                name="name"
                value={batchData.name || ''}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Batch Identifier"
                name="identifier"
                value={batchData.identifier || ''}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Lot Number"
                name="lot_number"
                value={batchData.lot_number || ''}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  id="status-select"
                  name="status"
                  value={batchData.status || 'active'}
                  onChange={handleChange}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="entered-in-error">Entered in Error</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="medicinal-product-label">Medicinal Product</InputLabel>
                <Select
                  labelId="medicinal-product-label"
                  id="medicinal-product-select"
                  name="medicinal_product_id"
                  value={batchData.medicinal_product_id || ''}
                  onChange={handleChange}
                  label="Medicinal Product"
                  required
                >
                  <MenuItem value="">
                    <em>Select a Medicinal Product</em>
                  </MenuItem>
                  {medicinalProducts.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name && product.name[0] ? product.name[0].productName : product.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Manufacturing Date"
                value={batchData.manufacturing_date}
                onChange={(date) => handleDateChange('manufacturing_date', date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Expiry Date"
                value={batchData.expiry_date}
                onChange={(date) => handleDateChange('expiry_date', date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
          </Grid>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            color="primary" 
            type="submit"
            disabled={!batchData.name || !batchData.identifier || !batchData.medicinal_product_id}
          >
            {isEdit ? 'Update Batch' : 'Create Batch'}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}

export default BatchForm;