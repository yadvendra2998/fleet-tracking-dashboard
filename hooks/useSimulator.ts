"use client";
import { useEffect, useRef, useCallback } from "react";
import { useTripStore } from "../store/tripStore";
import type { FleetEvent, TripData } from "../utils/fetchTrips";

type PreparedTrip = {
  name: string;
  trip_id: string;
  events: FleetEvent[];
  timestamps: number[];
};

export function useSimulatorWorker() {
  const {
    trips, setTrips,
    setSimTimeMs, simTimeMs,
    setPointers, pointers,
    bulkUpdateVehicles, setActiveEvent,
    running, setRunning, speedMultiplier, pushAlert
  } = useTripStore();

  const workerRef = useRef<Worker | null>(null);
  const preparedRef = useRef<PreparedTrip[] | null>(null);
  const lastPointersRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  // create worker
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = new Worker(new URL("../workers/eventProcessor.ts", import.meta.url), { type: "module" });
    workerRef.current = w;

    w.onmessage = (e: MessageEvent) => {
      const { cmd, payload } = e.data;
      if (cmd === "prepared") {
        preparedRef.current = payload.trips;
        // Initialize pointers array
        const p = preparedRef.current?.map(() => 0) || [];
        setPointers(p);
        lastPointersRef.current = p.slice();
        // set simTime to earliest event
        const allTs = preparedRef.current?.flatMap(t => t.timestamps) || [];
        if (allTs.length > 0) {
          const minTs = Math.min(...allTs);
          setSimTimeMs(minTs);
        }
      }
      if (cmd === "pointers") {
        const { pointers: newPointers, simTime } = payload;
        // Update store pointers and optionally process events between lastPointersRef and newPointers
        setPointers(newPointers);
        // process deltas: for each trip, process events [oldPtr, newPtr)
        const updates: Array<{ tripId: string; event: FleetEvent }> = [];
        for (let i = 0; i < (preparedRef.current?.length ?? 0); i++) {
          const trip = preparedRef.current![i];
          const oldPtr = lastPointersRef.current[i] ?? 0;
          const newPtr = newPointers[i] ?? 0;
          if (newPtr > oldPtr) {
            // process all events in delta -- for performance we only take the last event to represent current state,
            // but we also push alerts for special events in that delta
            for (let j = oldPtr; j < newPtr; j++) {
              const ev = trip.events[j];
              // push alerts for special event types
              if (ev.event_type === "speed_violation" || ev.overspeed) {
                pushAlert({ id: ev.event_id, type: "speed_violation", ts: ev.timestamp, msg: `Overspeed ${ev.movement?.speed_kmh ?? "?"}`, severity: "warning" });
              }
              if (ev.event_type === "trip_cancelled") {
                pushAlert({ id: ev.event_id, type: "trip_cancelled", ts: ev.timestamp, msg: `Trip cancelled ${ev.trip_id}`, severity: "critical" });
              }
            }
            // take last event as active state
            const lastEv = trip.events[newPtr - 1];
            updates.push({ tripId: trip.trip_id, event: lastEv });
          } else if (newPtr === 0) {
            // no events yet
            updates.push({ tripId: trip.trip_id, event: null as any });
          }
        }
        if (updates.length) bulkUpdateVehicles(updates);
        lastPointersRef.current = newPointers.slice();
        // set simTime as returned
        setSimTimeMs(simTime);
      }
    };

    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, [bulkUpdateVehicles, pushAlert, setPointers, setSimTimeMs]);

  // prepareTrips: forward trips (with events) to worker
  const prepareTrips = useCallback((tripFiles: TripData[]) => {
    setTrips(tripFiles);
    if (!workerRef.current) return;
    const payload = tripFiles.map(t => ({ name: t.trip_id, trip_id: t.trip_id, events: t.events }));
    workerRef.current.postMessage({ cmd: "prepare", payload: { tripFiles: payload } });
  }, [setTrips]);

  // play/pause loop -> use RAF for smoothness. RAF will compute simTime advance using speedMultiplier
  const play = useCallback(() => {
    if (!preparedRef.current || !workerRef.current) return;
    setRunning(true);
    lastFrameRef.current = performance.now();
    const step = (now: number) => {
      const last = lastFrameRef.current ?? now;
      const dt = Math.max(0, now - last); // ms
      lastFrameRef.current = now;
      // advance simTime by dt * speedMultiplier
      const advance = dt * (speedMultiplier ?? 1);
      const newSim = (simTimeMs ?? 0) + advance;
      // ask worker for pointers at newSim
      workerRef.current!.postMessage({ cmd: 'findPointers', payload: { simTimeMs: Math.round(newSim), trips: preparedRef.current } });
      // schedule next frame
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [setRunning, simTimeMs, speedMultiplier]);

  const pause = useCallback(() => {
    setRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastFrameRef.current = null;
  }, [setRunning]);

  // set speed multiplier
  const setSpeed = useCallback((s: number) => {
    setSpeedInternal(s);
  }, []);

  // helper setter since we shadowed names
  const setSpeedInternal = (s: number) => {
    useTripStore.getState().setSpeed(s); // call store updater
  };

  // seek: set simTimeMs to tMs and set pointers accordingly (fast)
  const seek = useCallback((targetMs: number) => {
    if (!workerRef.current || !preparedRef.current) {
      // fallback: set simTime only
      setSimTimeMs(targetMs);
      return;
    }
    workerRef.current.postMessage({ cmd: 'findPointers', payload: { simTimeMs: Math.round(targetMs), trips: preparedRef.current } });
    // worker will respond with pointers and bulk update active events
    // also set simTimeMs when worker responds
  }, [setSimTimeMs]);

  // cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // expose preparedRef for UI to know readiness
  const isPrepared = !!preparedRef.current;

  return {
    prepareTrips,
    play,
    pause,
    seek,
    isPrepared,
    setSpeed,
    getPreparedTrips: () => preparedRef.current,
  };
}
