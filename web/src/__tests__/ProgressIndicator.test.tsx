import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { describe, it, expect, vi } from 'vitest';
import ProgressIndicator from '../components/ProgressIndicator';
import { QUERY_PROGRESS_SUBSCRIPTION } from '../graphql/queries';

const mockProgressData = [
  {
    request: {
      query: QUERY_PROGRESS_SUBSCRIPTION,
      variables: { requestId: 'req-123' },
    },
    result: {
      data: {
        queryProgress: {
          requestId: 'req-123',
          phase: 'planning',
          progress: 25,
          message: 'Analyzing query...',
          timestamp: '2025-10-12T12:00:00Z',
        },
      },
    },
  },
];

const completedProgressData = [
  {
    request: {
      query: QUERY_PROGRESS_SUBSCRIPTION,
      variables: { requestId: 'req-456' },
    },
    result: {
      data: {
        queryProgress: {
          requestId: 'req-456',
          phase: 'completed',
          progress: 100,
          message: 'Query completed successfully',
          timestamp: '2025-10-12T12:01:00Z',
        },
      },
    },
  },
];

describe('ProgressIndicator Component', () => {
  it('should show waiting message initially', () => {
    render(
      <MockedProvider mocks={mockProgressData} addTypename={false}>
        <ProgressIndicator requestId="req-123" />
      </MockedProvider>
    );
    expect(screen.getByText('Waiting for progress updates...')).toBeInTheDocument();
  });

  it('should display phase label', async () => {
    render(
      <MockedProvider mocks={mockProgressData} addTypename={false}>
        <ProgressIndicator requestId="req-123" />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Planning')).toBeInTheDocument();
    });
  });

  it('should display progress percentage', async () => {
    render(
      <MockedProvider mocks={mockProgressData} addTypename={false}>
        <ProgressIndicator requestId="req-123" />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });

  it('should display progress message', async () => {
    render(
      <MockedProvider mocks={mockProgressData} addTypename={false}>
        <ProgressIndicator requestId="req-123" />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Analyzing query...')).toBeInTheDocument();
    });
  });

  it('should display formatted timestamp', async () => {
    render(
      <MockedProvider mocks={mockProgressData} addTypename={false}>
        <ProgressIndicator requestId="req-123" />
      </MockedProvider>
    );

    await waitFor(() => {
      // Check that some time string is rendered (format varies by locale)
      const timeElements = screen.getAllByText(/\d{1,2}:\d{2}:\d{2}/);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  it('should show progress bar', async () => {
    render(
      <MockedProvider mocks={mockProgressData} addTypename={false}>
        <ProgressIndicator requestId="req-123" />
      </MockedProvider>
    );

    await waitFor(() => {
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    });
  });

  it('should call onComplete when progress reaches 100%', async () => {
    const mockOnComplete = vi.fn();
    render(
      <MockedProvider mocks={completedProgressData} addTypename={false}>
        <ProgressIndicator requestId="req-456" onComplete={mockOnComplete} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('should display completed phase correctly', async () => {
    render(
      <MockedProvider mocks={completedProgressData} addTypename={false}>
        <ProgressIndicator requestId="req-456" />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  it('should handle subscription errors gracefully', async () => {
    const errorMocks = [
      {
        request: {
          query: QUERY_PROGRESS_SUBSCRIPTION,
          variables: { requestId: 'req-error' },
        },
        error: new Error('Subscription failed'),
      },
    ];

    render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <ProgressIndicator requestId="req-error" />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Error subscribing to progress/i)).toBeInTheDocument();
    });
  });

  it('should render different phase colors', async () => {
    const phases = [
      { phase: 'planning', expected: 'Planning' },
      { phase: 'executing', expected: 'Executing' },
      { phase: 'analyzing', expected: 'Analyzing' },
      { phase: 'summarizing', expected: 'Summarizing' },
      { phase: 'completed', expected: 'Completed' },
    ];

    for (const { phase, expected } of phases) {
      const phaseMocks = [
        {
          request: {
            query: QUERY_PROGRESS_SUBSCRIPTION,
            variables: { requestId: `req-${phase}` },
          },
          result: {
            data: {
              queryProgress: {
                requestId: `req-${phase}`,
                phase: phase,
                progress: 50,
                message: `${phase} in progress...`,
                timestamp: '2025-10-12T12:00:00Z',
              },
            },
          },
        },
      ];

      const { unmount } = render(
        <MockedProvider mocks={phaseMocks} addTypename={false}>
          <ProgressIndicator requestId={`req-${phase}`} />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(expected)).toBeInTheDocument();
      });

      unmount();
    }
  });
});

