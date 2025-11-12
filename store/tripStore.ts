// src/store/tripStore.ts
import { create } from 'zustand';
import type { FleetEvent, TripData } from '../utils/fetchTrips';

type Alert = { id: string; type: string; msg: string; ts: string; severity?: string };

type Store = {
  trips: TripData[];
  setTrips: (t: TripData[]) => void;

  // active vehicle state: last event known (we store event + computed interp position)
  activeEvents: Record<string, FleetEvent | null>;
  vehiclePositions: Record<string, { lat: number; lng: number; lastTs: number; nextTs?: number; nextLat?: number; nextLng?: number } | null>;
  bulkUpdateVehicles: (updates: Array<{ tripId: string; event: FleetEvent }>) => void;
  setActiveEvent: (tripId: string, event: FleetEvent | null) => void;

  // simulation
  simTimeMs: number;
  setSimTimeMs: (t: number) => void;
  pointers: number[]; // pointer per trip index order used during prepare
  setPointers: (p: number[]) => void;

  // control
  running: boolean;
  speedMultiplier: number;
  setRunning: (r: boolean) => void;
  setSpeed: (s: number) => void;

  // alerts
  alerts: Alert[];
  pushAlert: (a: Alert) => void;
  reset: () => void;
  selectedTripId:string | null,
  setSelectedTripId:(id:string) => void
};

export const useTripStore = create<Store>((set, get) => ({
  trips: [],
  setTrips: (t) => set({ trips: t }),

  activeEvents: {},
  vehiclePositions: {},
  bulkUpdateVehicles: (updates) => set((s) => {
    const activeEvents = { ...s.activeEvents };
    const vehiclePositions = { ...s.vehiclePositions };
    for (const u of updates) {
      activeEvents[u.tripId] = u.event;
      if (u.event?.location) {
        vehiclePositions[u.tripId] = {
          lat: u.event.location.lat,
          lng: u.event.location.lng,
          lastTs: new Date(u.event.timestamp).getTime()
        };
      }
    }
    return { activeEvents, vehiclePositions };
  }),
  setActiveEvent: (tripId, event) => set((s) => ({ activeEvents: { ...s.activeEvents, [tripId]: event } })),

  simTimeMs: 0,
  setSimTimeMs: (t) => set({ simTimeMs: t }),

  pointers: [],
  setPointers: (p) => set({ pointers: p }),

  running: false,
  speedMultiplier: 1,
  setRunning: (r) => set({ running: r }),
  setSpeed: (s) => set({ speedMultiplier: s }),

  alerts: [],
  pushAlert: (a) => set((s) => ({ alerts: [a, ...s.alerts].slice(0, 500) })),
  reset: () => set({
    trips: [], activeEvents: {}, vehiclePositions: {}, simTimeMs: 0, pointers: [], running: false, speedMultiplier: 1, alerts: []
  }),
  selectedTripId: null,
  setSelectedTripId: (id:string) => set({ selectedTripId: id }),
}));
