import { useState } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, AppBar, Toolbar, Typography, Container, Drawer } from '@mui/material';
import { client } from './apollo-client';
import QueryInput from './components/QueryInput';
import ResultsDisplay from './components/ResultsDisplay';
import HistorySidebar from './components/HistorySidebar';
import ErrorBoundary from './components/ErrorBoundary';
import type { ExecutionResult } from './types';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const DRAWER_WIDTH = 300;

function App() {
  const [currentResult, setCurrentResult] = useState<ExecutionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const handleQuerySubmit = () => {
    // Results will be set by QueryInput component via callback
    setIsLoading(true);
  };

  const handleQueryComplete = (result: ExecutionResult) => {
    setCurrentResult(result);
    setIsLoading(false);
    setSelectedRequestId(null); // Clear selection when new query runs
  };

  const handleHistorySelect = (requestId: string) => {
    setSelectedRequestId(requestId);
  };

  return (
    <ErrorBoundary>
      <ApolloProvider client={client}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box sx={{ display: 'flex' }}>
            {/* Header */}
            <AppBar
              position="fixed"
              sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
            >
              <Toolbar>
                <Typography variant="h6" noWrap component="div">
                  Clear AI v2
                </Typography>
                <Typography variant="subtitle2" sx={{ ml: 2, opacity: 0.8 }}>
                  AI Agent System
                </Typography>
              </Toolbar>
            </AppBar>

          {/* History Sidebar */}
          <Drawer
            variant="permanent"
            sx={{
              width: DRAWER_WIDTH,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
              },
            }}
          >
            <Toolbar /> {/* Spacer for AppBar */}
            <HistorySidebar
              selectedRequestId={selectedRequestId}
              onSelectRequest={handleHistorySelect}
            />
          </Drawer>

          {/* Main Content */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
            }}
          >
            <Toolbar /> {/* Spacer for AppBar */}
            
            <Container maxWidth="lg">
              <QueryInput
                onSubmit={handleQuerySubmit}
                onComplete={handleQueryComplete}
                isLoading={isLoading}
              />

              {currentResult && (
                <ResultsDisplay result={currentResult} />
              )}

              {selectedRequestId && !currentResult && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Loading selected query...
                  </Typography>
                </Box>
              )}
            </Container>
          </Box>
        </Box>
      </ThemeProvider>
    </ApolloProvider>
    </ErrorBoundary>
  );
}

export default App;
