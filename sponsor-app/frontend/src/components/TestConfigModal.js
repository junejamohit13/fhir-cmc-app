import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

function TestConfigModal({ open, onClose, onSave, initialData = null, timepoints = [] }) {
  const [form, setForm] = useState({
    test_type: '',
    test_subtype: '',
    timepoint: '',
    material: '',
    storage: '',
    notes: '',
    ...(initialData || {}),
  });

  useEffect(() => {
    setForm({
      test_type: '',
      test_subtype: '',
      timepoint: '',
      material: '',
      storage: '',
      notes: '',
      ...(initialData || {}),
    });
  }, [initialData, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData && initialData.test_type ? 'Edit Test' : 'Add New Test to Protocol'}</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal" required>
          <InputLabel id="test-type-label">Test Name</InputLabel>
          <Select
            labelId="test-type-label"
            name="test_type"
            value={form.test_type}
            label="Test Name"
            onChange={(e) => handleChange(e)}
          >
            <MenuItem value="">Select</MenuItem>
            <MenuItem value="Assay">Assay</MenuItem>
            <MenuItem value="Degradation">Degradation</MenuItem>
            <MenuItem value="Dissolution Values">Dissolution Values</MenuItem>
            <MenuItem value="Microbial Quality">Microbial Quality</MenuItem>
          </Select>
        </FormControl>
        {['Degradation', 'Dissolution Values'].includes(form.test_type) && (
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="test-subtype-label">Subtype</InputLabel>
            <Select
              labelId="test-subtype-label"
              name="test_subtype"
              value={form.test_subtype}
              label="Subtype"
              onChange={handleChange}
            >
              <MenuItem value="">Select</MenuItem>
              {form.test_type === 'Degradation' && (
                <>
                  <MenuItem value="Degs1">Degs1</MenuItem>
                  <MenuItem value="Degs2">Degs2</MenuItem>
                  <MenuItem value="Degs3">Degs3</MenuItem>
                  <MenuItem value="Total Degradation">Total Degradation</MenuItem>
                </>
              )}
              {form.test_type === 'Dissolution Values' && (
                <>
                  <MenuItem value="Individual">Individual</MenuItem>
                  <MenuItem value="Mean">Mean</MenuItem>
                  <MenuItem value="Conclusion">Conclusion</MenuItem>
                </>
              )}
            </Select>
          </FormControl>
        )}
        <FormControl fullWidth margin="normal">
          <InputLabel id="timepoint-label">Timepoint</InputLabel>
          <Select
            labelId="timepoint-label"
            name="timepoint"
            value={form.timepoint}
            label="Timepoint"
            onChange={handleChange}
          >
            <MenuItem value="">Select</MenuItem>
            {timepoints.map((tp, idx) => (
              <MenuItem key={idx} value={tp.title}>{tp.title}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          margin="normal"
          fullWidth
          label="Material"
          name="material"
          value={form.material}
          onChange={handleChange}
        />
        <TextField
          margin="normal"
          fullWidth
          label="Storage Condition"
          name="storage"
          value={form.storage}
          onChange={handleChange}
        />
        <TextField
          margin="normal"
          fullWidth
          multiline
          rows={3}
          label="Notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save Test</Button>
      </DialogActions>
    </Dialog>
  );
}

export default TestConfigModal;

