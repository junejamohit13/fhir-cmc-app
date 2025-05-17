import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, AppBar, Toolbar, Typography } from '@mui/material';
import StabilityResultsTable from './components/StabilityResultsTable';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">
            Regulator Stability Testing Portal
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl">
        <StabilityResultsTable />
      </Container>
    </ThemeProvider>
  );
}

export default App; 