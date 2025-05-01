import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { fetchOrganizations, deleteOrganization } from '../services/api';

function OrganizationList() {
  const navigate = useNavigate();
  const location = useLocation();

  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);

  /* ------------------------------------------------------------------ */
  /*  Fetch helpers                                                     */
  /* ------------------------------------------------------------------ */
  const loadOrganizations = async () => {
    try {
      setLoading(true);

      const data = await fetchOrganizations(); // ← hits API once
      if (!Array.isArray(data)) {
        console.error('Expected array of organizations, got:', data);
        setError('Invalid data format received from server. Please contact support.');
        setOrganizations([]);
        return;
      }

      setOrganizations(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      let msg = 'Failed to load organizations. Please try again later.';
      if (err?.response?.status) {
        msg += ` (Status: ${err.response.status})`;
      } else if (err?.message) {
        msg += ` (${err.message})`;
      }
      setError(msg);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Mount: fetch once                                                 */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    loadOrganizations(); // immediate request
  }, []); // ← runs only on mount

  /* ------------------------------------------------------------------ */
  /*  When navigating back from Create/Edit                             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (location.state?.refresh) {
      if (location.state.newItemId) {
        setHighlightedId(location.state.newItemId);
        setTimeout(() => setHighlightedId(null), 5000);
      }

      loadOrganizations(); // refresh once
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  /* ------------------------------------------------------------------ */
  /*  Actions                                                           */
  /* ------------------------------------------------------------------ */
  const handleEdit = (id) => navigate(`/organizations/${id}/edit`);

  const handleDelete = (organization) => {
    setOrganizationToDelete(organization);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!organizationToDelete) return;
    try {
      setLoading(true);
      await deleteOrganization(organizationToDelete.id);
      setOrganizations((prev) => prev.filter((o) => o.id !== organizationToDelete.id));
      setDeleteDialogOpen(false);
      setOrganizationToDelete(null);
    } catch (err) {
      console.error(`Error deleting organization ${organizationToDelete.id}:`, err);
      setError('Failed to delete organization. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Organizations
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/organizations/new')}>
          Add Organization
        </Button>
      </Box>

      {/* Errors */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading / Empty */}
      {loading && organizations.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : organizations.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No organizations found. Click “Add Organization” to create one.</Typography>
        </Paper>
      ) : (
        /* Table */
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Name</strong>
                </TableCell>
                <TableCell>
                  <strong>FHIR Server URL</strong>
                </TableCell>
                <TableCell>
                  <strong>API Key</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Actions</strong>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {organizations.map((org) => {
                if (!org?.id || !org?.name) return null;

                const telecom = org.telecom ?? [];
                const url = telecom.find((t) => t?.system === 'url')?.value ?? '';

                const extension = org.extension ?? [];
                const apiKey =
                  extension.find(
                    (e) => e?.url === 'http://example.org/fhir/StructureDefinition/organization-api-key'
                  )?.valueString ?? '';

                return (
                  <TableRow
                    key={org.id}
                    sx={{
                      backgroundColor: highlightedId === org.id ? 'rgba(144, 202, 249, 0.3)' : 'inherit',
                      transition: 'background-color 0.5s ease',
                    }}
                  >
                    <TableCell>{org.name}</TableCell>
                    <TableCell>{url}</TableCell>
                    <TableCell>{apiKey ? '••••••••' : 'None'}</TableCell>
                    <TableCell align="right">
                      <IconButton color="primary" onClick={() => handleEdit(org.id)} disabled={loading}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDelete(org)} disabled={loading}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the organization “{organizationToDelete?.name}”? This action cannot be
            undone, and all protocol shares with this organization will be removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default OrganizationList;
