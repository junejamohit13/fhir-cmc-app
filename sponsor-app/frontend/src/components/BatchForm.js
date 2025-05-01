import React, { useState } from 'react';
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

function BatchForm({ initialData = {}, onSubmit, protocols = [], isEdit = false }) {
  const [batchData, setBatchData] = useState({
    name: '',
    identifier: '',
    protocol_id: '',
    lot_number: '',
    manufacturing_date: null,
    expiry_date: null,
    status: 'active',
    ...initialData
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBatchData({
      ...batchData,
      [name]: value
    });
  };

  const handleDateChange = (name, date) => {
    setBatchData({
      ...batchData,
      [name]: date ? date.toISOString().split('T')[0] : null
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(batchData);
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
                value={batchData.name}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Batch Identifier"
                name="identifier"
                value={batchData.identifier}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Lot Number"
                name="lot_number"
                value={batchData.lot_number}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  value={batchData.status}
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
                <InputLabel id="protocol-label">Protocol</InputLabel>
                <Select
                  labelId="protocol-label"
                  name="protocol_id"
                  value={batchData.protocol_id}
                  onChange={handleChange}
                  label="Protocol"
                >
                  {protocols.map((protocol) => (
                    <MenuItem key={protocol.id} value={protocol.id}>
                      {protocol.title} (v{protocol.version})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Manufacturing Date"
                value={batchData.manufacturing_date ? new Date(batchData.manufacturing_date) : null}
                onChange={(date) => handleDateChange('manufacturing_date', date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Expiry Date"
                value={batchData.expiry_date ? new Date(batchData.expiry_date) : null}
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
            disabled={!batchData.name || !batchData.identifier || !batchData.protocol_id}
          >
            {isEdit ? 'Update Batch' : 'Create Batch'}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}

export default BatchForm;