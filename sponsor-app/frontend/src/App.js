import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Pages
import Dashboard from './pages/Dashboard';
import ProtocolList from './pages/ProtocolList';
import ProtocolDetail from './pages/ProtocolDetail';
import CreateProtocol from './pages/CreateProtocol';
import EditProtocol from './pages/EditProtocol';
import OrganizationList from './pages/OrganizationList';
import CreateOrganization from './pages/CreateOrganization';
import EditOrganization from './pages/EditOrganization';

// New Stability Testing Pages
import TestList from './pages/TestList';
import CreateTest from './pages/CreateTest';
import CreateEnhancedTest from './pages/CreateEnhancedTest';
import TestDetail from './pages/TestDetail';
import EditTest from './pages/EditTest';
import BatchList from './pages/BatchList';
import BatchDetail from './pages/BatchDetail';
import CreateBatch from './pages/CreateBatch';
import ResultList from './pages/ResultList';
import CreateResult from './pages/CreateResult';

// Medicinal Product Pages
import MedicinalProductList from './pages/MedicinalProductList';
import CreateMedicinalProduct from './pages/CreateMedicinalProduct';

// Components
import AppLayout from './components/AppLayout';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CssBaseline />
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            
            {/* Protocol Routes */}
            <Route path="/protocols" element={<ProtocolList />} />
            <Route path="/protocols/create" element={<CreateProtocol />} />
            <Route path="/protocols/:id" element={<ProtocolDetail />} />
            <Route path="/protocols/:id/edit" element={<EditProtocol />} />
            
            {/* Organization Routes */}
            <Route path="/organizations" element={<OrganizationList />} />
            <Route path="/organizations/new" element={<CreateOrganization />} />
            <Route path="/organizations/:id/edit" element={<EditOrganization />} />
            
            {/* Medicinal Product Routes */}
            <Route path="/medicinal-products" element={<MedicinalProductList />} />
            <Route path="/medicinal-products/create" element={<CreateMedicinalProduct />} />
            
            {/* Stability Test Routes */}
            <Route path="/tests" element={<TestList />} />
            <Route path="/tests/create" element={<CreateTest />} />
            <Route path="/tests/enhanced/create" element={<CreateEnhancedTest />} />
            <Route path="/tests/:id" element={<TestDetail />} />
            <Route path="/tests/:id/edit" element={<EditTest />} />
            
            {/* Batch Routes */}
            <Route path="/batches" element={<BatchList />} />
            <Route path="/batches/create" element={<CreateBatch />} />
            <Route path="/batches/:id" element={<BatchDetail />} />
            {/* <Route path="/batches/:id/edit" element={<EditBatch />} /> */}
            
            {/* Test Results Routes */}
            <Route path="/results" element={<ResultList />} />
            <Route path="/results/create" element={<CreateResult />} />
            {/* <Route path="/results/:id" element={<ResultDetail />} /> */}
            {/* <Route path="/results/:id/edit" element={<EditResult />} /> */}
          </Routes>
        </AppLayout>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;