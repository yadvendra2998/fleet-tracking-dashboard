"use client";

import { useMemo } from "react";
import { useTripStore } from "../store/tripStore";
import { TripData } from "@/utils/fetchTrips";

export default function TripCard({ trip }: { trip: TripData }) {
  // const { activeEvents, selectedTripId, setSelectedTripId, simTimeMs } =
  //   useTripStore();

  // const ev = activeEvents[trip.trip_id];
  // const isSelected = selectedTripId === trip.trip_id;

  // const progress = useMemo(() => {
  //   if (!trip.events.length || !ev) return 0;
  //   const total = trip.events.length;
  //   const idx = trip.events.findIndex((e) => e.event_id === ev.event_id);
  //   return Math.round((idx / total) * 100);
  // }, [trip, ev]);

  const activeEvents = useTripStore((s) => s.activeEvents);
  const simTimeMs = useTripStore((s) => s.simTimeMs);
  const selectedTripId = useTripStore((s) => s.selectedTripId);
  const setSelectedTripId = useTripStore((s) => s.setSelectedTripId);

  const ev = activeEvents[trip.trip_id];

  const progress = useMemo(() => {
    if (!ev) return 0;
    const idx = trip.events.findIndex((e) => e.event_id === ev.event_id);
    if (idx === -1) return 0;
    return Math.round(((idx + 1) / trip.events.length) * 100);
  }, [trip, ev]);

  const isSelected = selectedTripId === trip.trip_id;

  return (
    <div
      onClick={() => setSelectedTripId(trip.trip_id)}
      className={`p-3 border rounded-lg shadow-sm cursor-pointer transition ${
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
      }`}
    >
      <div className="font-semibold text-xs text-gray-700">
        {trip.trip_name}
      </div>
      <span className="text-xs text-gray-500">
        {new Date(simTimeMs).toLocaleTimeString()}
      </span>

      <div className="mt-2 text-xs text-gray-600 space-y-1">
        {ev ? (
          <>
            <div>
              <span className="font-medium">Event:</span> {ev.event_type}
            </div>
            <div>
              <span className="font-medium">Speed:</span>{" "}
              {ev.movement?.speed_kmh ? `${ev.movement.speed_kmh} km/h` : "--"}
            </div>
            <div>
              <span className="font-medium">Vehicle:</span> {ev.vehicle_id}
            </div>
          </>
        ) : (
          <div>No active event yet</div>
        )}
      </div>

      <div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-1 text-right text-[10px] text-gray-400">
        {progress}% complete
      </div>
    </div>
  );
}
