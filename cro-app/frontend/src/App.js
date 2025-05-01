import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Layout
import AppLayout from './components/AppLayout';

// Pages
import Dashboard from './pages/Dashboard';
import ProtocolList from './pages/ProtocolList';
import ProtocolDetail from './pages/ProtocolDetail';
import BatchList from './pages/BatchList';
import CreateBatch from './pages/CreateBatch';
import ResultList from './pages/ResultList';
import CreateResult from './pages/CreateResult';

// Theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#4F46E5',
    },
    secondary: {
      main: '#10B981',
    },
    background: {
      default: '#F9FAFB',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/protocols" element={<ProtocolList />} />
            <Route path="/protocols/:id" element={<ProtocolDetail />} />
            <Route path="/batches" element={<BatchList />} />
            <Route path="/batches/create" element={<CreateBatch />} />
            <Route path="/results" element={<ResultList />} />
            <Route path="/results/create" element={<CreateResult />} />
          </Routes>
        </AppLayout>
      </Router>
    </ThemeProvider>
  );
}

export default App;