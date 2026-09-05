import { Component, type PropsWithChildren } from 'react';

export class ErrorBoundary extends Component<PropsWithChildren, { error: string | null }> {
  override state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  override render() {
    if (this.state.error) return <main className="standalone-state" role="alert"><h1>ไม่สามารถแสดงหน้าจอได้</h1><p>{this.state.error}</p><button onClick={() => window.location.reload()}>โหลดใหม่</button></main>;
    return this.props.children;
  }
}
