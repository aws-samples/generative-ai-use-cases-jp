import React from 'react';

export class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
}> {
  componentDidCatch(): void {
    this.forceUpdate();
  }
  render() {
    return <>{this.props.children}</>;
  }
}
