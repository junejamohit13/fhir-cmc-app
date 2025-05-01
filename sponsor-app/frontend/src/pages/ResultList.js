import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  AssignmentTurnedIn as AssignmentIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { fetchResults, fetchBatches, fetchTests, fetchOrganizations, deleteResult } from '../services/api';

function ResultList() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [batches, setBatches] = useState([]);
  const [tests, setTests] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [filterBatch, setFilterBatch] = useState('');
  const [filterTest, setFilterTest] = useState('');
  const [filterOrg, setFilterOrg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [resultsData, batchesData, testsData, orgsData] = await Promise.all([
        fetchResults(filterBatch, filterTest, filterOrg),
        fetchBatches(),
        fetchTests(),
        fetchOrganizations()
      ]);
      
      // Process results
      let resultsList = [];
      if (resultsData && resultsData.resourceType === 'Bundle') {
        if (resultsData.entry && Array.isArray(resultsData.entry)) {
          resultsList = resultsData.entry
            .filter(entry => entry && entry.resource)
            .map(entry => entry.resource);
        }
      }
      setResults(resultsList);
      
      // Process batches
      let batchesList = [];
      if (batchesData && batchesData.resourceType === 'Bundle') {
        if (batchesData.entry && Array.isArray(batchesData.entry)) {
          batchesList = batchesData.entry
            .filter(entry => entry && entry.resource)
            .map(entry => entry.resource);
        }
      }
      setBatches(batchesList);
      
      // Process tests
      let testsList = [];
      if (testsData && testsData.resourceType === 'Bundle') {
        if (testsData.entry && Array.isArray(testsData.entry)) {
          testsList = testsData.entry
            .filter(entry => entry && entry.resource)
            .map(entry => entry.resource);
        }
      }
      setTests(testsList);
      
      // Process organizations
      let orgsList = [];
      if (orgsData && orgsData.resourceType === 'Bundle') {
        if (orgsData.entry && Array.isArray(orgsData.entry)) {
          orgsList = orgsData.entry
            .filter(entry => entry && entry.resource)
            .map(entry => entry.resource);
        }
      }
      setOrganizations(orgsList);
      
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load test results. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Load data when filter changes
  useEffect(() => {
    console.log('ResultList: Filters changed, reloading data');
    loadData();
  }, [filterBatch, filterTest, filterOrg]);
  
  // Set up refresh timer
  useEffect(() => {
    console.log("ResultList component mounted");
    
    // Set up automatic refresh every 30 seconds
    const refreshTimer = setInterval(() => {
      console.log("Auto-refreshing results list");
      loadData();
    }, 30000);
    
    // Clear interval when component unmounts
    return () => {
      console.log("ResultList component unmounting, clearing timer");
      clearInterval(refreshTimer);
    };
  }, []); // Only run on mount

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this test result?')) {
      try {
        await deleteResult(id);
        await loadData(); // Reload the list
      } catch (error) {
        console.error('Error deleting result:', error);
        setError('Failed to delete test result. Please try again.');
      }
    }
  };

  const getTestName = (result) => {
    if (!result.extension) return 'Unknown Test';
    
    const testExt = result.extension.find(ext => 
      ext.url === 'http://example.org/fhir/StructureDefinition/test-definition'
    );
    
    if (testExt && testExt.valueReference) {
      const testId = testExt.valueReference.reference.split('/')[1];
      const test = tests.find(t => t.id === testId);
      return test ? test.title || test.name : 'Unknown Test';
    }
    
    return 'Unknown Test';
  };

  const getBatchName = (result) => {
    if (!result.device || !result.device.reference) return 'Unknown Batch';
    
    const batchId = result.device.reference.split('/')[1];
    const batch = batches.find(b => b.id === batchId);
    
    if (batch) {
      if (batch.deviceName && batch.deviceName.length > 0) {
        return batch.deviceName[0].name;
      }
      return batch.lotNumber || batch.id;
    }
    
    return 'Unknown Batch';
  };

  const getOrganizationName = (result) => {
    if (!result.extension) return 'Unknown';
    
    const orgExt = result.extension.find(ext => 
      ext.url === 'http://example.org/fhir/StructureDefinition/result-organization'
    );
    
    if (orgExt && orgExt.valueReference) {
      const orgId = orgExt.valueReference.reference.split('/')[1];
      const org = organizations.find(o => o.id === orgId);
      return org ? org.name : 'Unknown';
    }
    
    return 'Unknown';
  };

  const isOrgCRO = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    if (!org || !org.extension) return false;
    
    const typeExt = org.extension.find(ext => 
      ext.url === 'http://example.org/fhir/StructureDefinition/organization-type'
    );
    
    return typeExt && typeExt.valueString === 'cro';
  };

  const getResultValue = (result) => {
    try {
      if (result.valueString) {
        // Try to parse as JSON first
        try {
          const jsonValue = JSON.parse(result.valueString);
          return typeof jsonValue === 'object' ? 'Complex data' : jsonValue.toString();
        } catch (e) {
          // Not JSON, return as is
          return result.valueString;
        }
      }
      
      // Check other FHIR value types
      if (result.valueQuantity) {
        return `${result.valueQuantity.value} ${result.valueQuantity.unit || ''}`;
      }
      
      if (result.valueInteger) {
        return result.valueInteger.toString();
      }
      
      if (result.valueBoolean !== undefined) {
        return result.valueBoolean ? 'True' : 'False';
      }
      
      return 'No value';
    } catch (e) {
      console.error('Error parsing result value:', e);
      return 'Error parsing value';
    }
  };

  const getOrgId = (result) => {
    if (!result.extension) return null;
    
    const orgExt = result.extension.find(ext => 
      ext.url === 'http://example.org/fhir/StructureDefinition/result-organization'
    );
    
    if (orgExt && orgExt.valueReference) {
      return orgExt.valueReference.reference.split('/')[1];
    }
    
    return null;
  };

  const currentUserOrganization = ""; // In a real app, this would be set to the current user's organization ID

  // Filter results based on the selected tab
  const filteredResults = tabValue === 0 
    ? results 
    : tabValue === 1 
      ? results.filter(result => {
          const orgId = getOrgId(result);
          return isOrgCRO(orgId);
        })
      : results.filter(result => {
          const orgId = getOrgId(result);
          return !isOrgCRO(orgId);
        });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Test Results
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/results/create')}
        >
          Submit Result
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="All Results" />
          <Tab label="CRO Results" />
          <Tab label="Sponsor Results" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Filter Results
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="batch-filter-label">Batch</InputLabel>
              <Select
                labelId="batch-filter-label"
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
                label="Batch"
              >
                <MenuItem value="">All Batches</MenuItem>
                {batches.map((batch) => (
                  <MenuItem key={batch.id} value={batch.id}>
                    {batch.deviceName?.[0]?.name || batch.lotNumber || batch.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="test-filter-label">Test</InputLabel>
              <Select
                labelId="test-filter-label"
                value={filterTest}
                onChange={(e) => setFilterTest(e.target.value)}
                label="Test"
              >
                <MenuItem value="">All Tests</MenuItem>
                {tests.map((test) => (
                  <MenuItem key={test.id} value={test.id}>
                    {test.title || test.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="org-filter-label">Organization</InputLabel>
              <Select
                labelId="org-filter-label"
                value={filterOrg}
                onChange={(e) => setFilterOrg(e.target.value)}
                label="Organization"
              >
                <MenuItem value="">All Organizations</MenuItem>
                {organizations.map((org) => (
                  <MenuItem key={org.id} value={org.id}>
                    {org.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {filteredResults.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <AssignmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Test Results Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {filterBatch || filterTest || filterOrg 
              ? 'No results match your current filters. Try changing or clearing the filters.'
              : 'Get started by submitting your first test result.'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/results/create')}
          >
            Submit Result
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>Test</TableCell>
                <TableCell>Batch</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Organization</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredResults.map((result) => {
                const orgId = getOrgId(result);
                const isCRO = isOrgCRO(orgId);
                const resultDate = result.effectiveDateTime 
                  ? new Date(result.effectiveDateTime).toLocaleDateString() 
                  : 'Unknown';
                  
                return (
                  <TableRow key={result.id}>
                    <TableCell>{getTestName(result)}</TableCell>
                    <TableCell>{getBatchName(result)}</TableCell>
                    <TableCell>{getResultValue(result)}</TableCell>
                    <TableCell>{resultDate}</TableCell>
                    <TableCell>
                      <Chip 
                        label={result.status} 
                        color={
                          result.status === 'final' ? 'success' :
                          result.status === 'preliminary' ? 'warning' :
                          result.status === 'entered-in-error' ? 'error' : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getOrganizationName(result)}
                        {isCRO && (
                          <Chip 
                            label="CRO" 
                            color="primary" 
                            size="small" 
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => navigate(`/results/${result.id}`)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => navigate(`/results/${result.id}/edit`)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(result.id)}>
                          <DeleteIcon />
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
    </Box>
  );
}

export default ResultList;