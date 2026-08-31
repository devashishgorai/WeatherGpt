'use client';

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('WeatherGPT Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
          <h2 style={{ color: '#C62828' }}>⚠️ Something went wrong</h2>
          <p style={{ color: '#546E7A', margin: '12px 0 24px' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="header-btn active"
            onClick={() => window.location.reload()}
          >
            Reload WeatherGPT
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
