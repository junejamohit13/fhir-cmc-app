import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import ProtocolForm from '../components/ProtocolForm';
import { fetchProtocolById, updateProtocol } from '../services/api';

function EditProtocol() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [protocolData, setProtocolData] = useState(null);

  useEffect(() => {
    const getProtocolDetails = async () => {
      try {
        setLoading(true);
        const data = await fetchProtocolById(id);
        setProtocolData(data);
        setError(null);
      } catch (error) {
        console.error(`Error fetching protocol ${id}:`, error);
        setError('Failed to load protocol details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    getProtocolDetails();
  }, [id]);

  const handleProtocolDataChange = (newData) => {
    setProtocolData(newData);
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);
      await updateProtocol(id, protocolData);
      navigate(`/protocols/${id}`);
    } catch (error) {
      console.error('Error updating protocol:', error);
      setError('Failed to update protocol. Please check your data and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !protocolData) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/protocols')}
          sx={{ mt: 2 }}
        >
          Back to Protocols
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/protocols/${id}`)}
        >
          Back to Protocol
        </Button>
      </Box>

      <Typography variant="h4" component="h1" gutterBottom>
        Edit Protocol
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {protocolData && (
        <>
          <ProtocolForm
            protocolData={protocolData}
            onChange={handleProtocolDataChange}
            isEdit={true}
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              onClick={() => navigate(`/protocols/${id}`)}
              variant="outlined"
              sx={{ mr: 2 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="primary"
              disabled={saving}
              startIcon={saving && <CircularProgress size={24} />}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}

export default EditProtocol;
