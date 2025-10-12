import { useEffect } from 'react';
import { Box, LinearProgress, Typography, Paper, Chip } from '@mui/material';
import { useSubscription } from '@apollo/client/react';
import { QUERY_PROGRESS_SUBSCRIPTION } from '../graphql/queries';

interface ProgressUpdate {
  requestId: string;
  phase: string;
  progress: number;
  message: string;
  timestamp: string;
}

interface ProgressIndicatorProps {
  requestId: string;
  onComplete?: () => void;
}

export default function ProgressIndicator({ requestId, onComplete }: ProgressIndicatorProps) {
  const { data, error } = useSubscription<{ queryProgress: ProgressUpdate }>(
    QUERY_PROGRESS_SUBSCRIPTION,
    {
      variables: { requestId },
      shouldResubscribe: false,
    }
  );

  const progress = data?.queryProgress;

  // Call onComplete when progress reaches 100%
  useEffect(() => {
    if (progress?.progress === 100 && onComplete) {
      onComplete();
    }
  }, [progress?.progress, onComplete]);

  if (error) {
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: '#fff3f3' }}>
        <Typography variant="subtitle2" color="error">
          Connection Error
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Unable to connect to real-time updates
        </Typography>
      </Paper>
    );
  }

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'planning':
        return 'Planning';
      case 'executing':
        return 'Executing';
      case 'analyzing':
        return 'Analyzing';
      case 'summarizing':
        return 'Generating Response';
      case 'completed':
        return 'Complete';
      default:
        return 'Processing';
    }
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 2, 
        mb: 2,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {progress ? getPhaseLabel(progress.phase) : 'Initializing...'}
        </Typography>
        <Chip 
          label={`${progress?.progress || 0}%`} 
          size="small"
          sx={{ 
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontWeight: 600,
          }}
        />
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress?.progress || 0}
        sx={{ 
          my: 1,
          height: 8,
          borderRadius: 4,
          bgcolor: 'rgba(255, 255, 255, 0.2)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            bgcolor: 'white',
          },
        }}
      />
      <Typography variant="body2" sx={{ opacity: 0.9 }}>
        {progress?.message || 'Waiting for response...'}
      </Typography>
    </Paper>
  );
}

