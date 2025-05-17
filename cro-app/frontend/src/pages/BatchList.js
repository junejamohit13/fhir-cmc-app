import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { getBatches, deleteBatch, getBatch } from '../services/api';

function BatchList() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const navigate = useNavigate();

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await getBatches();
      console.log("Fetched batches:", response.data);
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

  const handleViewBatch = async (id) => {
    try {
      setDetailLoading(true);
      const response = await getBatch(id);
      setSelectedBatch(response.data);
      setViewDialogOpen(true);
      setDetailLoading(false);
    } catch (error) {
      console.error('Error fetching batch details:', error);
      alert('Failed to load batch details. Please try again.');
      setDetailLoading(false);
    }
  };

  const handleEditBatch = (id) => {
    navigate(`/batches/edit/${id}`);
  };

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

  const closeViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedBatch(null);
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
                  <TableCell>
                    {batch.protocol_id ? (
                      <Link to={`/protocols/${batch.protocol_id}`}>
                        {batch.protocol_id}
                      </Link>
                    ) : (
                      'No Protocol'
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(batch.manufacture_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{batch.quantity}</TableCell>
                  <TableCell align="right">
                    <IconButton 
                      aria-label="view" 
                      size="small"
                      onClick={() => handleViewBatch(batch.id)}
                      title="View Batch Details"
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      aria-label="edit" 
                      size="small"
                      onClick={() => handleEditBatch(batch.id)}
                      title="Edit Batch"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label="delete"
                      size="small"
                      onClick={() => handleDelete(batch.id)}
                      title="Delete Batch"
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

      {/* Batch Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={closeViewDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {selectedBatch ? `Batch Details: ${selectedBatch.batch_number}` : 'Batch Details'}
          <IconButton onClick={closeViewDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : selectedBatch ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Batch Number
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBatch.batch_number}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedBatch.status}
                  color={getStatusColor(selectedBatch.status)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Protocol ID
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBatch.protocol_id ? (
                    <Link to={`/protocols/${selectedBatch.protocol_id}`}>
                      {selectedBatch.protocol_id}
                    </Link>
                  ) : (
                    'No Protocol'
                  )}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Manufacture Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedBatch.manufacture_date).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Quantity
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBatch.quantity}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  ID
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBatch.id}
                </Typography>
              </Grid>
            </Grid>
          ) : (
            <Typography>No batch details available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          {selectedBatch && (
            <>
              <Button 
                onClick={() => {
                  closeViewDialog();
                  handleEditBatch(selectedBatch.id);
                }}
                color="primary"
                startIcon={<EditIcon />}
              >
                Edit
              </Button>
              <Button 
                component={Link} 
                to={`/batches/${selectedBatch.id}/results`}
                color="primary"
              >
                View Test Results
              </Button>
            </>
          )}
          <Button onClick={closeViewDialog} color="secondary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default BatchList;
