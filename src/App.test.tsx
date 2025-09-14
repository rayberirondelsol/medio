import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders App component with loading state', () => {
  render(<App />);
  // The app should initially show the loading spinner for lazy-loaded components
  const loadingElement = screen.getByText(/Loading.../i);
  expect(loadingElement).toBeInTheDocument();
});
