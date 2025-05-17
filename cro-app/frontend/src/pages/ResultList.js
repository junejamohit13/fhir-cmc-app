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
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  CheckCircle as CheckCircleIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { getResults, deleteResult, shareResult, getBatch, getProtocol, getProtocols } from '../services/api';

function ResultList() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [protocolMap, setProtocolMap] = useState({});
  const [batchMap, setBatchMap] = useState({});
  const [testMap, setTestMap] = useState({});
  const [protocols, setProtocols] = useState([]);
  
  // State for dialogs
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [shareNotes, setShareNotes] = useState('');
  const [finalizeResult, setFinalizeResult] = useState(true);
  const [sharingInProgress, setSharingInProgress] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    protocol_id: '',
    batch_id: '',
    status: '',
    shared: '',
  });
  
  // Generate a list of batches from the filter's selected protocol
  const filteredBatches = filters.protocol_id 
    ? Object.values(batchMap).filter(batch => batch.protocol_id === filters.protocol_id)
    : [];

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await getResults();
      console.log('Fetched results:', response.data);
      setResults(response.data);
      
      // Fetch protocol list for filtering
      const protocolsResponse = await getProtocols();
      setProtocols(protocolsResponse.data);
      
      // Fetch batch and test data for each result
      const batches = {};
      const tests = {};
      const protocols = {};
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
      
      // Fetch protocol data to get test definitions
      for (const protocolId of uniqueProtocolIds) {
        protocolPromises.push(
          getProtocol(protocolId)
            .then(res => {
              const protocol = res.data;
              protocols[protocolId] = protocol;
              
              // Process tests from protocol
              if (protocol && protocol.action) {
                processProtocolTests(protocol, tests);
              }
            })
            .catch(err => console.error(`Error fetching protocol ${protocolId}:`, err))
        );
      }
      
      await Promise.all([...batchPromises, ...protocolPromises]);
      
      setBatchMap(batches);
      setTestMap(tests);
      setProtocolMap(protocols);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching test results:', error);
      setError('Failed to load test results. Please try again later.');
      setLoading(false);
    }
  };
  
  // Helper function to process protocol tests
  const processProtocolTests = (protocol, testsMap) => {
    if (!protocol.action || !Array.isArray(protocol.action)) return;
    
    const processActions = (actions) => {
      actions.forEach(action => {
        // If it's a test 
        if (action.id && (action.type === 'test' || action.code)) {
          testsMap[action.id] = {
            name: action.title || action.code?.text || `Test ${action.id}`,
            type: action.type || 'unknown'
          };
        }
        
        // If it has nested actions
        if (action.action && Array.isArray(action.action)) {
          processActions(action.action);
        }
      });
    };
    
    processActions(protocol.action);
  };

  useEffect(() => {
    fetchResults();
  }, []);
  
  // Filter results based on current filters
  const filteredResults = results.filter(result => {
    if (filters.protocol_id && result.protocol_id !== filters.protocol_id) return false;
    if (filters.batch_id && result.batch_id !== filters.batch_id) return false;
    if (filters.status && result.status !== filters.status) return false;
    if (filters.shared === 'shared' && !result.shared_with_sponsor) return false;
    if (filters.shared === 'not_shared' && result.shared_with_sponsor) return false;
    return true;
  });

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
    setFinalizeResult(result.status !== 'completed');
    setShareDialogOpen(true);
  };
  
  const openViewDialog = (result) => {
    setSelectedResult(result);
    setViewDialogOpen(true);
  };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
    
    // Reset batch filter if protocol changes
    if (name === 'protocol_id' && filters.batch_id) {
      setFilters(prev => ({ ...prev, batch_id: '' }));
    }
  };
  
  const resetFilters = () => {
    setFilters({
      protocol_id: '',
      batch_id: '',
      status: '',
      shared: '',
    });
    setFilterDialogOpen(false);
  };

  const handleShareResult = async () => {
    if (!selectedResult) return;
    
    try {
      setSharingInProgress(true);
      
      // Call API to share the result with additional data
      await shareResult(selectedResult.id, true);
      
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

  const getTestInfo = (testId) => {
    if (!testId) return { name: 'Unknown Test' };
    return testMap[testId] || { name: testId, type: 'unknown' };
  };

  const getBatchNumber = (batchId) => {
    if (!batchId) return 'No Batch';
    return batchMap[batchId]?.batch_number || batchId;
  };
  
  const getProtocolTitle = (protocolId) => {
    if (!protocolId) return 'No Protocol';
    return protocolMap[protocolId]?.title || protocolId;
  };
  
  const handleNewResult = (protocolId, batchId) => {
    const params = new URLSearchParams();
    if (protocolId) params.append('protocol', protocolId);
    if (batchId) params.append('batch', batchId);
    
    navigate(`/results/create?${params.toString()}`);
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

  const hasFiltersApplied = Object.values(filters).some(value => value !== '');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Test Results</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setFilterDialogOpen(true)}
            color={hasFiltersApplied ? "primary" : "inherit"}
          >
            {hasFiltersApplied ? "Filters Applied" : "Filter"}
          </Button>
          <Button
            variant="contained"
            onClick={() => handleNewResult(filters.protocol_id, filters.batch_id)}
            startIcon={<AddIcon />}
          >
            Submit Result
          </Button>
        </Box>
      </Box>

      {filteredResults.length === 0 ? (
        <Card>
          <CardContent>
            <Typography>
              {hasFiltersApplied 
                ? "No test results match the current filters." 
                : "No test results have been submitted yet."}
            </Typography>
            
            {hasFiltersApplied ? (
              <Button
                variant="outlined"
                onClick={resetFilters}
                sx={{ mt: 2 }}
              >
                Clear Filters
              </Button>
            ) : (
              <Button
                variant="outlined"
                component={Link}
                to="/results/create"
                startIcon={<AddIcon />}
                sx={{ mt: 2 }}
              >
                Submit Your First Result
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Test</TableCell>
                <TableCell>Protocol</TableCell>
                <TableCell>Batch</TableCell>
                <TableCell>Result</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Performed By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredResults.map((result) => {
                const testInfo = getTestInfo(result.test_definition_id);
                return (
                  <TableRow key={result.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2">{testInfo.name}</Typography>
                        {testInfo.type && testInfo.type !== 'unknown' && (
                          <Chip size="small" label={testInfo.type} sx={{ mt: 0.5, maxWidth: 'fit-content' }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{getProtocolTitle(result.protocol_id)}</TableCell>
                    <TableCell>{getBatchNumber(result.batch_id)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: result.meets_acceptance_criteria ? 'normal' : 'bold' }}>
                        {result.result_value} {result.result_unit}
                      </Typography>
                      {!result.meets_acceptance_criteria && (
                        <Chip size="small" label="Out of spec" color="error" sx={{ mt: 0.5 }} />
                      )}
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
                        <IconButton 
                          aria-label="view" 
                          size="small"
                          onClick={() => openViewDialog(result)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton 
                          aria-label="edit" 
                          size="small"
                          disabled={result.shared_with_sponsor}
                          component={Link}
                          to={`/results/edit/${result.id}`}
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
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Filter Dialog */}
      <Dialog 
        open={filterDialogOpen} 
        onClose={() => setFilterDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Filter Results</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel id="protocol-filter-label">Protocol</InputLabel>
                <Select
                  labelId="protocol-filter-label"
                  name="protocol_id"
                  value={filters.protocol_id}
                  onChange={handleFilterChange}
                  label="Protocol"
                >
                  <MenuItem value="">All Protocols</MenuItem>
                  {protocols.map(protocol => (
                    <MenuItem key={protocol.id} value={protocol.id}>
                      {protocol.title || protocol.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth disabled={!filters.protocol_id}>
                <InputLabel id="batch-filter-label">Batch</InputLabel>
                <Select
                  labelId="batch-filter-label"
                  name="batch_id"
                  value={filters.batch_id}
                  onChange={handleFilterChange}
                  label="Batch"
                >
                  <MenuItem value="">All Batches</MenuItem>
                  {filteredBatches.map(batch => (
                    <MenuItem key={batch.id} value={batch.id}>
                      {batch.batch_number}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="preliminary">Preliminary</MenuItem>
                  <MenuItem value="amended">Amended</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="shared-filter-label">Shared Status</InputLabel>
                <Select
                  labelId="shared-filter-label"
                  name="shared"
                  value={filters.shared}
                  onChange={handleFilterChange}
                  label="Shared Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="shared">Shared with Sponsor</MenuItem>
                  <MenuItem value="not_shared">Not Shared</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetFilters}>Reset Filters</Button>
          <Button 
            onClick={() => setFilterDialogOpen(false)} 
            variant="contained"
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>

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
                Test: {getTestInfo(selectedResult.test_definition_id).name}
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
      
      {/* View Result Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', pb: 1 }}>
          Test Result Details
          <Chip 
            label={selectedResult?.status || 'Unknown'} 
            color={selectedResult ? getStatusColor(selectedResult.status) : 'default'}
          />
        </DialogTitle>
        <DialogContent dividers>
          {selectedResult && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Test</Typography>
                <Typography variant="body1">{getTestInfo(selectedResult.test_definition_id).name}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Protocol</Typography>
                <Typography variant="body1">{getProtocolTitle(selectedResult.protocol_id)}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Batch</Typography>
                <Typography variant="body1">{getBatchNumber(selectedResult.batch_id)}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Test Date</Typography>
                <Typography variant="body1">{new Date(selectedResult.result_date).toLocaleDateString()}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Result Value</Typography>
                <Typography variant="body1">{selectedResult.result_value} {selectedResult.result_unit}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Performed By</Typography>
                <Typography variant="body1">{selectedResult.performed_by}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Meets Acceptance Criteria</Typography>
                <Typography variant="body1">
                  {selectedResult.meets_acceptance_criteria ? 'Yes' : 'No'}
                  {!selectedResult.meets_acceptance_criteria && (
                    <Chip size="small" label="Out of spec" color="error" sx={{ ml: 1 }} />
                  )}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Shared with Sponsor</Typography>
                <Typography variant="body1">
                  {selectedResult.shared_with_sponsor ? 
                    <Chip icon={<CheckCircleIcon />} label="Shared" color="success" size="small" /> : 
                    'Not Shared'
                  }
                </Typography>
              </Grid>
              
              {selectedResult.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                    <Typography variant="body2">{selectedResult.notes}</Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedResult && !selectedResult.shared_with_sponsor && (
            <Button 
              color="primary"
              startIcon={<ShareIcon />}
              onClick={() => {
                setViewDialogOpen(false);
                openShareDialog(selectedResult);
              }}
            >
              Share with Sponsor
            </Button>
          )}
          {selectedResult && !selectedResult.shared_with_sponsor && (
            <Button 
              component={Link}
              to={`/results/edit/${selectedResult.id}`}
              startIcon={<EditIcon />}
            >
              Edit
            </Button>
          )}
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ResultList;
