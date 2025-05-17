import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import { getProtocols, createBatch, getBatch, updateBatch } from '../services/api';

function BatchForm({ isEdit = false }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [formData, setFormData] = useState({
    protocol_id: '',
    batch_number: '',
    manufacture_date: '',
    quantity: 0,
    status: 'registered',
  });

  useEffect(() => {
    const fetchProtocols = async () => {
      try {
        const response = await getProtocols();
        setProtocols(response.data);
      } catch (error) {
        console.error('Error fetching protocols:', error);
      }
    };

    fetchProtocols();

    // If in edit mode, fetch the existing batch data
    if (isEdit && id) {
      const fetchBatch = async () => {
        try {
          setInitialLoading(true);
          const response = await getBatch(id);
          const batchData = response.data;
          
          // Format the date properly for the date input (YYYY-MM-DD)
          let formattedDate = batchData.manufacture_date;
          if (formattedDate && formattedDate.includes('T')) {
            formattedDate = formattedDate.split('T')[0];
          }
          
          setFormData({
            protocol_id: batchData.protocol_id || '',
            batch_number: batchData.batch_number || '',
            manufacture_date: formattedDate || '',
            quantity: batchData.quantity || 0,
            status: batchData.status || 'registered',
          });
          setInitialLoading(false);
        } catch (error) {
          console.error('Error fetching batch data:', error);
          setInitialLoading(false);
        }
      };
      
      fetchBatch();
    }
  }, [isEdit, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'quantity' ? parseInt(value, 10) : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        await updateBatch(id, formData);
      } else {
        await createBatch(formData);
      }
      navigate('/batches');
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} batch:`, error);
      setLoading(false);
      alert(`Failed to ${isEdit ? 'update' : 'create'} batch: ${error.message || 'Unknown error'}`);
    }
  };

  if (initialLoading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          {isEdit ? 'Edit Batch' : 'Create New Batch'}
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="protocol-label">Protocol</InputLabel>
                <Select
                  labelId="protocol-label"
                  name="protocol_id"
                  value={formData.protocol_id}
                  onChange={handleChange}
                  required
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {protocols.map((protocol) => (
                    <MenuItem key={protocol.id} value={protocol.id}>
                      {protocol.title} (ID: {protocol.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="batch_number"
                label="Batch Number"
                fullWidth
                required
                value={formData.batch_number}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="manufacture_date"
                label="Manufacture Date"
                type="date"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={formData.manufacture_date}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="quantity"
                label="Quantity"
                type="number"
                fullWidth
                required
                value={formData.quantity}
                onChange={handleChange}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                >
                  <MenuItem value="registered">Registered</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              type="button"
              onClick={() => navigate('/batches')}
              sx={{ mr: 1 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {isEdit ? 'Update Batch' : 'Create Batch'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default BatchForm;
