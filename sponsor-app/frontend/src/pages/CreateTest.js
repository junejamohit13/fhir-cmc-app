import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { fetchProtocols, fetchProtocolById, fetchTests, createEnhancedTest } from '../services/api';
import TestConfigModal from '../components/TestConfigModal';


function CreateTest() {
  const navigate = useNavigate();
  const [protocols, setProtocols] = useState([]);
  const [selectedProtocolId, setSelectedProtocolId] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [timepoints, setTimepoints] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProtocols();
        let list = [];
        if (data && data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
          list = data.entry.filter(e => e && e.resource).map(e => e.resource);
        }
        setProtocols(list);
        if (list.length) {
          setSelectedProtocolId(list[0].id);
        }
      } catch (e) {
        console.error('Error loading protocols', e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadDetails = async () => {
      if (!selectedProtocolId) return;
      setLoading(true);
      try {
        const proto = await fetchProtocolById(selectedProtocolId);
        setSelectedProtocol(proto);
        const testsData = await fetchTests(selectedProtocolId);
        let list = [];
        if (testsData && testsData.resourceType === 'Bundle' && Array.isArray(testsData.entry)) {
          list = testsData.entry.filter(e => e && e.resource).map(e => e.resource);
        }
        setTests(list);
        const tps = [];
        if (proto.action && Array.isArray(proto.action)) {
          proto.action.forEach(act => {
            if (act.title) {
              tps.push({ title: act.title });
            }
            if (act.action && Array.isArray(act.action)) {
              act.action.forEach(sub => {
                if (sub.title) {
                  tps.push({ title: sub.title });
                }
              });
            }
          });
        }
        setTimepoints(tps);
      } catch (e) {
        console.error('Error loading protocol details', e);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [selectedProtocolId]);

  const handleSaveTest = async (form) => {
    const payload = {
      title: form.test_type + (form.test_subtype ? ` - ${form.test_subtype}` : ''),
      description: form.notes || '',
      test_type: form.test_type,
      test_subtype: form.test_subtype || '',
      protocol_id: selectedProtocolId,
      timepoint: form.timepoint || '',
      parameters: { material: form.material, storage: form.storage },
      kind: 'Task',
      status: 'active'
    };
    try {

      await createEnhancedTest(payload);
      setModalOpen(false);
      // Reload tests
      const updated = await fetchTests(selectedProtocolId);
      if (updated && updated.resourceType === 'Bundle' && Array.isArray(updated.entry)) {
        setTests(updated.entry.filter(e => e && e.resource).map(e => e.resource));
      }
    } catch (e) {
      console.error('Failed to create test', e);

    }
  };

  if (loading && !selectedProtocol) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/tests')}>
          Back to Tests
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="protocol-select-label">Select Protocol</InputLabel>
          <Select
            labelId="protocol-select-label"
            value={selectedProtocolId}
            label="Select Protocol"
            onChange={(e) => setSelectedProtocolId(e.target.value)}
          >
            {protocols.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedProtocol && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">Protocol Overview</Typography>
            <Typography variant="body2">Protocol ID: {selectedProtocol.id}</Typography>
            <Typography variant="body2">Title: {selectedProtocol.title}</Typography>
            {selectedProtocol.subjectReference && (
              <Typography variant="body2">Product: {selectedProtocol.subjectReference.reference}</Typography>
            )}
          </Box>
        )}

        <Box sx={{ mb: 2, textAlign: 'right' }}>
          <Button variant="contained" onClick={() => setModalOpen(true)}>Add Test to Protocol</Button>
        </Box>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Test Name</TableCell>
              <TableCell>Timepoint</TableCell>
              <TableCell>Material</TableCell>
              <TableCell>Storage</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tests.map((t) => {
              const tpExt = t.extension ? t.extension.find(e => e.url === 'http://example.org/fhir/StructureDefinition/stability-test-timepoint') : null;
              const material = t.parameters ? t.parameters.material : '';
              const storage = t.parameters ? t.parameters.storage : '';
              return (
                <TableRow key={t.id}>
                  <TableCell>{t.title}</TableCell>
                  <TableCell>{tpExt ? tpExt.valueString : ''}</TableCell>
                  <TableCell>{material}</TableCell>
                  <TableCell>{storage}</TableCell>
                  <TableCell>{t.description}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Fields map to ActivityDefinition and related resources per HL7 Stability IG.
          </Typography>
        </Box>

      </Paper>

      <TestConfigModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTest}
        timepoints={timepoints}
      />
    </Box>
  );
}

export default CreateTest;

