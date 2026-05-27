import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { ScheduleLocationDTO } from "@/shared/types";
import { useEffect } from "react";

function SyncCenter({ value }: { value: ScheduleLocationDTO }) {
  const map = useMap();
  useEffect(() => {
    map.setView([value.lat, value.lng], map.getZoom());
  }, [map, value.lat, value.lng]);
  return null;
}

function DragMarker({ value, onChange }: { value: ScheduleLocationDTO; onChange?: (value: ScheduleLocationDTO) => void }) {
  useMapEvents({
    click(e) {
      onChange?.({ ...value, lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return (
    <Marker
      position={[value.lat, value.lng]}
      draggable={Boolean(onChange)}
      eventHandlers={{
        dragend(e) {
          const latlng = e.target.getLatLng();
          onChange?.({ ...value, lat: latlng.lat, lng: latlng.lng });
        },
      }}
    />
  );
}

export function MapSection({ value, onChange, height = 220 }: { value: ScheduleLocationDTO; onChange?: (value: ScheduleLocationDTO) => void; height?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface" style={{ height }}>
      <MapContainer center={[value.lat, value.lng]} zoom={14} className="h-full w-full" zoomControl={false}>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <SyncCenter value={value} />
        <DragMarker value={value} onChange={onChange} />
      </MapContainer>
    </div>
  );
}
