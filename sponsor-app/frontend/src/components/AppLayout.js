import React, { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Science as ScienceIcon,
  Add as AddIcon,
  Business as BusinessIcon,
  Biotech as BiotechIcon,
  Inventory as InventoryIcon,
  Assignment as AssignmentIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';

const drawerWidth = 240;

function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stabilityOpen, setStabilityOpen] = useState(false);
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleStabilityToggle = () => {
    setStabilityOpen(!stabilityOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Protocols', icon: <ScienceIcon />, path: '/protocols' },
    { text: 'Organizations', icon: <BusinessIcon />, path: '/organizations' },
  ];

  const stabilityItems = [
    { text: 'Stability Tests', icon: <BiotechIcon />, path: '/tests' },
    { text: 'Batches', icon: <InventoryIcon />, path: '/batches' },
    { text: 'Test Results', icon: <AssignmentIcon />, path: '/results' },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Protocol Manager
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={RouterLink}
              to={item.path}
              selected={location.pathname === item.path}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
        
        {/* Stability Testing Submenu */}
        <ListItem disablePadding>
          <ListItemButton onClick={handleStabilityToggle}>
            <ListItemIcon>
              <BiotechIcon />
            </ListItemIcon>
            <ListItemText primary="Stability Testing" />
            {stabilityOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={stabilityOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {stabilityItems.map((item) => (
              <ListItemButton
                key={item.text}
                component={RouterLink}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{ pl: 4 }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/protocols/create"
            selected={location.pathname === '/protocols/create'}
          >
            <ListItemIcon>
              <AddIcon />
            </ListItemIcon>
            <ListItemText primary="Create Protocol" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/tests/create"
            selected={location.pathname === '/tests/create'}
          >
            <ListItemIcon>
              <AddIcon />
            </ListItemIcon>
            <ListItemText primary="Create Test" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/batches/create"
            selected={location.pathname === '/batches/create'}
          >
            <ListItemIcon>
              <AddIcon />
            </ListItemIcon>
            <ListItemText primary="Create Batch" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/results/create"
            selected={location.pathname === '/results/create'}
          >
            <ListItemIcon>
              <AddIcon />
            </ListItemIcon>
            <ListItemText primary="Submit Result" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find((item) => item.path === location.pathname)?.text ||
             stabilityItems.find((item) => item.path === location.pathname)?.text ||
             'Protocol Management'}
          </Typography>
          {location.pathname === '/protocols' && (
            <Button
              color="inherit"
              component={RouterLink}
              to="/protocols/create"
              startIcon={<AddIcon />}
            >
              New Protocol
            </Button>
          )}
          {location.pathname === '/organizations' && (
            <Button
              color="inherit"
              component={RouterLink}
              to="/organizations/new"
              startIcon={<AddIcon />}
            >
              New Organization
            </Button>
          )}
          {location.pathname === '/tests' && (
            <Button
              color="inherit"
              component={RouterLink}
              to="/tests/create"
              startIcon={<AddIcon />}
            >
              New Test
            </Button>
          )}
          {location.pathname === '/batches' && (
            <Button
              color="inherit"
              component={RouterLink}
              to="/batches/create"
              startIcon={<AddIcon />}
            >
              New Batch
            </Button>
          )}
          {location.pathname === '/results' && (
            <Button
              color="inherit"
              component={RouterLink}
              to="/results/create"
              startIcon={<AddIcon />}
            >
              Submit Result
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default AppLayout;