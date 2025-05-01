import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Typography,
} from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import { getProtocols } from '../services/api';

function ProtocolList() {
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProtocols = async () => {
      try {
        const response = await getProtocols();
        setProtocols(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching protocols:', error);
        setError('Failed to load protocols. Please try again later.');
        setLoading(false);
      }
    };

    fetchProtocols();
  }, []);

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
      <Typography variant="h4" gutterBottom>
        Shared Protocols
      </Typography>

      {protocols.length === 0 ? (
        <Card>
          <CardContent>
            <Typography>No protocols have been shared with your organization yet.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {protocols.map((protocol) => (
            <Grid item xs={12} md={6} lg={4} key={protocol.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1,
                    }}
                  >
                    <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                      {protocol.title}
                    </Typography>
                    <Chip
                      label={protocol.status}
                      color={protocol.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, minHeight: 60 }}
                  >
                    {protocol.description || 'No description provided'}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="body2">
                      <strong>Sponsor:</strong> {protocol.sponsor}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Shared:</strong>{' '}
                      {new Date(protocol.shared_date).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
                <Box sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="outlined"
                    component={Link}
                    to={`/protocols/${protocol.id}`}
                    startIcon={<VisibilityIcon />}
                    fullWidth
                  >
                    View Details
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default ProtocolList;
