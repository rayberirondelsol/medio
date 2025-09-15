import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    const { container } = render(<LoadingSpinner />);
    
    expect(container.querySelector('.spinner')).toBeInTheDocument();
    expect(container.querySelector('.spinner-medium')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(container.querySelector('.spinner-overlay')).not.toBeInTheDocument();
  });

  it('renders with small size', () => {
    const { container } = render(<LoadingSpinner size="small" />);
    
    expect(container.querySelector('.spinner-small')).toBeInTheDocument();
    expect(container.querySelector('.spinner-medium')).not.toBeInTheDocument();
  });

  it('renders with large size', () => {
    const { container } = render(<LoadingSpinner size="large" />);
    
    expect(container.querySelector('.spinner-large')).toBeInTheDocument();
    expect(container.querySelector('.spinner-medium')).not.toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<LoadingSpinner text="Please wait..." />);
    
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders without text when text is empty', () => {
    const { container } = render(<LoadingSpinner text="" />);
    
    expect(container.querySelector('.spinner-text')).not.toBeInTheDocument();
  });

  it('renders with overlay when overlay prop is true', () => {
    const { container } = render(<LoadingSpinner overlay />);
    
    expect(container.querySelector('.spinner-overlay')).toBeInTheDocument();
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });

  it('renders without overlay when overlay prop is false', () => {
    const { container } = render(<LoadingSpinner overlay={false} />);
    
    expect(container.querySelector('.spinner-overlay')).not.toBeInTheDocument();
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });

  it('combines multiple props correctly', () => {
    const { container } = render(
      <LoadingSpinner size="large" text="Fetching data..." overlay />
    );
    
    expect(container.querySelector('.spinner-overlay')).toBeInTheDocument();
    expect(container.querySelector('.spinner-large')).toBeInTheDocument();
    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });

  it('renders spinner circle element', () => {
    const { container } = render(<LoadingSpinner />);
    
    expect(container.querySelector('.spinner-circle')).toBeInTheDocument();
  });

  it('maintains correct DOM structure with overlay', () => {
    const { container } = render(<LoadingSpinner overlay />);
    
    const overlay = container.querySelector('.spinner-overlay');
    const spinner = overlay?.querySelector('.spinner');
    const circle = spinner?.querySelector('.spinner-circle');
    
    expect(overlay).toBeInTheDocument();
    expect(spinner).toBeInTheDocument();
    expect(circle).toBeInTheDocument();
  });

  it('maintains correct DOM structure without overlay', () => {
    const { container } = render(<LoadingSpinner />);
    
    const spinner = container.querySelector('.spinner');
    const circle = spinner?.querySelector('.spinner-circle');
    const text = spinner?.querySelector('.spinner-text');
    
    expect(container.querySelector('.spinner-overlay')).not.toBeInTheDocument();
    expect(spinner).toBeInTheDocument();
    expect(circle).toBeInTheDocument();
    expect(text).toBeInTheDocument();
  });

  it('applies correct class based on size prop', () => {
    const { rerender, container } = render(<LoadingSpinner size="small" />);
    expect(container.querySelector('.spinner-small')).toBeInTheDocument();
    
    rerender(<LoadingSpinner size="medium" />);
    expect(container.querySelector('.spinner-medium')).toBeInTheDocument();
    
    rerender(<LoadingSpinner size="large" />);
    expect(container.querySelector('.spinner-large')).toBeInTheDocument();
  });
});