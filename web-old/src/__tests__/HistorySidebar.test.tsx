import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { describe, it, expect, vi } from 'vitest';
import HistorySidebar from '../components/HistorySidebar';
import { GET_REQUEST_HISTORY } from '../graphql/queries';
import type { RequestRecord } from '../types';

const mockHistory: RequestRecord[] = [
  {
    requestId: 'req-1',
    query: 'Show all shipments',
    timestamp: '2025-10-12T12:00:00Z',
    response: {
      requestId: 'req-1',
      message: 'Found 10 shipments',
      toolsUsed: ['shipments_list'],
      data: {},
      analysis: null,
      metadata: {
        requestId: 'req-1',
        totalDurationMs: 1500,
        timestamp: '2025-10-12T12:00:00Z',
        error: null,
      },
    },
  },
  {
    requestId: 'req-2',
    query: 'List contaminated facilities',
    timestamp: '2025-10-12T11:30:00Z',
    response: {
      requestId: 'req-2',
      message: 'Found 3 facilities',
      toolsUsed: ['facilities_list'],
      data: {},
      analysis: null,
      metadata: {
        requestId: 'req-2',
        totalDurationMs: 2000,
        timestamp: '2025-10-12T11:30:00Z',
        error: 'Test error',
      },
    },
  },
];

const mocks = [
  {
    request: {
      query: GET_REQUEST_HISTORY,
      variables: { limit: 20 },
    },
    result: {
      data: {
        getRequestHistory: mockHistory,
      },
    },
  },
];

const emptyMocks = [
  {
    request: {
      query: GET_REQUEST_HISTORY,
      variables: { limit: 20 },
    },
    result: {
      data: {
        getRequestHistory: [],
      },
    },
  },
];

describe('HistorySidebar Component', () => {
  it('should render history header', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <HistorySidebar selectedRequestId={null} onSelectRequest={vi.fn()} />
      </MockedProvider>
    );
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <HistorySidebar selectedRequestId={null} onSelectRequest={vi.fn()} />
      </MockedProvider>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render history items after loading', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <HistorySidebar selectedRequestId={null} onSelectRequest={vi.fn()} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Show all shipments')).toBeInTheDocument();
      expect(screen.getByText('List contaminated facilities')).toBeInTheDocument();
    });
  });

  it('should display success chip for successful queries', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <HistorySidebar selectedRequestId={null} onSelectRequest={vi.fn()} />
      </MockedProvider>
    );

    await waitFor(() => {
      const successChips = screen.getAllByText('Success');
      expect(successChips.length).toBeGreaterThan(0);
    });
  });

  it('should display error chip for failed queries', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <HistorySidebar selectedRequestId={null} onSelectRequest={vi.fn()} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  it('should show duration for each query', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <HistorySidebar selectedRequestId={null} onSelectRequest={vi.fn()} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('1.5s')).toBeInTheDocument();
      expect(screen.getByText('2.0s')).toBeInTheDocument();
    });
  });

  it('should call onSelectRequest when clicking a history item', async () => {
    const mockOnSelect = vi.fn();
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <HistorySidebar selectedRequestId={null} onSelectRequest={mockOnSelect} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Show all shipments')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show all shipments'));
    expect(mockOnSelect).toHaveBeenCalledWith('req-1');
  });

  it('should highlight selected request', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <HistorySidebar selectedRequestId="req-1" onSelectRequest={vi.fn()} />
      </MockedProvider>
    );

    await waitFor(() => {
      const selectedItem = screen.getByText('Show all shipments').closest('button');
      expect(selectedItem).toHaveClass('Mui-selected');
    });
  });

  it('should show empty state when no history', async () => {
    render(
      <MockedProvider mocks={emptyMocks} addTypename={false}>
        <HistorySidebar selectedRequestId={null} onSelectRequest={vi.fn()} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No queries yet. Start by asking a question!')).toBeInTheDocument();
    });
  });

  it('should format recent timestamps correctly', async () => {
    const recentMocks = [
      {
        request: {
          query: GET_REQUEST_HISTORY,
          variables: { limit: 20 },
        },
        result: {
          data: {
            getRequestHistory: [
              {
                ...mockHistory[0],
                timestamp: new Date().toISOString(),
              },
            ],
          },
        },
      },
    ];

    render(
      <MockedProvider mocks={recentMocks} addTypename={false}>
        <HistorySidebar selectedRequestId={null} onSelectRequest={vi.fn()} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Just now|ago/i)).toBeInTheDocument();
    });
  });
});



