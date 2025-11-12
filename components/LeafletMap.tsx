"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { useTripStore } from "../store/tripStore";

delete (L.Icon.Default as any).prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

function InterpolatedMarkers() {
  const { trips, simTimeMs, pointers, activeEvents } = useTripStore();
  // for each trip, find prev event index = pointers[i]-1, next = pointers[i]
  const markers = useMemo(() => {
    const arr: Array<{ id: string; lat: number; lng: number; info: any }> = [];
    for (let i = 0; i < trips.length; i++) {
      const trip = trips[i];
      const ptr = (pointers && pointers[i]) ?? 0;
      const prevIdx = Math.max(0, ptr - 1);
      const nextIdx = Math.min(trip.events.length - 1, ptr);
      const prev = trip.events[prevIdx];
      const next = trip.events[nextIdx];
      if (!prev && !next) continue;
      if (prev && !next) {
        arr.push({ id: trip.trip_id, lat: prev.location.lat, lng: prev.location.lng, info: prev });
        continue;
      }
      if (!prev && next) {
        arr.push({ id: trip.trip_id, lat: next.location.lat, lng: next.location.lng, info: next });
        continue;
      }
      // both exist -> interpolate
      const t0 = new Date(prev.timestamp).getTime();
      const t1 = new Date(next.timestamp).getTime();
      const t = simTimeMs ?? t0;
      const ratio = t1 === t0 ? 1 : Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
      const lat = prev.location.lat + (next.location.lat - prev.location.lat) * ratio;
      const lng = prev.location.lng + (next.location.lng - prev.location.lng) * ratio;
      arr.push({ id: trip.trip_id, lat, lng, info: ratio > 0.999 ? next : prev });
    }
    return arr;
  }, [trips, pointers, simTimeMs, activeEvents]);

  return (
    <>
      {markers.map(m => (
        <Marker key={m.id} position={[m.lat, m.lng]}>
          <Popup>
            <div className="text-xs">
              <b>{m.info.vehicle_id}</b>
              <div>{m.info.event_type}</div>
              <div>{new Date(m.info.timestamp).toLocaleString()}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export default function LeafletMap() {
  const { trips } = useTripStore();
  const center = trips[0]?.events?.[0]?.location ? [trips[0].events[0].location.lat, trips[0].events[0].location.lng] : [39.8283, -98.5795];

  return (
    <div className="map-container">
      <MapContainer center={center as any} zoom={4} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <InterpolatedMarkers />
      </MapContainer>
    </div>
  );
}
