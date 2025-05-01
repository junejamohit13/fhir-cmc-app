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
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { getResults, deleteResult, shareResult, getBatch, getProtocol } from '../services/api';

function ResultList() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [batchMap, setBatchMap] = useState({});
  const [testMap, setTestMap] = useState({});
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [shareNotes, setShareNotes] = useState('');
  const [finalizeResult, setFinalizeResult] = useState(true);
  const [sharingInProgress, setSharingInProgress] = useState(false);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await getResults();
      setResults(response.data);
      
      // Fetch batch and test data for each result
      const batches = {};
      const tests = { ...testDefinitions }; // Start with our mock definitions
      const batchPromises = [];
      const protocolPromises = [];
      
      // Create a set of unique batch IDs and protocol IDs
      const uniqueBatchIds = new Set();
      const uniqueProtocolIds = new Set();
      
      response.data.forEach(result => {
        if (result.batch_id) uniqueBatchIds.add(result.batch_id);
        if (result.protocol_id) uniqueProtocolIds.add(result.protocol_id);
      });
      
      // Fetch batch data
      for (const batchId of uniqueBatchIds) {
        batchPromises.push(
          getBatch(batchId)
            .then(res => { batches[batchId] = res.data; })
            .catch(err => console.error(`Error fetching batch ${batchId}:`, err))
        );
      }
      
      // Fetch protocol data (to get test definitions)
      for (const protocolId of uniqueProtocolIds) {
        protocolPromises.push(
          getProtocol(protocolId)
            .then(res => {
              const protocol = res.data;
              if (protocol && protocol.action) {
                protocol.action.forEach(condition => {
                  if (condition.id) {
                    tests[condition.id] = condition.title || `Test ${condition.id}`;
                  }
                  
                  if (condition.action) {
                    condition.action.forEach(timepoint => {
                      if (timepoint.id) {
                        tests[timepoint.id] = timepoint.title || `Timepoint ${timepoint.id}`;
                      }
                    });
                  }
                });
              }
            })
            .catch(err => console.error(`Error fetching protocol ${protocolId}:`, err))
        );
      }
      
      await Promise.all([...batchPromises, ...protocolPromises]);
      
      setBatchMap(batches);
      setTestMap(tests);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching test results:', error);
      setError('Failed to load test results. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this test result?')) {
      try {
        await deleteResult(id);
        // Refresh the result list
        fetchResults();
      } catch (error) {
        console.error('Error deleting test result:', error);
        alert('Failed to delete test result. Please try again.');
      }
    }
  };

  const openShareDialog = (result) => {
    setSelectedResult(result);
    setShareNotes('');
    setFinalizeResult(true);
    setShareDialogOpen(true);
  };

  const handleShareResult = async () => {
    if (!selectedResult) return;
    
    try {
      setSharingInProgress(true);
      
      // Call API to share the result with additional data
      await shareResult(selectedResult.id, {
        share_with_sponsor: true,
        finalize: finalizeResult,
        notes: shareNotes || ''
      });
      
      // Close dialog and refresh list
      setShareDialogOpen(false);
      setSharingInProgress(false);
      fetchResults();
    } catch (error) {
      console.error('Error sharing result:', error);
      alert('Failed to share result with sponsor. Please try again.');
      setSharingInProgress(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'preliminary':
        return 'warning';
      case 'amended':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  // Mock test definitions - these will be supplemented by actual protocol data
  const testDefinitions = {
    appearance: 'Appearance',
    assay: 'Assay',
    impurity: 'Impurity',
    dissolution: 'Dissolution',
    ph: 'pH',
    weight: 'Weight Variation',
  };

  const getTestName = (testId) => {
    return testMap[testId] || testId;
  };

  const getBatchNumber = (batchId) => {
    return batchMap[batchId]?.batch_number || batchId;
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
        <Typography variant="h4">Test Results</Typography>
        <Button
          variant="contained"
          component={Link}
          to="/results/create"
          startIcon={<AddIcon />}
        >
          Submit Result
        </Button>
      </Box>

      {results.length === 0 ? (
        <Card>
          <CardContent>
            <Typography>No test results have been submitted yet.</Typography>
            <Button
              variant="outlined"
              component={Link}
              to="/results/create"
              startIcon={<AddIcon />}
              sx={{ mt: 2 }}
            >
              Submit Your First Result
            </Button>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Test</TableCell>
                <TableCell>Batch</TableCell>
                <TableCell>Result</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Performed By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>{getTestName(result.test_definition_id)}</TableCell>
                  <TableCell>{getBatchNumber(result.batch_id)}</TableCell>
                  <TableCell>
                    {result.result_value} {result.result_unit}
                  </TableCell>
                  <TableCell>
                    {new Date(result.result_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip
                        label={result.status}
                        color={getStatusColor(result.status)}
                        size="small"
                      />
                      {result.shared_with_sponsor && (
                        <Tooltip title="Shared with sponsor">
                          <CheckCircleIcon color="success" fontSize="small" sx={{ ml: 1 }} />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{result.performed_by}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton aria-label="view" size="small">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton 
                        aria-label="edit" 
                        size="small"
                        disabled={result.shared_with_sponsor}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {!result.shared_with_sponsor && (
                      <Tooltip title="Share with Sponsor">
                        <IconButton 
                          aria-label="share" 
                          size="small" 
                          color="primary"
                          onClick={() => openShareDialog(result)}
                        >
                          <ShareIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton
                        aria-label="delete"
                        size="small"
                        color="error"
                        disabled={result.shared_with_sponsor}
                        onClick={() => !result.shared_with_sponsor && handleDelete(result.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Share Result Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
        <DialogTitle>Share Result with Sponsor</DialogTitle>
        <DialogContent>
          <DialogContentText gutterBottom>
            Share this test result with the sponsor. Once shared, the sponsor will be able to view the result and you will not be able to edit or delete it.
          </DialogContentText>
          
          {selectedResult && (
            <Box sx={{ mb: 2, mt: 2 }}>
              <Typography variant="subtitle2">
                Test: {getTestName(selectedResult.test_definition_id)}
              </Typography>
              <Typography variant="subtitle2">
                Batch: {getBatchNumber(selectedResult.batch_id)}
              </Typography>
              <Typography variant="subtitle2">
                Result: {selectedResult.result_value} {selectedResult.result_unit}
              </Typography>
            </Box>
          )}
          
          <TextField
            label="Notes for Sponsor (Optional)"
            multiline
            rows={3}
            fullWidth
            value={shareNotes}
            onChange={(e) => setShareNotes(e.target.value)}
            sx={{ mb: 2, mt: 2 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={finalizeResult}
                onChange={(e) => setFinalizeResult(e.target.checked)}
                color="primary"
              />
            }
            label={
              selectedResult?.status === 'completed' 
              ? "Result is already marked as completed" 
              : "Mark result as completed when sharing"
            }
            disabled={selectedResult?.status === 'completed'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleShareResult} 
            variant="contained" 
            color="primary"
            disabled={sharingInProgress}
          >
            {sharingInProgress ? 'Sharing...' : 'Share Result'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ResultList;
