import { gql } from '@apollo/client';

export const EXECUTE_QUERY = gql`
  mutation ExecuteQuery($query: String!, $userId: String) {
    executeQuery(query: $query, userId: $userId) {
      requestId
      message
      toolsUsed
      data
      analysis {
        summary
        insights {
          type
          description
          confidence
          supportingData
        }
        entities {
          id
          type
          name
          attributes
          relationships {
            type
            targetEntityId
            strength
          }
        }
        anomalies {
          type
          description
          severity
          affectedEntities
          data
        }
        metadata {
          toolResultsCount
          successfulResults
          failedResults
          analysisTimeMs
        }
      }
      metadata {
        requestId
        totalDurationMs
        timestamp
        error
      }
    }
  }
`;

export const GET_REQUEST_HISTORY = gql`
  query GetRequestHistory($limit: Int, $userId: String) {
    getRequestHistory(limit: $limit, userId: $userId) {
      requestId
      query
      timestamp
      response {
        requestId
        message
        toolsUsed
        metadata {
          totalDurationMs
          error
        }
      }
    }
  }
`;

export const GET_METRICS = gql`
  query GetMetrics {
    getMetrics {
      totalRequests
      successfulRequests
      failedRequests
      avgDuration
      uptime
    }
  }
`;

export const GET_REQUEST = gql`
  query GetRequest($requestId: ID!) {
    getRequest(requestId: $requestId) {
      requestId
      query
      timestamp
      response {
        requestId
        message
        toolsUsed
        data
        analysis {
          summary
          insights {
            type
            description
            confidence
          }
          entities {
            id
            type
            name
            attributes
          }
          anomalies {
            type
            description
            severity
          }
        }
        metadata {
          totalDurationMs
          error
        }
      }
    }
  }
`;

export const QUERY_PROGRESS_SUBSCRIPTION = gql`
  subscription QueryProgress($requestId: ID!) {
    queryProgress(requestId: $requestId) {
      requestId
      phase
      progress
      message
      timestamp
    }
  }
`;

