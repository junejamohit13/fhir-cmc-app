import React, { useState } from 'react';
import {
  Box,
  TextField,
  Grid,
  Typography,
  Paper,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  OutlinedInput,
  ListItemText,
  Checkbox
} from '@mui/material';

const ROUTES = [
  'oral',
  'intravenous',
  'intramuscular',
  'subcutaneous',
  'transdermal',
  'inhalation',
  'topical',
  'ophthalmic',
  'otic',
  'rectal',
  'nasal'
];

const PRODUCT_TYPES = [
  'drug',
  'biological',
  'biologic',
  'vaccine'
];

function MedicinalProductForm({ initialData = {}, onSubmit, organizations = [], isEdit = false }) {
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    identifier: '',
    status: 'active',
    product_type: 'drug',
    route_of_administration: [],
    manufacturer_id: '',
    ...initialData
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProductData({
      ...productData,
      [name]: value
    });
  };

  const handleRouteChange = (event) => {
    const {
      target: { value },
    } = event;
    setProductData({
      ...productData,
      route_of_administration: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(productData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate autoComplete="off">
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Medicinal Product Information
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Product Name"
              name="name"
              value={productData.name}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Product Identifier"
              name="identifier"
              value={productData.identifier}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              multiline
              rows={3}
              value={productData.description || ''}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                name="status"
                value={productData.status}
                onChange={handleChange}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="entered-in-error">Entered in Error</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="product-type-label">Product Type</InputLabel>
              <Select
                labelId="product-type-label"
                name="product_type"
                value={productData.product_type}
                onChange={handleChange}
                label="Product Type"
              >
                {PRODUCT_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="routes-label">Routes of Administration</InputLabel>
              <Select
                labelId="routes-label"
                multiple
                name="route_of_administration"
                value={productData.route_of_administration || []}
                onChange={handleRouteChange}
                input={<OutlinedInput label="Routes of Administration" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value.charAt(0).toUpperCase() + value.slice(1)} />
                    ))}
                  </Box>
                )}
              >
                {ROUTES.map((route) => (
                  <MenuItem key={route} value={route}>
                    <Checkbox checked={(productData.route_of_administration || []).indexOf(route) > -1} />
                    <ListItemText primary={route.charAt(0).toUpperCase() + route.slice(1)} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="manufacturer-label">Manufacturer</InputLabel>
              <Select
                labelId="manufacturer-label"
                name="manufacturer_id"
                value={productData.manufacturer_id || ''}
                onChange={handleChange}
                label="Manufacturer"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {organizations.map((org) => (
                  <MenuItem key={org.id} value={org.id}>
                    {org.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          color="primary" 
          type="submit"
          disabled={!productData.name || !productData.identifier}
        >
          {isEdit ? 'Update Product' : 'Create Product'}
        </Button>
      </Box>
    </Box>
  );
}

export default MedicinalProductForm; 