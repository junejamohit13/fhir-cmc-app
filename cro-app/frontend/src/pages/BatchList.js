import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { getBatches, deleteBatch } from '../services/api';

function BatchList() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBatches = async () => {
    try {
      const response = await getBatches();
      setBatches(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching batches:', error);
      setError('Failed to load batches. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this batch?')) {
      try {
        await deleteBatch(id);
        // Refresh the batch list
        fetchBatches();
      } catch (error) {
        console.error('Error deleting batch:', error);
        alert('Failed to delete batch. Please try again.');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'registered':
        return 'info';
      case 'inactive':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Test Batches</Typography>
        <Button
          variant="contained"
          component={Link}
          to="/batches/create"
          startIcon={<AddIcon />}
        >
          Create Batch
        </Button>
      </Box>

      {batches.length === 0 ? (
        <Card>
          <CardContent>
            <Typography>No test batches have been created yet.</Typography>
            <Button
              variant="outlined"
              component={Link}
              to="/batches/create"
              startIcon={<AddIcon />}
              sx={{ mt: 2 }}
            >
              Create Your First Batch
            </Button>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Batch Number</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Protocol</TableCell>
                <TableCell>Manufacture Date</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>{batch.batch_number}</TableCell>
                  <TableCell>
                    <Chip
                      label={batch.status}
                      color={getStatusColor(batch.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{batch.protocol_id}</TableCell>
                  <TableCell>
                    {new Date(batch.manufacture_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{batch.quantity}</TableCell>
                  <TableCell align="right">
                    <IconButton aria-label="view" size="small">
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton aria-label="edit" size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label="delete"
                      size="small"
                      onClick={() => handleDelete(batch.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default BatchList;
