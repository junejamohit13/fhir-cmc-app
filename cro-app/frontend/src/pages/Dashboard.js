import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Inventory as InventoryIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { getProtocols, getBatches, getResults } from '../services/api';

function Dashboard() {
  const [counts, setCounts] = useState({
    protocols: 0,
    batches: 0,
    results: 0,
  });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [protocolsRes, batchesRes, resultsRes] = await Promise.all([
          getProtocols(),
          getBatches(),
          getResults(),
        ]);

        setCounts({
          protocols: protocolsRes.data.length,
          batches: batchesRes.data.length,
          results: resultsRes.data.length,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchCounts();
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: '#bbdefb',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="h6" component="div">
                Shared Protocols
              </Typography>
              <DescriptionIcon fontSize="large" />
            </Box>
            <Typography variant="h3" component="div" sx={{ mt: 2 }}>
              {counts.protocols}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: '#c8e6c9',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="h6" component="div">
                Test Batches
              </Typography>
              <InventoryIcon fontSize="large" />
            </Box>
            <Typography variant="h3" component="div" sx={{ mt: 2 }}>
              {counts.batches}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: '#ffecb3',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="h6" component="div">
                Test Results
              </Typography>
              <AssessmentIcon fontSize="large" />
            </Box>
            <Typography variant="h3" component="div" sx={{ mt: 2 }}>
              {counts.results}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="div">
                  Quick Actions
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/protocols"
                  startIcon={<DescriptionIcon />}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  View Shared Protocols
                </Button>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/batches/create"
                  startIcon={<AddIcon />}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Create New Batch
                </Button>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/results/create"
                  startIcon={<AddIcon />}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Submit Test Result
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                CRO Workflow
              </Typography>
              <Box sx={{ ml: 2 }}>
                <Typography gutterBottom>1. Receive shared protocols from sponsors</Typography>
                <Typography gutterBottom>2. Create batches for testing</Typography>
                <Typography gutterBottom>3. Conduct tests according to protocol</Typography>
                <Typography gutterBottom>4. Submit test results</Typography>
                <Typography gutterBottom>5. Report results back to sponsors</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
