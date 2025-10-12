import { useQuery } from '@apollo/client/react';
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { GET_REQUEST_HISTORY } from '../graphql/queries';
import type { RequestRecord } from '../types';

export interface HistorySidebarProps {
  selectedRequestId: string | null;
  onSelectRequest: (requestId: string) => void;
}

export default function HistorySidebar({ selectedRequestId, onSelectRequest }: HistorySidebarProps) {
  const { data, loading, error } = useQuery<{ getRequestHistory: RequestRecord[] }>(
    GET_REQUEST_HISTORY,
    {
      variables: { limit: 20 },
      pollInterval: 5000, // Poll every 5 seconds for updates
    }
  );

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Box sx={{ overflow: 'auto', height: '100%' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <HistoryIcon />
        <Typography variant="h6">History</Typography>
      </Box>
      
      <Divider />

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {error && (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="error">
            Failed to load history
          </Typography>
        </Box>
      )}

      {data && data.getRequestHistory && (
        <List sx={{ p: 0 }}>
          {data.getRequestHistory.length === 0 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No queries yet. Start by asking a question!
              </Typography>
            </Box>
          )}

          {data.getRequestHistory.map((record: RequestRecord) => (
            <ListItemButton
              key={record.requestId}
              selected={selectedRequestId === record.requestId}
              onClick={() => onSelectRequest(record.requestId)}
              sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{
                      fontWeight: selectedRequestId === record.requestId ? 'bold' : 'normal',
                    }}
                  >
                    {record.query}
                  </Typography>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {formatTimestamp(record.timestamp)}
                    </Typography>
                    <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {record.response.metadata.error ? (
                        <Chip label="Error" size="small" color="error" sx={{ height: 16 }} />
                      ) : (
                        <Chip label="Success" size="small" color="success" sx={{ height: 16 }} />
                      )}
                      <Chip
                        label={`${(record.response.metadata.totalDurationMs / 1000).toFixed(1)}s`}
                        size="small"
                        sx={{ height: 16 }}
                      />
                    </Box>
                  </Box>
                }
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}

