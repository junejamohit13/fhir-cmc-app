import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  CircularProgress,
  Alert,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  FormGroup,
  FormControlLabel,
  Grid,
  Switch,
  Tabs,
  Tab,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { fetchOrganizations, shareProtocol, getProtocolShares, fetchBatches, fetchTests } from '../services/api';

function ShareProtocolDialog({ open, onClose, protocolId, protocolTitle, actions = [] }) {
  const [organizations, setOrganizations] = useState([]);
  const [batches, setBatches] = useState([]);
  const [stabilityTests, setStabilityTests] = useState([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState([]);
  const [selectedTests, setSelectedTests] = useState({});
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [shareResults, setShareResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [shareMode, setShareMode] = useState('fullProtocol'); // 'fullProtocol' or 'specificTests'
  const [shareBatches, setShareBatches] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all organizations
      const orgsData = await fetchOrganizations();
      setOrganizations(orgsData);

      // Fetch protocol batches
      const batchesData = await fetchBatches(protocolId);
      if (batchesData && batchesData.resourceType === 'Bundle' && batchesData.entry) {
        const batchesList = batchesData.entry
          .filter(entry => entry && entry.resource)
          .map(entry => entry.resource);
        setBatches(batchesList);
      } else {
        setBatches([]);
      }
      
      // Fetch stability tests associated with this protocol
      const testsData = await fetchTests(protocolId);
      if (testsData && testsData.resourceType === 'Bundle' && testsData.entry) {
        const testsList = testsData.entry
          .filter(entry => entry && entry.resource)
          .map(entry => entry.resource);
        setStabilityTests(testsList);
        
        // Initialize selected tests object
        const testsObj = {};
        testsList.forEach(test => {
          testsObj[test.id] = false;
        });
        setSelectedTests(testsObj);
      } else {
        setStabilityTests([]);
      }

      // Fetch current shares if protocol ID is available
      if (protocolId) {
        const sharesData = await getProtocolShares(protocolId);
        setSelectedOrgIds(sharesData.map(share => share.id));
      }
    } catch (error) {
      console.error('Error loading share data:', error);
      setError('Failed to load organizations or current shares. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
      // Reset state when dialog opens
      setShareMode('fullProtocol');
      setShowResults(false);
      setShareBatches(true);
      setSelectedBatches([]);
      setTabValue(0);
    }
  }, [open, protocolId]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOrganizationChange = (event) => {
    const { value } = event.target;
    setSelectedOrgIds(value);
  };

  const handleTestSelectionChange = (testId) => {
    setSelectedTests(prev => ({
      ...prev,
      [testId]: !prev[testId]
    }));
  };

  const handleBatchSelectionChange = (event) => {
    const { value } = event.target;
    setSelectedBatches(value);
  };

  const handleSelectAllTests = () => {
    const newSelectedTests = { ...selectedTests };
    
    // Determine if we should select all or deselect all
    const allSelected = Object.values(selectedTests).every(v => v);
    const newValue = !allSelected;
    
    // Set all tests to the new state
    Object.keys(newSelectedTests).forEach(testId => {
      newSelectedTests[testId] = newValue;
    });
    
    setSelectedTests(newSelectedTests);
  };

  const handleSubmit = async () => {
    if (!protocolId) return;

    try {
      setSaving(true);
      setError(null);
      setShowResults(false);
      
      // Prepare sharing data
      const sharingData = {
        organizationIds: selectedOrgIds,
        shareMode: shareMode,
        selectedTests: shareMode === 'specificTests' ? 
          Object.entries(selectedTests)
            .filter(([_, selected]) => selected)
            .map(([id]) => id) : 
          [],
        shareBatches: shareBatches,
        selectedBatches: shareBatches ? selectedBatches : []
      };
      
      // Call API to share protocol
      const response = await shareProtocol(protocolId, sharingData);
      
      // Show results
      if (response.share_results && response.share_results.length > 0) {
        setShareResults(response.share_results);
        setShowResults(true);
      } else {
        // If no detailed results, just close the dialog
        onClose(true); // Pass true to indicate successful share
      }
    } catch (error) {
      console.error('Error sharing protocol:', error);
      setError('Failed to share protocol. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleShareModeChange = (event) => {
    setShareMode(event.target.value);
  };

  const handleShareBatchesChange = (event) => {
    setShareBatches(event.target.checked);
    if (!event.target.checked) {
      setSelectedBatches([]);
    }
  };

  const getSelectedTestsCount = () => {
    return Object.values(selectedTests).filter(selected => selected).length;
  };

  const getBatchName = (batch) => {
    if (batch.deviceName && batch.deviceName.length > 0) {
      return batch.deviceName[0].name;
    }
    return batch.lotNumber || batch.id || 'Unnamed Batch';
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => onClose(false)}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Share Protocol</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {showResults ? (
          <>
            <Typography variant="h6" gutterBottom>
              Sharing Results
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                The protocol has been shared with the selected organizations. Results:
              </Typography>
              
              {shareResults.map((result, index) => (
                <Alert 
                  key={index} 
                  severity={result.success ? "success" : "error"}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2">
                    {result.organization_name || `Organization ${result.organization_id}`}
                  </Typography>
                  <Typography variant="body2">
                    {result.message}
                  </Typography>
                </Alert>
              ))}
            </Box>
          </>
        ) : (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Share protocol "{protocolTitle}" with other organizations
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Select Organizations to Share With:
                </Typography>
                
                {organizations.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 2, mb: 3 }}>
                    No organizations available. Please add organizations first.
                  </Alert>
                ) : (
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel id="share-organizations-label">Organizations</InputLabel>
                    <Select
                      labelId="share-organizations-label"
                      multiple
                      value={selectedOrgIds}
                      onChange={handleOrganizationChange}
                      input={<OutlinedInput label="Organizations" />}
                      renderValue={(selected) => {
                        const selectedNames = organizations
                          .filter(org => selected.includes(org.id))
                          .map(org => org.name);
                        return selectedNames.join(', ');
                      }}
                    >
                      {organizations.map((org) => {
                        // Extract URL from telecom with null checks
                        const telecom = org.telecom || [];
                        const url = telecom.find(t => t?.system === 'url')?.value || '';
                        
                        return (
                          <MenuItem key={org.id} value={org.id}>
                            <Checkbox checked={selectedOrgIds.indexOf(org.id) > -1} />
                            <ListItemText primary={org.name} secondary={url} />
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  What to Share
                </Typography>

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                  <Tabs value={tabValue} onChange={handleTabChange} aria-label="share content tabs">
                    <Tab label="Tests" id="tab-0" />
                    <Tab label="Batches" id="tab-1" />
                  </Tabs>
                </Box>

                {tabValue === 0 && (
                  <>
                    <Box sx={{ mb: 3 }}>
                      <FormControl fullWidth>
                        <InputLabel id="share-mode-label">Share Tests Mode</InputLabel>
                        <Select
                          labelId="share-mode-label"
                          value={shareMode}
                          onChange={handleShareModeChange}
                          label="Share Tests Mode"
                        >
                          <MenuItem value="fullProtocol">Share All Tests</MenuItem>
                          <MenuItem value="specificTests">Share Specific Tests Only</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    {shareMode === 'specificTests' && actions && actions.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Select Tests to Share:
                        </Typography>
                        
                        {stabilityTests.length === 0 ? (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            No stability tests found for this protocol. Please create tests first.
                          </Alert>
                        ) : (
                          <FormGroup>
                            {stabilityTests.map((test) => (
                              <FormControlLabel
                                key={test.id}
                                control={
                                  <Checkbox 
                                    checked={selectedTests[test.id] || false}
                                    onChange={() => handleTestSelectionChange(test.id)}
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body2">
                                      {test.title || `Test ${test.id}`}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {test.description ? 
                                        (test.description.length > 60 ? 
                                          `${test.description.substring(0, 60)}...` : 
                                          test.description) : 
                                        'No description'}
                                    </Typography>
                                  </Box>
                                }
                              />
                            ))}
                          </FormGroup>
                        )}
                        
                        <Box sx={{ mt: 1 }}>
                          <Button 
                            variant="text" 
                            onClick={handleSelectAllTests} 
                            size="small"
                            sx={{ mb: 1 }}
                          >
                            {Object.values(selectedTests).every(v => v) ? 'Deselect All' : 'Select All'}
                          </Button>
                          
                          <Typography variant="caption" color="text.secondary" display="block">
                            Selected {getSelectedTestsCount()} test items
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </>
                )}

                {tabValue === 1 && (
                  <Box sx={{ mb: 3 }}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={shareBatches} 
                          onChange={handleShareBatchesChange}
                          color="primary"
                        />
                      }
                      label="Share Batches with CRO"
                    />
                    
                    {shareBatches && (
                      <>
                        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                          Select Batches to Share:
                        </Typography>
                        
                        {batches.length === 0 ? (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            No batches available for this protocol. Please create batches first.
                          </Alert>
                        ) : (
                          <FormControl fullWidth>
                            <InputLabel id="share-batches-label">Batches</InputLabel>
                            <Select
                              labelId="share-batches-label"
                              multiple
                              value={selectedBatches}
                              onChange={handleBatchSelectionChange}
                              input={<OutlinedInput label="Batches" />}
                              renderValue={(selected) => {
                                const selectedNames = batches
                                  .filter(batch => selected.includes(batch.id))
                                  .map(batch => getBatchName(batch));
                                return selectedNames.join(', ');
                              }}
                            >
                              {batches.map((batch) => (
                                <MenuItem key={batch.id} value={batch.id}>
                                  <Checkbox checked={selectedBatches.indexOf(batch.id) > -1} />
                                  <ListItemText 
                                    primary={getBatchName(batch)} 
                                    secondary={`Lot: ${batch.lotNumber || 'N/A'}`} 
                                  />
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                        
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          Note: Only batches linked to the same medicinal product as this protocol are shown.
                          CRO will be able to add test results for these batches but will not modify batch data.
                        </Typography>
                      </>
                    )}
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {showResults ? (
          <Button onClick={() => onClose(true)} variant="contained" color="primary">
            Close
          </Button>
        ) : (
          <>
            <Button onClick={() => onClose(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained" 
              color="primary"
              disabled={
                loading || 
                saving || 
                organizations.length === 0 || 
                selectedOrgIds.length === 0 || 
                (shareMode === 'specificTests' && tabValue === 0 && getSelectedTestsCount() === 0) ||
                (shareBatches && tabValue === 1 && selectedBatches.length === 0)
              }
            >
              {saving ? 'Sharing...' : 'Share'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default ShareProtocolDialog;