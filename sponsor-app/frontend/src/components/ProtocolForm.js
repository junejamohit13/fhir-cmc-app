import React, { useState } from 'react';
import {
  Box,
  TextField,
  Grid,
  Typography,
  Paper,
  Button,
  IconButton,
  MenuItem,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

function ProtocolForm({ protocolData, onChange, isEdit = false }) {
  // Ensure protocolData has all required properties with defaults
  const safeProtocolData = {
    title: '',
    version: '',
    description: '',
    status: 'active',
    date: '',
    subjectReference: { reference: '' },
    note: [{ text: '' }],
    action: [{
      title: '',
      description: '',
      action: [{ title: '0 months', timingTiming: { repeat: { boundsDuration: { value: 0, unit: 'month', system: 'http://unitsofmeasure.org' } } } }]
    }],
    ...protocolData
  };
  
  const [openConditionDialog, setOpenConditionDialog] = useState(false);
  const [newCondition, setNewCondition] = useState({
    title: '',
    description: '',
    action: [
      { title: '0 months', timingTiming: { repeat: { boundsDuration: { value: 0, unit: 'month', system: 'http://unitsofmeasure.org' } } } },
    ],
  });
  const [openTimepointDialog, setOpenTimepointDialog] = useState(false);
  const [selectedConditionIndex, setSelectedConditionIndex] = useState(null);
  const [newTimepoint, setNewTimepoint] = useState({
    title: '',
    timingTiming: { repeat: { boundsDuration: { value: 0, unit: 'month', system: 'http://unitsofmeasure.org' } } },
  });

  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    onChange({
      ...safeProtocolData,
      [name]: value,
    });
  };

  const handleSubjectReferenceChange = (e) => {
    const { value } = e.target;
    onChange({
      ...safeProtocolData,
      subjectReference: {
        ...safeProtocolData.subjectReference,
        reference: value,
      },
    });
  };

  const handleNoteChange = (e, index) => {
    const { value } = e.target;
    const updatedNotes = [...safeProtocolData.note];
    updatedNotes[index] = { ...updatedNotes[index], text: value };
    onChange({
      ...safeProtocolData,
      note: updatedNotes,
    });
  };

  const addNote = () => {
    onChange({
      ...safeProtocolData,
      note: [...safeProtocolData.note, { text: '' }],
    });
  };

  const removeNote = (index) => {
    const updatedNotes = [...safeProtocolData.note];
    updatedNotes.splice(index, 1);
    onChange({
      ...safeProtocolData,
      note: updatedNotes,
    });
  };

  // Condition Management
  const handleOpenConditionDialog = () => {
    setNewCondition({
      title: '',
      description: '',
      action: [
        { title: '0 months', timingTiming: { repeat: { boundsDuration: { value: 0, unit: 'month', system: 'http://unitsofmeasure.org' } } } },
      ],
    });
    setOpenConditionDialog(true);
  };

  const handleCloseConditionDialog = () => {
    setOpenConditionDialog(false);
  };

  const handleConditionChange = (e) => {
    const { name, value } = e.target;
    setNewCondition({
      ...newCondition,
      [name]: value,
    });
  };

  const handleAddCondition = () => {
    onChange({
      ...safeProtocolData,
      action: [...safeProtocolData.action, newCondition],
    });
    setOpenConditionDialog(false);
  };

  const handleRemoveCondition = (index) => {
    const updatedConditions = [...safeProtocolData.action];
    updatedConditions.splice(index, 1);
    onChange({
      ...safeProtocolData,
      action: updatedConditions,
    });
  };

  // Timepoint Management
  const handleOpenTimepointDialog = (conditionIndex) => {
    setSelectedConditionIndex(conditionIndex);
    setNewTimepoint({
      title: '',
      timingTiming: { repeat: { boundsDuration: { value: 0, unit: 'month', system: 'http://unitsofmeasure.org' } } },
    });
    setOpenTimepointDialog(true);
  };

  const handleCloseTimepointDialog = () => {
    setOpenTimepointDialog(false);
  };

  const handleTimepointChange = (e) => {
    const { name, value } = e.target;
    if (name === 'value') {
      setNewTimepoint({
        ...newTimepoint,
        timingTiming: {
          ...newTimepoint.timingTiming,
          repeat: {
            ...newTimepoint.timingTiming.repeat,
            boundsDuration: {
              ...newTimepoint.timingTiming.repeat.boundsDuration,
              value: parseInt(value, 10) || 0,
            },
          },
        },
      });
    } else if (name === 'unit') {
      setNewTimepoint({
        ...newTimepoint,
        timingTiming: {
          ...newTimepoint.timingTiming,
          repeat: {
            ...newTimepoint.timingTiming.repeat,
            boundsDuration: {
              ...newTimepoint.timingTiming.repeat.boundsDuration,
              unit: value,
            },
          },
        },
      });
    } else {
      setNewTimepoint({
        ...newTimepoint,
        [name]: value,
      });
    }
  };

  const handleAddTimepoint = () => {
    const updatedConditions = [...safeProtocolData.action];
    updatedConditions[selectedConditionIndex] = {
      ...updatedConditions[selectedConditionIndex],
      action: [...updatedConditions[selectedConditionIndex].action, newTimepoint],
    };
    onChange({
      ...safeProtocolData,
      action: updatedConditions,
    });
    setOpenTimepointDialog(false);
  };

  const handleRemoveTimepoint = (conditionIndex, timepointIndex) => {
    const updatedConditions = [...safeProtocolData.action];
    const updatedTimepoints = [...updatedConditions[conditionIndex].action];
    updatedTimepoints.splice(timepointIndex, 1);
    updatedConditions[conditionIndex] = {
      ...updatedConditions[conditionIndex],
      action: updatedTimepoints,
    };
    onChange({
      ...safeProtocolData,
      action: updatedConditions,
    });
  };

  return (
    <Box component="form" noValidate autoComplete="off">
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Basic Information
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Title"
              name="title"
              value={safeProtocolData.title}
              onChange={handleBasicInfoChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Version"
              name="version"
              value={safeProtocolData.version}
              onChange={handleBasicInfoChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              required
              fullWidth
              label="Status"
              name="status"
              value={safeProtocolData.status}
              onChange={handleBasicInfoChange}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="retired">Retired</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Date"
              name="date"
              type="date"
              value={safeProtocolData.date}
              onChange={handleBasicInfoChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              multiline
              rows={3}
              label="Description"
              name="description"
              value={safeProtocolData.description}
              onChange={handleBasicInfoChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Subject Reference"
              value={safeProtocolData.subjectReference?.reference || ''}
              onChange={handleSubjectReferenceChange}
              placeholder="MedicinalProductDefinition/example"
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Notes</Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addNote}
            size="small"
          >
            Add Note
          </Button>
        </Box>
        {safeProtocolData.note.map((note, index) => (
          <Box key={index} sx={{ display: 'flex', mb: 2 }}>
            <TextField
              fullWidth
              multiline
              label={`Note ${index + 1}`}
              value={note.text}
              onChange={(e) => handleNoteChange(e, index)}
              sx={{ mr: 1 }}
            />
            <IconButton
              color="error"
              onClick={() => removeNote(index)}
              disabled={safeProtocolData.note.length === 1}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
      </Paper>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Stability Conditions</Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleOpenConditionDialog}
            size="small"
          >
            Add Condition
          </Button>
        </Box>

        {safeProtocolData.action.map((condition, conditionIndex) => (
          <Accordion key={conditionIndex} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>{condition.title}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Condition Details</Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography variant="body2">
                      <strong>Title:</strong> {condition.title}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Description:</strong> {condition.description}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2">Time Points</Typography>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenTimepointDialog(conditionIndex)}
                    >
                      Add Time Point
                    </Button>
                  </Box>
                  <List dense>
                    {condition.action.map((timepoint, timepointIndex) => (
                      <ListItem
                        key={timepointIndex}
                        secondaryAction={
                          <IconButton
                            edge="end"
                            color="error"
                            onClick={() => handleRemoveTimepoint(conditionIndex, timepointIndex)}
                            disabled={condition.action.length === 1}
                          >
                            <DeleteIcon />
                          </IconButton>
                        }
                      >
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
                </Grid>

                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleRemoveCondition(conditionIndex)}
                    disabled={safeProtocolData.action.length === 1}
                  >
                    Remove Condition
                  </Button>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>

      {/* Add Condition Dialog */}
      <Dialog open={openConditionDialog} onClose={handleCloseConditionDialog}>
        <DialogTitle>Add Stability Condition</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="title"
            label="Title"
            fullWidth
            variant="outlined"
            value={newCondition.title}
            onChange={handleConditionChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            fullWidth
            variant="outlined"
            value={newCondition.description}
            onChange={handleConditionChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConditionDialog}>Cancel</Button>
          <Button onClick={handleAddCondition} variant="contained" disabled={!newCondition.title}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Timepoint Dialog */}
      <Dialog open={openTimepointDialog} onClose={handleCloseTimepointDialog}>
        <DialogTitle>Add Time Point</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="title"
            label="Title"
            fullWidth
            variant="outlined"
            value={newTimepoint.title}
            onChange={handleTimepointChange}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              margin="dense"
              name="value"
              label="Value"
              type="number"
              fullWidth
              variant="outlined"
              value={newTimepoint.timingTiming.repeat.boundsDuration.value}
              onChange={handleTimepointChange}
            />
            <TextField
              select
              margin="dense"
              name="unit"
              label="Unit"
              fullWidth
              variant="outlined"
              value={newTimepoint.timingTiming.repeat.boundsDuration.unit}
              onChange={handleTimepointChange}
            >
              <MenuItem value="month">Month</MenuItem>
              <MenuItem value="week">Week</MenuItem>
              <MenuItem value="day">Day</MenuItem>
              <MenuItem value="hour">Hour</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTimepointDialog}>Cancel</Button>
          <Button onClick={handleAddTimepoint} variant="contained" disabled={!newTimepoint.title}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ProtocolForm;
