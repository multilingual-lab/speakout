import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', color: '#ccc',
          fontFamily: 'system-ui', gap: '1rem', padding: '2rem', textAlign: 'center',
        }}>
          <span style={{ fontSize: '2rem' }}>😵</span>
          <h2 style={{ margin: 0 }}>Something went wrong</h2>
          <p style={{ color: '#888', margin: 0 }}>Try refreshing the page.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1.5rem', borderRadius: '8px', border: '1px solid #3a4f6e',
              background: 'none', color: '#ccc', cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
