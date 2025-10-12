import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Paper,
  TextField,
  Button,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { EXECUTE_QUERY } from '../graphql/queries';
import ProgressIndicator from './ProgressIndicator';
import type { ExecutionResult } from '../types';

interface QueryInputProps {
  onSubmit: () => void;
  onComplete: (result: ExecutionResult) => void;
  isLoading: boolean;
}

export default function QueryInput({ onSubmit, onComplete }: QueryInputProps) {
  const [query, setQuery] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [executeQuery, { loading, error }] = useMutation<{
    executeQuery: ExecutionResult;
  }>(EXECUTE_QUERY);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() || loading) return;

    onSubmit();
    setRequestId(null); // Clear old requestId

    try {
      const result = await executeQuery({
        variables: { query: query.trim() },
      });

      if (result.data?.executeQuery) {
        // Set requestId for subscription
        setRequestId(result.data.executeQuery.requestId);
        
        onComplete(result.data.executeQuery);
        setQuery(''); // Clear input after successful query
      }
    } catch (err) {
      console.error('Query execution error:', err);
      // Error will be shown via error state
    }
  };

  const handleProgressComplete = () => {
    // Progress subscription complete
    setRequestId(null);
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

      {/* Show real-time progress if we have a requestId */}
      {loading && requestId && (
        <Box sx={{ mt: 2 }}>
          <ProgressIndicator requestId={requestId} onComplete={handleProgressComplete} />
        </Box>
      )}

      {/* Show basic loading if no requestId yet */}
      {loading && !requestId && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Starting agent...
          </Typography>
        </Box>
      )}

      {error && (
        <Paper elevation={1} sx={{ mt: 2, p: 2, bgcolor: '#fff3f3' }}>
          <Typography variant="subtitle2" color="error" gutterBottom>
            Query Failed
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error.message}
          </Typography>
        </Paper>
      )}

      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary">
          Try: "List all shipments" • "Show contaminated facilities" • "Analyze recent inspections"
        </Typography>
      </Box>
    </Paper>
  );
}

