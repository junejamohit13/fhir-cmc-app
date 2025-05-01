import React from 'react';
import { Typography, Grid, Paper, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Add as AddIcon, List as ListIcon } from '@mui/icons-material';

function Dashboard() {
  const navigate = useNavigate();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Protocol Management Dashboard
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Manage stability protocols and interact with FHIR resources
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 240,
              justifyContent: 'space-between',
            }}
          >
            <div>
              <Typography variant="h6" component="h2" gutterBottom>
                Manage Protocols
              </Typography>
              <Typography variant="body1">
                View, edit, and delete existing stability protocols
              </Typography>
            </div>
            <Button
              variant="contained"
              startIcon={<ListIcon />}
              onClick={() => navigate('/protocols')}
              sx={{ alignSelf: 'flex-start' }}
            >
              View Protocols
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 240,
              justifyContent: 'space-between',
            }}
          >
            <div>
              <Typography variant="h6" component="h2" gutterBottom>
                Create New Protocol
              </Typography>
              <Typography variant="body1">
                Define a new stability protocol with custom timepoints and conditions
              </Typography>
            </div>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate('/protocols/create')}
              sx={{ alignSelf: 'flex-start' }}
            >
              Create Protocol
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
