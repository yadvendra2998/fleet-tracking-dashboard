type FleetEvent = any;

function toMs(ts: string) { return new Date(ts).getTime(); }

self.addEventListener('message', (ev) => {
  const { cmd, payload } = ev.data ?? {};

  if (cmd === 'prepare') {
    // payload: { tripFiles: [{ name, events }] }
    const rawTrips = payload.tripFiles || [];
    const trips = rawTrips.map((t: any) => {
      const events = (t.events || []).map((e: any) => ({ ...e, timestamp: new Date(e.timestamp).toISOString() }));
      events.sort((a: FleetEvent, b: FleetEvent) => toMs(a.timestamp) - toMs(b.timestamp));
      const timestamps = events.map((e: FleetEvent) => toMs(e.timestamp));
      return { name: t.name, trip_id: t.trip_id ?? (t.events?.[0]?.trip_id ?? t.name), events, timestamps };
    });
    // Post prepared structure (not huge because events are transferred back if needed)
    self.postMessage({ cmd: 'prepared', payload: { trips } });
  }

  if (cmd === 'findPointers') {
    // payload: { simTimeMs }
    const simTime = payload.simTimeMs;
    const trips = payload.trips; // expect trips array with timestamps (from prepared)
    const pointers = (trips || []).map((t: any) => {
      const arr = t.timestamps || [];
      let lo = 0, hi = arr.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] <= simTime) lo = mid + 1;
        else hi = mid;
      }
      return lo; // number of events <= simTime
    });
    self.postMessage({ cmd: 'pointers', payload: { pointers, simTime } });
  }
});
export {}; // keep module
