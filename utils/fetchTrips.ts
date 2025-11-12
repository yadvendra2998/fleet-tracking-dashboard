export type FleetEvent = {
  event_id: string;
  event_type: string;
  timestamp: string;
  vehicle_id: string;
  trip_id: string;
  device_id: string;
  location: { lat: number; lng: number };
  planned_distance_km?: number;
  estimated_duration_hours?: number;
  [key: string]: any;
};

export type TripData = {
  trip_id: string;
  trip_name: string;
  events: FleetEvent[];
};

export async function fetchTrips(): Promise<TripData[]> {
  const files = [
    "trip_1_cross_country.json",
    "trip_2_urban_dense.json",
    "trip_3_mountain_cancelled.json",
    "trip_4_southern_technical.json",
    "trip_5_regional_logistics.json",
  ];

  const trips = await Promise.all(
    files.map(async (file) => {
      try {
        const res = await fetch(`/trips/${file}`);
        if (!res.ok) throw new Error("not found");
        const data: FleetEvent[] = await res.json();
        return {
          trip_id: data[0]?.trip_id ?? file,
          trip_name: file.replace(".json", "").replace(/_/g, " "),
          events: data,
        } as TripData;
      } catch {
        return { trip_id: file, trip_name: file, events: [] } as TripData;
      }
    })
  );

  return trips;
}
