import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import { getProtocols, createBatch } from '../services/api';

function BatchForm() {
  const navigate = useNavigate();
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(false);
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
  }, []);

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
      await createBatch(formData);
      navigate('/batches');
    } catch (error) {
      console.error('Error creating batch:', error);
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Create New Batch
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
                  {protocols.map((protocol) => (
                    <MenuItem key={protocol.id} value={protocol.id}>
                      {protocol.title}
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
              Create Batch
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default BatchForm;
