'use client';
import { Component, type ReactNode } from 'react';
export class ProductBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="product-home">
        <h1>The simulator couldn’t display this view.</h1>
        <p>
          Reload to try again. Saved network data has not been deliberately
          cleared; any unsaved edits may be lost.
        </p>
        <button
          className="product-reload"
          onClick={() => window.location.reload()}
        >
          Reload simulator
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
