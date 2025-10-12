import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Paper,
  TextField,
  Button,
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { EXECUTE_QUERY } from '../graphql/queries';
import type { ExecutionResult } from '../types';

interface QueryInputProps {
  onSubmit: () => void;
  onComplete: (result: ExecutionResult) => void;
  isLoading: boolean;
}

export default function QueryInput({ onSubmit, onComplete }: QueryInputProps) {
  const [query, setQuery] = useState('');
  const [executeQuery, { loading, error }] = useMutation<{
    executeQuery: ExecutionResult;
  }>(EXECUTE_QUERY);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() || loading) return;

    onSubmit();

    try {
      const result = await executeQuery({
        variables: { query: query.trim() },
      });

      if (result.data?.executeQuery) {
        onComplete(result.data.executeQuery);
        setQuery(''); // Clear input after successful query
      }
    } catch (err) {
      console.error('Query execution error:', err);
      // Error will be shown via error state
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Ask a Question
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about shipments, facilities, contamination patterns..."
            disabled={loading}
            variant="outlined"
            sx={{ flexGrow: 1 }}
          />
          
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !query.trim()}
            endIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            sx={{ minWidth: 120, height: 56 }}
          >
            {loading ? 'Processing' : 'Submit'}
          </Button>
        </Box>
      </form>

      {loading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Agent is processing your query...
          </Typography>
        </Box>
      )}

      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 2 }}>
          Error: {error.message}
        </Typography>
      )}

      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary">
          Try: "List all shipments" • "Show contaminated facilities" • "Analyze recent inspections"
        </Typography>
      </Box>
    </Paper>
  );
}

