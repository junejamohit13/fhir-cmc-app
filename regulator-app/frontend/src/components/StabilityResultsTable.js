import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';

const StabilityResultsTable = () => {
  const [protocol, setProtocol] = useState('test-protocol');
  const [sponsor, setSponsor] = useState('default-sponsor');

  // Hardcoded stability results for 32p81 CMC
  const mockResults = [
    {
      id: 1,
      test_type: 'Appearance',
      condition: '25°C/60%RH',
      batch_id: 'BATCH-001',
      timepoint: '0 months',
      result_value: 'Clear, colorless solution',
      unit: '',
      acceptance_criteria: 'Clear, colorless solution',
      status: 'Pass',
      test_date: '2024-03-01',
      sponsor: 'Confirmed',
      cro: 'Confirmed',
      comments: 'Both sponsor and CRO results match'
    },
    {
      id: 2,
      test_type: 'Appearance',
      condition: '25°C/60%RH',
      batch_id: 'BATCH-001',
      timepoint: '3 months',
      result_value: 'Clear, colorless solution',
      unit: '',
      acceptance_criteria: 'Clear, colorless solution',
      status: 'Pass',
      test_date: '2024-06-01',
      sponsor: 'Confirmed',
      cro: 'Confirmed',
      comments: 'Both sponsor and CRO results match'
    },
    {
      id: 3,
      test_type: 'pH',
      condition: '25°C/60%RH',
      batch_id: 'BATCH-001',
      timepoint: '0 months',
      result_value: '6.8',
      unit: '',
      acceptance_criteria: '6.5-7.5',
      status: 'Pass',
      test_date: '2024-03-01',
      sponsor: 'Confirmed',
      cro: 'Confirmed',
      comments: 'Both sponsor and CRO results match'
    },
    {
      id: 4,
      test_type: 'pH',
      condition: '25°C/60%RH',
      batch_id: 'BATCH-001',
      timepoint: '3 months',
      result_value: '6.9',
      unit: '',
      acceptance_criteria: '6.5-7.5',
      status: 'Pass',
      test_date: '2024-06-01',
      sponsor: 'Confirmed',
      cro: 'Confirmed',
      comments: 'Both sponsor and CRO results match'
    },
    {
      test_type: 'Assay',
      condition: '25°C/60%RH',
      batch_id: 'BATCH-001',
      timepoint: '0 months',
      result_value: '98.5',
      unit: '%',
      acceptance_criteria: '95.0-105.0%',
      status: 'Pass',
      test_date: '2024-03-01',
      sponsor: 'Confirmed',
      cro: 'Confirmed',
      comments: 'Both sponsor and CRO results match'
    },
    {
      id: 6,
      test_type: 'Assay',
      condition: '25°C/60%RH',
      batch_id: 'BATCH-001',
      timepoint: '3 months',
      result_value: '97.8',
      unit: '%',
      acceptance_criteria: '95.0-105.0%',
      status: 'Pass',
      test_date: '2024-06-01',
      sponsor: 'Confirmed',
      cro: 'Confirmed',
      comments: 'Both sponsor and CRO results match'
    }
  ];

  // Group results by test type and condition
  const groupedResults = mockResults.reduce((acc, result) => {
    const key = `${result.test_type}-${result.condition}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(result);
    return acc;
  }, {});

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Regulator View
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="protocol-select-label">Protocol</InputLabel>
            <Select
              labelId="protocol-select-label"
              id="protocol-select"
              value={protocol}
              label="Protocol"
              onChange={(e) => setProtocol(e.target.value)}
            >
              <MenuItem value="test-protocol">Test Protocol</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="sponsor-select-label">Sponsor</InputLabel>
            <Select
              labelId="sponsor-select-label"
              id="sponsor-select"
              value={sponsor}
              label="Sponsor"
              onChange={(e) => setSponsor(e.target.value)}
            >
              <MenuItem value="default-sponsor">Default Sponsor</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {Object.entries(groupedResults).map(([key, groupResults]) => {
        const [testType, condition] = key.split('-');
        
        return (
          <Box key={key} mb={4}>
            <Typography variant="h6" gutterBottom>
              {testType} - {condition}
            </Typography>
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Batch</TableCell>
                    <TableCell>Timepoint</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Acceptance Criteria</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Test Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>{result.batch_id}</TableCell>
                      <TableCell>{result.timepoint}</TableCell>
                      <TableCell>
                        {result.result_value} {result.unit}
                      </TableCell>
                      <TableCell>{result.acceptance_criteria}</TableCell>
                      <TableCell>{result.status}</TableCell>
                      <TableCell>{new Date(result.test_date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );
      })}
    </Box>
  );
};

export default StabilityResultsTable; 