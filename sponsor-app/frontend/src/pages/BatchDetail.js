import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Paper,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { fetchBatchById, fetchResults, deleteBatch } from '../services/api';

function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadBatchData = async () => {
      try {
        setLoading(true);
        const batchData = await fetchBatchById(id);
        setBatch(batchData);
        
        // Also fetch results for this batch
        const resultsData = await fetchResults(id);
        if (resultsData && resultsData.resourceType === 'Bundle') {
          if (resultsData.entry && Array.isArray(resultsData.entry)) {
            const resultsList = resultsData.entry
              .filter(entry => entry && entry.resource)
              .map(entry => entry.resource);
            
            setResults(resultsList);
          } else {
            setResults([]);
          }
        } else {
          setResults([]);
        }
        
        setError(null);
      } catch (error) {
        console.error('Error fetching batch data:', error);
        setError('Failed to load batch details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadBatchData();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this batch?')) {
      try {
        await deleteBatch(id);
        navigate('/batches', { 
          state: { 
            notification: {
              type: 'success',
              message: 'Batch deleted successfully'
            }
          }
        });
      } catch (error) {
        console.error('Error deleting batch:', error);
        setError('Failed to delete batch. Please try again.');
      }
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
    
    const protocolExt = batch.extension.find(ext => 
      ext.url === 'http://example.org/fhir/StructureDefinition/batch-protocol'
    );
    
    if (protocolExt && protocolExt.valueReference) {
      return protocolExt.valueReference.reference;
    }
    
    return null;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!batch) {
    return (
      <Alert severity="error">
        Batch not found or could not be loaded.
      </Alert>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton
          onClick={() => navigate('/batches')}
          sx={{ mr: 2 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {getBatchName(batch)}
        </Typography>
        <Chip 
          label={batch.status}
          color={
            batch.status === 'active' ? 'success' :
            batch.status === 'inactive' ? 'warning' : 'default'
          }
          size="small"
          sx={{ ml: 2 }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Batch Details
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    ID
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Typography variant="body2">
                    {batch.id}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Lot Number
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Typography variant="body2">
                    {getLotNumber(batch)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Typography variant="body2">
                    {batch.status || 'Not specified'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Manufacturing Date
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Typography variant="body2">
                    {getManufacturingDate(batch) ? new Date(getManufacturingDate(batch)).toLocaleDateString() : 'Not specified'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Expiry Date
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Typography variant="body2">
                    {getExpiryDate(batch) ? new Date(getExpiryDate(batch)).toLocaleDateString() : 'Not specified'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Medicinal Product
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Typography variant="body2">
                    {getMedicinalProductId(batch) ? 
                      <Button 
                        size="small" 
                        onClick={() => navigate(`/medicinal-products/${getMedicinalProductId(batch)}`)}
                      >
                        {getMedicinalProductId(batch)}
                      </Button> : 
                      'Not specified'
                    }
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Protocol
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Typography variant="body2">
                    {getProtocolReference(batch) ? 
                      <Button 
                        size="small" 
                        onClick={() => {
                          const protocolRef = getProtocolReference(batch);
                          if (protocolRef) {
                            const protocolId = protocolRef.split('/')[1];
                            navigate(`/protocols/${protocolId}`);
                          }
                        }}
                      >
                        {getProtocolReference(batch).split('/')[1]}
                      </Button> : 
                      'Not specified'
                    }
                  </Typography>
                </Grid>
              </Grid>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button 
                  startIcon={<EditIcon />} 
                  variant="outlined" 
                  size="small"
                  sx={{ mr: 1 }}
                  onClick={() => navigate(`/batches/${batch.id}/edit`)}
                >
                  Edit
                </Button>
                <Button 
                  startIcon={<DeleteIcon />} 
                  variant="outlined" 
                  color="error" 
                  size="small"
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  Test Results
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  variant="contained"
                  size="small"
                  onClick={() => navigate(`/results/create?batch=${batch.id}`)}
                >
                  Add Result
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {results.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <AssignmentIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No Test Results Found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Add test results to track stability data for this batch.
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => navigate(`/results/create?batch=${batch.id}`)}
                  >
                    Add Result
                  </Button>
                </Paper>
              ) : (
                <Box>
                  {results.map((result) => {
                    // Get test ID and name from extension
                    let testId = '';
                    let testName = 'Unknown Test';
                    if (result.extension) {
                      const testExt = result.extension.find(ext => 
                        ext.url === 'http://example.org/fhir/StructureDefinition/test-definition'
                      );
                      if (testExt && testExt.valueReference) {
                        testId = testExt.valueReference.reference.split('/')[1];
                      }
                    }

                    return (
                      <Paper 
                        key={result.id} 
                        sx={{ p: 2, mb: 2, '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.02)' } }}
                      >
                        <Grid container spacing={2}>
                          <Grid item xs={8}>
                            <Typography variant="subtitle1">
                              {testId ? (
                                <Button 
                                  size="small" 
                                  onClick={() => navigate(`/tests/${testId}`)}
                                  sx={{ p: 0, textAlign: 'left', textTransform: 'none' }}
                                >
                                  {testName}
                                </Button>
                              ) : (
                                testName
                              )}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {result.effectiveDateTime ? 
                                new Date(result.effectiveDateTime).toLocaleDateString() : 
                                'Unknown date'
                              }
                            </Typography>
                          </Grid>
                          <Grid item xs={4} sx={{ textAlign: 'right' }}>
                            <Typography variant="body2">
                              {result.valueString || 'No value'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {result.status || 'Unknown status'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default BatchDetail;