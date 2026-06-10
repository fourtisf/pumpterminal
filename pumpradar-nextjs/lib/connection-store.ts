import { create } from 'zustand';

/**
 * Honest global connection state for the status bar / topbar pill.
 *
 * - 'demo'         — no backend configured (mock feed)
 * - 'live'         — WebSocket to the worker is open
 * - 'reconnecting' — backend configured but the socket is down
 *
 * Pages without a feed subscription keep the last known state; the initial
 * value reflects whether a backend is configured at all.
 */
export type ConnectionStatus = 'live' | 'reconnecting' | 'demo';

interface ConnectionState {
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
}

const initial: ConnectionStatus = process.env.NEXT_PUBLIC_WS_URL ? 'live' : 'demo';

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: initial,
  setStatus: (status) => set({ status }),
}));
