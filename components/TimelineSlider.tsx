"use client";

import React, { useMemo, useState } from "react";
import { useTripStore } from "../store/tripStore";
import { format } from "date-fns";

type Props = {
  seek: (ms: number) => void;
  isPrepared: boolean;
};

export default function TimelineSlider({ seek, isPrepared }: Props) {
  const trips = useTripStore((s) => s.trips);
  const simTimeMs = useTripStore((s) => s.simTimeMs);
  const [localValue, setLocalValue] = useState<number | null>(null);

  const [minTs, maxTs, startTs] = useMemo(() => {
    const all = trips.flatMap((t) => t.events.map((e) => new Date(e.timestamp).getTime()));
    if (all.length === 0) return [0, 0, 0];
    const min = Math.min(...all);
    const max = Math.max(...all);
    return [min, max, min];
  }, [trips]);

  if (!isPrepared || minTs === 0 && maxTs === 0) return <div className="p-2 text-sm text-gray-500">Timeline not available</div>;

  const current = localValue ?? simTimeMs;

  const onChange = (value: number) => {
    setLocalValue(value);
  };

  const onCommit = () => {
    if (localValue != null) {
      seek(localValue);
      setLocalValue(null);
    }
  };

  return (
    <div className="p-3 bg-white rounded shadow-sm">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <div>{format(new Date(minTs), "yyyy-MM-dd HH:mm:ss")}</div>
        <div>{format(new Date(current), "yyyy-MM-dd HH:mm:ss")}</div>
        <div>{format(new Date(maxTs), "yyyy-MM-dd HH:mm:ss")}</div>
      </div>

      <input
        type="range"
        min={minTs}
        max={maxTs}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
        className="w-full"
      />
    </div>
  );
}
