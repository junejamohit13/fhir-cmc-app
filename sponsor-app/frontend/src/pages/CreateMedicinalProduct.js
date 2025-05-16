import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MedicinalProductForm from '../components/MedicinalProductForm';
import { createMedicinalProduct, fetchOrganizations } from '../services/api';

function CreateMedicinalProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const orgData = await fetchOrganizations();
        
        // Process organizations data
        let orgList = [];
        if (orgData && Array.isArray(orgData)) {
          orgList = orgData;
        } else if (orgData && orgData.resourceType === 'Bundle' && orgData.entry) {
          orgList = orgData.entry
            .filter(entry => entry && entry.resource)
            .map(entry => entry.resource);
        }
        
        setOrganizations(orgList);
      } catch (error) {
        console.error('Error loading organizations:', error);
        setError('Failed to load organizations. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (productData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await createMedicinalProduct(productData);
      
      // Pass the new medicinal product directly to avoid FHIR search caching issues
      navigate('/medicinal-products', { 
        state: { 
          refresh: true, 
          newItemId: response.id,
          newProduct: response // Pass the complete product to add to the list
        } 
      });
    } catch (error) {
      console.error('Error creating medicinal product:', error);
      setError('Failed to create medicinal product. Please try again.');
      setSubmitting(false);
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
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/medicinal-products')}
        >
          Back to Products
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Medicinal Product
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <MedicinalProductForm 
          onSubmit={handleSubmit} 
          organizations={organizations}
        />
      </Paper>
    </Box>
  );
}

export default CreateMedicinalProduct; 