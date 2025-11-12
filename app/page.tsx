"use client";

import { useEffect } from "react";
import { fetchTrips } from "../utils/fetchTrips";
import { useTripStore } from "../store/tripStore";
import TripCard from "@/components/TripCard";
import dynamic from "next/dynamic";
import TimelineSlider from "@/components/TimelineSlider";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import { useSimulatorWorker } from "@/hooks/useSimulator";

const LeafletMap = dynamic(() => import("../components/LeafletMap"), {
  ssr: false,
});

export default function Page() {
  const { setTrips, trips } = useTripStore();
  const sim = useSimulatorWorker();

  const isPrepared = sim.isPrepared;

  useEffect(() => {
    (async () => {
      const data = await fetchTrips();
      // prepare trips in worker and set store
      sim.prepareTrips(data);
    })();
    // cleanup handled inside hook
  }, [sim]);

  // wire control functions

  const seek = sim.seek;
  const play = sim.play;
  const pause = sim.pause;
  const setSpeed = sim.setSpeed;

  return (
    <main className="p-2 grid grid-cols-4 gap-4">
      <section className="col-span-2 bg-white rounded shadow p-2">
        <LeafletMap />

        <div className="grid grid-cols-5 gap-2 mt-2">
          {trips.map((trip) => (
            <TripCard key={trip.trip_id} trip={trip} />
          ))}
        </div>
      </section>
      <div className="col-span-2 bg-white p-2 rounded shadow overflow-hidden">
        <TimelineSlider seek={seek} isPrepared={isPrepared} />
        <AnalyticsPanel
          play={play}
          pause={pause}
          setSpeed={setSpeed}
          isPrepared={isPrepared}
        />
      </div>
    </main>
  );
}
