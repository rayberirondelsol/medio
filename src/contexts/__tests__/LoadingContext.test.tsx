import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { LoadingProvider, useLoading } from '../LoadingContext';

// Test component that uses the loading context
const TestComponent: React.FC = () => {
  const { isLoading, startLoading, stopLoading, isAnyLoading } = useLoading();
  
  return (
    <div>
      <div data-testid="loading-state">
        {isLoading('test-key') ? 'Loading' : 'Not Loading'}
      </div>
      <div data-testid="any-loading">
        {isAnyLoading() ? 'Something Loading' : 'Nothing Loading'}
      </div>
      <button onClick={() => startLoading('test-key')}>Start Loading</button>
      <button onClick={() => stopLoading('test-key')}>Stop Loading</button>
      <button onClick={() => startLoading('another-key')}>Start Another</button>
    </div>
  );
};

describe('LoadingContext', () => {
  it('provides loading context to children', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );
    
    expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading');
    expect(screen.getByTestId('any-loading')).toHaveTextContent('Nothing Loading');
  });

  it('throws error when useLoading is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    const TestError = () => {
      const { isLoading } = useLoading();
      return <div>{isLoading('test') ? 'Loading' : 'Not Loading'}</div>;
    };
    
    expect(() => render(<TestError />)).toThrow(
      'useLoading must be used within a LoadingProvider'
    );
    
    console.error = originalError;
  });

  it('starts and stops loading for specific keys', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );
    
    const loadingState = screen.getByTestId('loading-state');
    const startButton = screen.getByText('Start Loading');
    const stopButton = screen.getByText('Stop Loading');
    
    // Initially not loading
    expect(loadingState).toHaveTextContent('Not Loading');
    
    // Start loading
    act(() => {
      startButton.click();
    });
    expect(loadingState).toHaveTextContent('Loading');
    
    // Stop loading
    act(() => {
      stopButton.click();
    });
    expect(loadingState).toHaveTextContent('Not Loading');
  });

  it('tracks multiple loading states independently', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );
    
    const anyLoadingState = screen.getByTestId('any-loading');
    const startButton = screen.getByText('Start Loading');
    const startAnotherButton = screen.getByText('Start Another');
    const stopButton = screen.getByText('Stop Loading');
    
    // Initially nothing loading
    expect(anyLoadingState).toHaveTextContent('Nothing Loading');
    
    // Start first loading
    act(() => {
      startButton.click();
    });
    expect(anyLoadingState).toHaveTextContent('Something Loading');
    
    // Start second loading
    act(() => {
      startAnotherButton.click();
    });
    expect(anyLoadingState).toHaveTextContent('Something Loading');
    
    // Stop first loading, second still loading
    act(() => {
      stopButton.click();
    });
    expect(anyLoadingState).toHaveTextContent('Something Loading');
  });

  it('isAnyLoading returns true when any key is loading', () => {
    const TestAnyLoading: React.FC = () => {
      const { startLoading, stopLoading, isAnyLoading } = useLoading();
      
      React.useEffect(() => {
        startLoading('key1');
        startLoading('key2');
      }, [startLoading]);
      
      return (
        <div>
          <div data-testid="any-loading">{isAnyLoading() ? 'Yes' : 'No'}</div>
          <button onClick={() => stopLoading('key1')}>Stop Key1</button>
          <button onClick={() => stopLoading('key2')}>Stop Key2</button>
        </div>
      );
    };
    
    render(
      <LoadingProvider>
        <TestAnyLoading />
      </LoadingProvider>
    );
    
    expect(screen.getByTestId('any-loading')).toHaveTextContent('Yes');
    
    act(() => {
      screen.getByText('Stop Key1').click();
    });
    expect(screen.getByTestId('any-loading')).toHaveTextContent('Yes');
    
    act(() => {
      screen.getByText('Stop Key2').click();
    });
    expect(screen.getByTestId('any-loading')).toHaveTextContent('No');
  });

  it('setLoading method works correctly', () => {
    const TestSetLoading: React.FC = () => {
      const { isLoading, setLoading } = useLoading();
      
      return (
        <div>
          <div data-testid="loading">{isLoading('test') ? 'Yes' : 'No'}</div>
          <button onClick={() => setLoading('test', true)}>Set True</button>
          <button onClick={() => setLoading('test', false)}>Set False</button>
        </div>
      );
    };
    
    render(
      <LoadingProvider>
        <TestSetLoading />
      </LoadingProvider>
    );
    
    expect(screen.getByTestId('loading')).toHaveTextContent('No');
    
    act(() => {
      screen.getByText('Set True').click();
    });
    expect(screen.getByTestId('loading')).toHaveTextContent('Yes');
    
    act(() => {
      screen.getByText('Set False').click();
    });
    expect(screen.getByTestId('loading')).toHaveTextContent('No');
  });
});