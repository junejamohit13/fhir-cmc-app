import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Button,
  Chip,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { fetchProtocols, deleteProtocol } from '../services/api';

function ProtocolList() {
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const getProtocols = async () => {
    try {
      setLoading(true);
      const data = await fetchProtocols();
      setProtocols(data.entry?.map(entry => entry.resource) || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching protocols:', error);
      setError('Failed to load protocols. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch protocols on component mount
  useEffect(() => {
    console.log("ProtocolList component mounted");
    getProtocols();
    
    // Single refresh timer with longer interval (30 seconds)
    const refreshTimer = setInterval(() => {
      console.log("Auto-refreshing protocols list");
      getProtocols();
    }, 30000);
    
    // Clear interval when component unmounts
    return () => {
      console.log("ProtocolList component unmounting, clearing timer");
      clearInterval(refreshTimer);
    };
  }, []); // Only run on mount
  
  // Handle location state changes in a separate effect
  useEffect(() => {
    // Check if we have a newly created protocol to highlight
    if (location.state?.refresh) {
      console.log("Location state refresh detected");
      
      // Set the highlighted ID if it exists in the state
      if (location.state.newProtocolId) {
        setHighlightedId(location.state.newProtocolId);
        console.log("Setting highlighted ID to", location.state.newProtocolId);
        
        // Clear highlight after a timeout
        setTimeout(() => {
          setHighlightedId(null);
        }, 5000);
        
        // Reload protocols once
        getProtocols();
      }
      
      // Clear the navigation state to prevent re-running on future renders
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const handleViewProtocol = (id) => {
    navigate(`/protocols/${id}`);
  };

  const handleEditProtocol = (id) => {
    navigate(`/protocols/${id}/edit`);
  };

  const handleDeleteProtocol = async (id) => {
    if (window.confirm('Are you sure you want to delete this protocol?')) {
      try {
        await deleteProtocol(id);
        // Refresh the list
        getProtocols();
      } catch (error) {
        setError('Failed to delete protocol. Please try again.');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'draft':
        return 'warning';
      case 'retired':
        return 'error';
      default:
        return 'default';
    }
  };

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
          Stability Protocols
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/protocols/create')}
        >
          New Protocol
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {protocols.length === 0 && !error ? (
        <Alert severity="info">
          No protocols found. Create your first protocol to get started.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table aria-label="protocols table">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {protocols.map((protocol) => (
                <TableRow 
                  key={protocol.id}
                  sx={{
                    backgroundColor: highlightedId === protocol.id ? 'rgba(144, 202, 249, 0.3)' : 'inherit',
                    transition: 'background-color 0.5s ease'
                  }}
                >
                  <TableCell component="th" scope="row">
                    {protocol.title}
                  </TableCell>
                  <TableCell>{protocol.id}</TableCell>
                  <TableCell>{protocol.version}</TableCell>
                  <TableCell>
                    <Chip
                      label={protocol.status || 'Unknown'}
                      color={getStatusColor(protocol.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(protocol.date).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton
                        onClick={() => handleViewProtocol(protocol.id)}
                        size="small"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        onClick={() => handleEditProtocol(protocol.id)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        onClick={() => handleDeleteProtocol(protocol.id)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default ProtocolList;
