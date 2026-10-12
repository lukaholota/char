"use client";

import { Component, type ReactNode } from "react";

import { reportBoundaryError } from "@/lib/monitoring/report-error";
import { isChunkLoadError } from "@/lib/offline/chunk-load-error";

type Props = {
  children: ReactNode;
  fallback: ReactNode;
};

type State = {
  error: Error | null;
};

export class ChunkLoadBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error) && navigator.onLine) reportBoundaryError(error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (!isChunkLoadError(error)) throw error;
    return this.props.fallback;
  }
}
