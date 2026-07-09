import { Component, type ReactNode } from 'react';
import { ChartAlert } from './ChartAlert';

interface Props {
  children: ReactNode;
  title: string;
  rawJson?: string;
}
interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class ChartErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }
  componentDidCatch(error: Error) {
    console.error('[ChartErrorBoundary]', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <ChartAlert
          variant="error"
          title={this.props.title}
          detail={this.state.errorMessage ?? undefined}
          rawJson={this.props.rawJson}
        />
      );
    }
    return this.props.children;
  }
}
