"use client";
import { useMemo, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useTripStore } from "../store/tripStore";
import PlaybackControls from "./PlaybackControls";
import { useSimulatorWorker } from "@/hooks/useSimulator";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);
type Props = {
  play: () => void;
  pause: () => void;
  setSpeed: (s: number) => void;
  isPrepared: boolean;
};
export default function AnalyticsPanel({
  isPrepared,
  play,
  pause,
  setSpeed,
}: Props) {
  const { trips, pointers, selectedTripId, setSelectedTripId } = useTripStore();

  const selected = selectedTripId ?? trips[0]?.trip_id;

  const trip = trips.find((t) => t.trip_id === selected) ?? trips[0];
  const idx = trips.findIndex((t) => t.trip_id === trip?.trip_id);
  const pointer = pointers[idx] ?? 0;

  // build dataset: speed vs time for events up to pointer
  const speedData = useMemo(() => {
    if (!trip) return { labels: [], datasets: [] };
    const events = trip.events.slice(0, pointer);
    const labels = events.map((e) =>
      new Date(e.timestamp).toLocaleTimeString()
    );
    const data = events.map((e) => e.movement?.speed_kmh ?? null);
    return {
      labels,
      datasets: [
        {
          label: "Speed (km/h)",
          data,
          borderColor: "rgb(37,99,235)",
          backgroundColor: "rgba(37,99,235,0.2)",
          tension: 0.2,
        },
      ],
    };
  }, [trip, pointer]);

  // event rate: bucket events per hour for entire trip or per last N hours
  const eventRate = useMemo(() => {
    if (!trip) return { labels: [], datasets: [] };
    const tsArr = trip.events.map((e) => new Date(e.timestamp).getTime());
    if (tsArr.length === 0) return { labels: [], datasets: [] };
    const min = Math.min(...tsArr),
      max = Math.max(...tsArr);
    // bucket size: 6 buckets
    const buckets = 12;
    const width = (max - min) / buckets;
    const counts = new Array(buckets).fill(0);
    for (const t of tsArr) {
      const idx = Math.min(buckets - 1, Math.floor((t - min) / (width || 1)));
      counts[idx]++;
    }
    const labels = new Array(buckets)
      .fill(0)
      .map((_, i) => new Date(min + i * width).toLocaleTimeString());
    return {
      labels,
      datasets: [
        {
          label: "Events",
          data: counts,
          backgroundColor: "rgba(16,185,129,0.6)",
        },
      ],
    };
  }, [trip]);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Trip:</label>
          <select
            value={selected ?? ""}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="border bg-white rounded px-2 py-1 text-sm text-gray-400"
          >
            {trips.map((t) => (
              <option
                key={t.trip_id}
                value={t.trip_id}
                className="text-gray-400"
              >
                {t.trip_name}
              </option>
            ))}
          </select>
        </div>
        <PlaybackControls
          play={play}
          pause={pause}
          setSpeed={setSpeed}
          isPrepared={isPrepared}
        />
      </div>

      <div className="mt-3 p-2 bg-white rounded shadow-sm">
        <div className="text-sm font-medium mb-1 text-gray-500">
          Speed over Time
        </div>
        <Line data={speedData} />
      </div>

      <div className="mt-4 p-2 bg-white rounded shadow-sm">
        <div className="text-sm font-medium mb-1 text-gray-500">Event Rate</div>
        <Bar data={eventRate} />
      </div>
    </div>
  );
}
