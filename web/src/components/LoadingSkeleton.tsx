import { Box, Paper, Skeleton } from '@mui/material';

export function ResultsLoadingSkeleton() {
  return (
    <Box>
      {/* Main Message Skeleton */}
      <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
        <Skeleton variant="text" width="30%" height={32} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="95%" />
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Skeleton variant="rounded" width={80} height={24} />
          <Skeleton variant="rounded" width={100} height={24} />
          <Skeleton variant="rounded" width={90} height={24} />
        </Box>
      </Paper>

      {/* Analysis Skeleton */}
      <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
        <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={100} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" height={100} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" height={100} />
      </Paper>
    </Box>
  );
}

export function HistoryLoadingSkeleton() {
  return (
    <Box sx={{ p: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Box key={i} sx={{ mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Skeleton variant="text" width="90%" height={20} />
          <Skeleton variant="text" width="40%" height={16} />
          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
            <Skeleton variant="rounded" width={60} height={16} />
            <Skeleton variant="rounded" width={40} height={16} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}



