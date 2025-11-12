"use client";

import { useTripStore } from "../store/tripStore";

type Props = {
  play: () => void;
  pause: () => void;
  setSpeed: (s: number) => void;
  isPrepared: boolean;
};

export default function PlaybackControls({ play, pause, setSpeed, isPrepared }: Props) {
  const running = useTripStore((s) => s.running);
  const speedMultiplier = useTripStore((s) => s.speedMultiplier);

  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-white rounded shadow-sm">
      <div className="flex items-center gap-2">
        <button
          onClick={() => (running ? pause() : play())}
          disabled={!isPrepared}
          className={`px-3 py-1 rounded text-sm font-medium ${running ? "bg-red-500 text-white cursor-not-allowed" : "bg-green-600 text-white cursor-pointer"} disabled:opacity-50`}
        >
          {running ? "Pause" : "Play"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        {[1, 5, 10].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-2 py-1 rounded text-sm ${s === speedMultiplier ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
