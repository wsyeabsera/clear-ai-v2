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

// Phase configuration with icons and colors
const phaseConfig: Record<string, { label: string; icon: string; color: string }> = {
  'context-loading': { label: 'Loading Context', icon: '🔍', color: '#3b82f6' },
  'planning': { label: 'Planning', icon: '🗺️', color: '#8b5cf6' },
  'executing': { label: 'Executing', icon: '⚡', color: '#f59e0b' },
  'analyzing': { label: 'Analyzing', icon: '📊', color: '#10b981' },
  'summarizing': { label: 'Summarizing', icon: '📝', color: '#06b6d4' },
  'storing': { label: 'Storing', icon: '💾', color: '#6366f1' },
  'complete': { label: 'Complete', icon: '✅', color: '#22c55e' },
  'processing': { label: 'Processing', icon: '🔄', color: '#667eea' },
};

export default function ProgressIndicator({ requestId, onComplete }: ProgressIndicatorProps) {
  const { data, error } = useSubscription<{ queryProgress: ProgressUpdate }>(
    QUERY_PROGRESS_SUBSCRIPTION,
    {
      variables: { requestId },
      shouldResubscribe: false,
    }
  );

  const progress = data?.queryProgress;

  // Log progress updates to console
  useEffect(() => {
    if (progress) {
      console.log(`🔄 Progress Update: ${progress.phase} - ${progress.progress}% - ${progress.message}`);
    }
  }, [progress]);

  // Call onComplete when progress reaches 100%
  useEffect(() => {
    if (progress?.progress === 100 && onComplete) {
      onComplete();
    }
  }, [progress?.progress, onComplete]);

  if (error) {
    console.error('❌ WebSocket subscription error:', error);
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: '#fff3f3' }}>
        <Typography variant="subtitle2" color="error">
          Connection Error
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Unable to connect to real-time updates: {error.message}
        </Typography>
      </Paper>
    );
  }

  const currentPhase = progress?.phase || 'processing';
  const phaseInfo = phaseConfig[currentPhase] || phaseConfig['processing'];

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 2, 
        mb: 2,
        background: `linear-gradient(135deg, ${phaseInfo.color} 0%, ${phaseInfo.color}dd 100%)`,
        color: 'white',
        transition: 'all 0.3s ease',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '1.5rem' }}>
            {phaseInfo.icon}
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {phaseInfo.label}
          </Typography>
        </Box>
        <Chip 
          label={`${progress?.progress || 0}%`} 
          size="small"
          sx={{ 
            bgcolor: 'rgba(255, 255, 255, 0.3)',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.875rem',
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
            transition: 'transform 0.3s ease',
          },
        }}
      />
      <Typography variant="body2" sx={{ opacity: 0.95, fontWeight: 500 }}>
        {progress?.message || 'Waiting for response...'}
      </Typography>
    </Paper>
  );
}

