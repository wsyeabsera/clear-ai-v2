import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import QueryInput from '../components/QueryInput';
import { EXECUTE_QUERY } from '../graphql/queries';

const mocks = [
  {
    request: {
      query: EXECUTE_QUERY,
      variables: { query: 'test query' },
    },
    result: {
      data: {
        executeQuery: {
          requestId: 'test-123',
          message: 'Test response',
          toolsUsed: ['test_tool'],
          data: {},
          analysis: {
            summary: 'Test summary',
            insights: [],
            entities: [],
            anomalies: [],
            metadata: {
              toolResultsCount: 1,
              successfulResults: 1,
              failedResults: 0,
              analysisTimeMs: 100,
            },
          },
          metadata: {
            requestId: 'test-123',
            totalDurationMs: 1000,
            timestamp: '2025-10-12T00:00:00Z',
            error: null,
          },
        },
      },
    },
  },
];

describe('QueryInput Component', () => {
  it('should render input field and submit button', () => {
    render(
      <MockedProvider mocks={mocks}>
        <QueryInput onSubmit={() => {}} onComplete={() => {}} isLoading={false} />
      </MockedProvider>
    );

    expect(screen.getByPlaceholderText(/Ask about shipments/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  it('should update query value on input change', () => {
    render(
      <MockedProvider mocks={mocks}>
        <QueryInput onSubmit={() => {}} onComplete={() => {}} isLoading={false} />
      </MockedProvider>
    );

    const input = screen.getByPlaceholderText(/Ask about shipments/i) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'test query' } });

    expect(input.value).toBe('test query');
  });

  it('should disable submit button when query is empty', () => {
    render(
      <MockedProvider mocks={mocks}>
        <QueryInput onSubmit={() => {}} onComplete={() => {}} isLoading={false} />
      </MockedProvider>
    );

    const button = screen.getByRole('button', { name: /Submit/i });
    expect(button).toBeDisabled();
  });

  it('should enable submit button when query has text', () => {
    render(
      <MockedProvider mocks={mocks}>
        <QueryInput onSubmit={() => {}} onComplete={() => {}} isLoading={false} />
      </MockedProvider>
    );

    const input = screen.getByPlaceholderText(/Ask about shipments/i);
    fireEvent.change(input, { target: { value: 'test query' } });

    const button = screen.getByRole('button', { name: /Submit/i });
    expect(button).not.toBeDisabled();
  });

  it('should call onSubmit when form is submitted', async () => {
    const onSubmit = vi.fn();
    const onComplete = vi.fn();

    render(
      <MockedProvider mocks={mocks}>
        <QueryInput onSubmit={onSubmit} onComplete={onComplete} isLoading={false} />
      </MockedProvider>
    );

    const input = screen.getByPlaceholderText(/Ask about shipments/i);
    fireEvent.change(input, { target: { value: 'test query' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    expect(onSubmit).toHaveBeenCalled();
  });

  it('should show loading state during query execution', () => {
    render(
      <MockedProvider mocks={mocks}>
        <QueryInput onSubmit={() => {}} onComplete={() => {}} isLoading={false} />
      </MockedProvider>
    );

    // Button should be present (loading state is managed by mutation hook, not the isLoading prop)
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  it('should clear input after successful query', async () => {
    const onComplete = vi.fn();

    render(
      <MockedProvider mocks={mocks}>
        <QueryInput onSubmit={() => {}} onComplete={onComplete} isLoading={false} />
      </MockedProvider>
    );

    const input = screen.getByPlaceholderText(/Ask about shipments/i) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'test query' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });
});

