import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchMedicinalProducts } from '../services/api';

function MedicinalProductList() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch data on component mount or when location state changes (for refreshing after create/edit)
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchMedicinalProducts();
        
        // FHIR returns a Bundle with entries
        let productList = [];
        if (data && data.resourceType === 'Bundle') {
          if (data.entry && Array.isArray(data.entry)) {
            productList = data.entry
              .filter(entry => entry && entry.resource)
              .map(entry => {
                const resource = entry.resource;
                
                // Extract relevant data from FHIR resource
                return {
                  id: resource.id,
                  name: resource.name && resource.name[0] ? resource.name[0].productName : 'Unnamed Product',
                  status: resource.status || 'unknown',
                  description: resource.description || '',
                  type: resource.type && resource.type.coding && resource.type.coding[0] ? 
                    resource.type.coding[0].code : 'unknown',
                  routes: resource.route ? 
                    resource.route.map(r => r.coding && r.coding[0] ? r.coding[0].code : 'unknown') : []
                };
              });
          }
        }
        
        setProducts(productList);
        setError(null);
      } catch (err) {
        console.error('Error fetching medicinal products:', err);
        setError('Failed to load medicinal products. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    // If we have a new product directly passed in state, add it to the list
    // This helps avoid FHIR server search caching issues
    if (location.state?.newProduct) {
      const newProduct = location.state.newProduct;
      setProducts(prevProducts => {
        // Check if the product is already in the list
        const exists = prevProducts.some(p => p.id === newProduct.id);
        if (!exists) {
          console.log('Adding newly created product to list:', newProduct);
          // Format the new product to match the list format
          const formattedProduct = {
            id: newProduct.id,
            name: newProduct.name && newProduct.name[0] ? newProduct.name[0].productName : 'Unnamed Product',
            status: newProduct.status || 'unknown',
            description: newProduct.description || '',
            type: newProduct.type && newProduct.type.coding && newProduct.type.coding[0] ? 
              newProduct.type.coding[0].code : 'unknown',
            routes: newProduct.route ? 
              newProduct.route.map(r => r.coding && r.coding[0] ? r.coding[0].code : 'unknown') : []
          };
          return [...prevProducts, formattedProduct];
        }
        return prevProducts;
      });
      
      // Set highlight if needed
      if (location.state.newItemId) {
        setHighlightedId(location.state.newItemId);
        setTimeout(() => setHighlightedId(null), 5000);
      }
      
      // Clear the state to avoid re-adding on navigation
      navigate(location.pathname, { replace: true, state: {} });
    } else {
      // Otherwise load all data
      loadData();
    }
  }, [location.state, navigate, location.pathname]);

  const handleCreateClick = () => {
    navigate('/medicinal-products/create');
  };

  const handleViewDetails = (id) => {
    navigate(`/medicinal-products/${id}`);
  };

  const handleEditProduct = (id) => {
    navigate(`/medicinal-products/edit/${id}`);
  };

  // Placeholder for delete functionality
  const handleDeleteProduct = (id) => {
    // Would need to implement delete API call
    console.log('Delete product:', id);
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
          Medicinal Products
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
        >
          Create New Product
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {products.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1">
            No medicinal products found. Click "Create New Product" to add one.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="medicinal products table">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Routes</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow
                  key={product.id}
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    backgroundColor: highlightedId === product.id ? 'rgba(144, 238, 144, 0.2)' : 'inherit'
                  }}
                >
                  <TableCell component="th" scope="row">
                    {product.name}
                  </TableCell>
                  <TableCell>{product.type}</TableCell>
                  <TableCell>
                    <Chip 
                      label={product.status.charAt(0).toUpperCase() + product.status.slice(1)} 
                      color={product.status === 'active' ? 'success' : product.status === 'inactive' ? 'default' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {product.routes.length > 0 ? (
                        product.routes.map((route, idx) => (
                          <Chip key={idx} label={route} size="small" />
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No routes specified
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Details">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleViewDetails(product.id)}
                        >
                          Details
                        </Button>
                      </Tooltip>
                      <Tooltip title="Edit Product">
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditProduct(product.id)}
                        >
                          Edit
                        </Button>
                      </Tooltip>
                      <Tooltip title="Delete Product">
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          Delete
                        </Button>
                      </Tooltip>
                    </Box>
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

export default MedicinalProductList; 