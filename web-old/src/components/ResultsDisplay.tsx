import {
  Paper,
  Typography,
  Box,
  Chip,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import BuildIcon from '@mui/icons-material/Build';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import type { ExecutionResult } from '../types';

interface ResultsDisplayProps {
  result: ExecutionResult;
}

export default function ResultsDisplay({ result }: ResultsDisplayProps) {
  const hasAnalysis = result.analysis && result.analysis.insights.length > 0;

  return (
    <Box>
      {/* Main Message */}
      <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CheckCircleIcon color="success" sx={{ mr: 1 }} />
          <Typography variant="h6">Response</Typography>
        </Box>
        
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {result.message}
        </Typography>

        {/* Tools Used */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <BuildIcon fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            Tools:
          </Typography>
          {result.toolsUsed.map((tool, idx) => (
            <Chip
              key={idx}
              label={tool}
              size="small"
              variant="outlined"
              color="primary"
            />
          ))}
        </Box>

        {/* Metadata */}
        <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            label={`Duration: ${(result.metadata.totalDurationMs / 1000).toFixed(2)}s`}
            size="small"
            variant="filled"
          />
          <Chip
            label={`Request ID: ${result.requestId.slice(0, 8)}...`}
            size="small"
            variant="filled"
          />
        </Box>
      </Paper>

      {/* Analysis Section */}
      {hasAnalysis && (
        <>
          {/* Insights */}
          {result.analysis!.insights.length > 0 && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LightbulbIcon sx={{ mr: 1 }} color="warning" />
                  <Typography variant="h6">
                    Insights ({result.analysis!.insights.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {result.analysis!.insights.map((insight, idx) => (
                    <Card key={idx} variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Chip label={insight.type} size="small" color="primary" />
                          <Chip
                            label={`${(insight.confidence * 100).toFixed(0)}% confident`}
                            size="small"
                            color={insight.confidence > 0.8 ? 'success' : 'default'}
                          />
                        </Box>
                        <Typography variant="body2">{insight.description}</Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Entities */}
          {result.analysis!.entities.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AccountTreeIcon sx={{ mr: 1 }} color="info" />
                  <Typography variant="h6">
                    Entities ({result.analysis!.entities.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {result.analysis!.entities.slice(0, 10).map((entity, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="bold">
                        {entity.name || entity.id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Type: {entity.type}
                      </Typography>
                      {entity.relationships && entity.relationships.length > 0 && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          {entity.relationships.length} relationship(s)
                        </Typography>
                      )}
                    </Box>
                  ))}
                  {result.analysis!.entities.length > 10 && (
                    <Typography variant="caption" color="text.secondary">
                      ... and {result.analysis!.entities.length - 10} more entities
                    </Typography>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Anomalies */}
          {result.analysis!.anomalies.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <WarningIcon sx={{ mr: 1 }} color="error" />
                  <Typography variant="h6">
                    Anomalies ({result.analysis!.anomalies.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {result.analysis!.anomalies.map((anomaly, idx) => (
                    <Alert
                      key={idx}
                      severity={
                        anomaly.severity === 'critical' || anomaly.severity === 'high'
                          ? 'error'
                          : 'warning'
                      }
                    >
                      <Typography variant="subtitle2" fontWeight="bold">
                        {anomaly.type}
                      </Typography>
                      <Typography variant="body2">{anomaly.description}</Typography>
                      {anomaly.affectedEntities.length > 0 && (
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          Affected: {anomaly.affectedEntities.join(', ')}
                        </Typography>
                      )}
                    </Alert>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </>
      )}
    </Box>
  );
}

