import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
  Tooltip,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Assignment as AssignmentIcon,
  Science as ScienceIcon,
} from '@mui/icons-material';
import { fetchBatches, deleteBatch } from '../services/api';

function BatchList() {
  const navigate = useNavigate();
  const location = useLocation();

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);

  /* ------------------------------------------------------------------ */
  /*  Fetch helpers                                                     */
  /* ------------------------------------------------------------------ */
  const loadBatches = async () => {
    try {
      setLoading(true);

      const response = await fetchBatches();
      if (response?.resourceType === 'Bundle' && Array.isArray(response.entry)) {
        const batchList = response.entry
          .filter((e) => e?.resource)
          .map((e) => e.resource);
        setBatches(batchList);
      } else {
        setBatches([]);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching batches:', err);
      setError('Failed to load batches. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Mount: fetch once                                                 */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    loadBatches(); // immediate API call
  }, []); // only on first mount

  /* ------------------------------------------------------------------ */
  /*  When navigating back from create/edit                             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (location.state?.refresh) {
      if (location.state.newItemId) {
        setHighlightedId(location.state.newItemId);
        setTimeout(() => setHighlightedId(null), 5000);
      }

      loadBatches(); // refresh once
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                           */
  /* ------------------------------------------------------------------ */
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;
    try {
      await deleteBatch(id);
      await loadBatches();
    } catch (err) {
      console.error('Error deleting batch:', err);
      setError('Failed to delete batch. Please try again.');
    }
  };

  const getBatchName = (batch) => {
    if (batch.code && batch.code.text) {
      return batch.code.text;
    }
    return batch.batch?.lotNumber || batch.id || 'Unnamed Batch';
  };

  const getLotNumber = (batch) => {
    return batch.batch?.lotNumber || 'Not specified';
  };

  const getManufacturingDate = (batch) => {
    // Check only within batch.extension
    if (batch.batch?.extension) {
      const dateExt = batch.batch.extension.find(ext => 
        ext.url === 'http://example.org/fhir/StructureDefinition/manufacturing-date'
      );
      if (dateExt && dateExt.valueDateTime) {
        return dateExt.valueDateTime;
      }
    }
    
    return null;
  };

  const getExpiryDate = (batch) => {
    // Check only the standard FHIR field
    if (batch.batch?.expirationDate) {
      return batch.batch.expirationDate;
    }
    
    return null;
  };

  const getMedicinalProductId = (batch) => {
    // Check in extensions for medicinal product reference
    if (batch.extension && Array.isArray(batch.extension)) {
      const mpExt = batch.extension.find(
        ext => ext.url === 'http://example.org/fhir/StructureDefinition/medicinal-product'
      );
      
      if (mpExt && mpExt.valueReference && mpExt.valueReference.reference) {
        const reference = mpExt.valueReference.reference;
        if (reference.startsWith('MedicinalProductDefinition/')) {
          return reference.split('/')[1];
        }
      }
    }
    
    return null;
  };

  const getProtocolReference = (batch) => {
    if (!batch.extension) return null;
    
    const protocolExt = batch.extension.find(
      (e) => e.url === 'http://example.org/fhir/StructureDefinition/batch-protocol'
    );
    return protocolExt?.valueReference?.reference ?? null;
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Batches</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/batches/create')}
        >
          Create New Batch
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Empty state */}
      {batches.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ScienceIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Batches Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Get started by creating your first batch.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/batches/create')}
          >
            Create Batch
          </Button>
        </Paper>
      ) : (
        /* Cards grid */
        <Grid container spacing={3}>
          {batches.map((batch) => (
            <Grid item xs={12} sm={6} md={4} key={batch.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor:
                    highlightedId === batch.id ? 'rgba(144, 202, 249, 0.3)' : 'inherit',
                  transition: 'background-color 0.5s ease',
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" gutterBottom>
                      {getBatchName(batch)}
                    </Typography>
                    <Chip
                      label={batch.status}
                      color={
                        batch.status === 'active'
                          ? 'success'
                          : batch.status === 'inactive'
                          ? 'warning'
                          : 'default'
                      }
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    <strong>Lot Number:</strong> {getLotNumber(batch)}
                  </Typography>

                  <Divider sx={{ my: 1 }} />

                  <Typography variant="body2" color="text.secondary">
                    <strong>Medicinal Product:</strong> {getMedicinalProductId(batch) ? `ID: ${getMedicinalProductId(batch)}` : 'Not specified'}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    <strong>Protocol:</strong> {getProtocolReference(batch) ? getProtocolReference(batch).split('/')[1] : 'Not specified'}
                  </Typography>

                  {getManufacturingDate(batch) && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Manufacturing Date:</strong>{' '}
                      {new Date(getManufacturingDate(batch)).toLocaleDateString()}
                    </Typography>
                  )}

                  {getExpiryDate(batch) && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Expiry Date:</strong>{' '}
                      {new Date(getExpiryDate(batch)).toLocaleDateString()}
                    </Typography>
                  )}
                </CardContent>

                <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Tooltip title="View Details">
                    <IconButton onClick={() => navigate(`/batches/${batch.id}`)}>
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Add Test Results">
                    <IconButton
                      color="primary"
                      onClick={() => navigate(`/results/create?batch=${batch.id}`)}
                    >
                      <AssignmentIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => navigate(`/batches/${batch.id}/edit`)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton color="error" onClick={() => handleDelete(batch.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default BatchList;
