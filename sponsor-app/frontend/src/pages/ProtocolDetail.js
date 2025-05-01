import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';
import { 
  Edit as EditIcon, 
  ArrowBack as ArrowBackIcon, 
  Delete as DeleteIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { fetchProtocolById, deleteProtocol, getProtocolShares } from '../services/api';
import ShareProtocolDialog from '../components/ShareProtocolDialog';

function ProtocolDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [protocol, setProtocol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharedWith, setSharedWith] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [protocolData, sharesData] = await Promise.all([
          fetchProtocolById(id),
          getProtocolShares(id)
        ]);
        setProtocol(protocolData);
        setSharedWith(sharesData);
        setError(null);
      } catch (error) {
        console.error(`Error fetching protocol data ${id}:`, error);
        setError('Failed to load protocol details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);
  
  const handleShareDialogClose = (success) => {
    setShareDialogOpen(false);
    if (success) {
      // Reload shares after successful sharing
      getProtocolShares(id)
        .then(sharesData => setSharedWith(sharesData))
        .catch(error => console.error('Failed to refresh shares:', error));
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this protocol?')) {
      try {
        await deleteProtocol(id);
        navigate('/protocols');
      } catch (error) {
        setError('Failed to delete protocol. Please try again.');
      }
    }
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

  if (!protocol) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="warning">Protocol not found</Alert>
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/protocols')}
        >
          Back to Protocols
        </Button>
        <Box>
          <Button
            variant="outlined"
            startIcon={<ShareIcon />}
            onClick={() => setShareDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Share
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/protocols/${id}/edit`)}
            sx={{ mr: 1 }}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h4" component="h1" gutterBottom>
              {protocol.title}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" component="div">
              <strong>ID:</strong> {protocol.id}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" component="div">
              <strong>Version:</strong> {protocol.version}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" component="div">
              <strong>Status:</strong>{' '}
              <Chip
                label={protocol.status || 'Unknown'}
                color={
                  protocol.status === 'active'
                    ? 'success'
                    : protocol.status === 'draft'
                    ? 'warning'
                    : 'default'
                }
                size="small"
              />
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" component="div">
              <strong>Date:</strong> {new Date(protocol.date).toLocaleDateString()}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" component="div" gutterBottom>
              <strong>Description:</strong>
            </Typography>
            <Typography variant="body1" paragraph>
              {protocol.description}
            </Typography>
          </Grid>

          {protocol.subjectReference && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" component="div" gutterBottom>
                <strong>Subject Reference:</strong>
              </Typography>
              <Typography variant="body1">
                {protocol.subjectReference.reference}
              </Typography>
            </Grid>
          )}

          {protocol.note && protocol.note.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" component="div" gutterBottom>
                <strong>Notes:</strong>
              </Typography>
              <List dense>
                {protocol.note.map((note, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={note.text} />
                  </ListItem>
                ))}
              </List>
            </Grid>
          )}

          {protocol.extension && protocol.extension.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" component="div" gutterBottom>
                <strong>Extensions:</strong>
              </Typography>
              <List dense>
                {protocol.extension.map((ext, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={ext.url}
                      secondary={
                        ext.valueCodeableConcept
                          ? ext.valueCodeableConcept.text
                          : JSON.stringify(ext.value)
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          )}
        </Grid>
      </Paper>

      {protocol.action && protocol.action.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Stability Conditions
          </Typography>
          <Grid container spacing={3}>
            {protocol.action.map((condition, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card>
                  <CardHeader
                    title={condition.title}
                    subheader={condition.description}
                  />
                  <CardContent>
                    {condition.action && condition.action.length > 0 && (
                      <>
                        <Typography variant="subtitle1" gutterBottom>
                          Time Points:
                        </Typography>
                        <List dense>
                          {condition.action.map((timepoint, tpIndex) => (
                            <ListItem key={tpIndex}>
                              <ListItemText
                                primary={timepoint.title}
                                secondary={
                                  timepoint.timingTiming?.repeat?.boundsDuration
                                    ? `${timepoint.timingTiming.repeat.boundsDuration.value} ${timepoint.timingTiming.repeat.boundsDuration.unit}`
                                    : ''
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      
      {/* Shared Organizations Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2">
            Shared With Organizations
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ShareIcon />}
            onClick={() => setShareDialogOpen(true)}
            size="small"
          >
            Manage Sharing
          </Button>
        </Box>
        
        {sharedWith.length > 0 ? (
          <Paper>
            <List>
              {sharedWith.map((org) => (
                <ListItem key={org.id}>
                  <ListItemText 
                    primary={org.name} 
                    secondary={`${org.url || "No URL specified"}`} 
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        ) : (
          <Paper sx={{ p: 2 }}>
            <Typography variant="body1" color="text.secondary" align="center">
              This protocol is not shared with any organizations yet.
              Click "Manage Sharing" to share it with external organizations.
            </Typography>
          </Paper>
        )}
      </Box>
      
      {/* Share Dialog */}
      <ShareProtocolDialog
        open={shareDialogOpen}
        onClose={handleShareDialogClose}
        protocolId={id}
        protocolTitle={protocol?.title}
        actions={protocol?.action || []}
      />
    </Box>
  );
}

export default ProtocolDetail;
