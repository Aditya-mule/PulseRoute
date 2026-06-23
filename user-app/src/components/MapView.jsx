import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline
} from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

function SmoothMarker({ location }) {
  const [pos, setPos] = useState(location);
  const map = useMap();

  useEffect(() => {
    if (pos) {
      map.panTo([pos.lat, pos.lng]);
    }
  }, [pos, map]);

  useEffect(() => {
    if (!location) return;

    const interval = setInterval(() => {
      setPos((prev) => {
        if (!prev) return location;

        return {
          lat: prev.lat + (location.lat - prev.lat) * 0.2,
          lng: prev.lng + (location.lng - prev.lng) * 0.2
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [location]);

  if (!pos) return null;

  return (
    <Marker position={[pos.lat, pos.lng]}>
      <Popup>Ambulance</Popup>
    </Marker>
  );
}

export default function MapView({ location, ride }) {
  const coords = ride?.userLocation?.coordinates;
  const user = coords
    ? { lat: coords[1], lng: coords[0] }
    : { lat: 12.97, lng: 77.59 };

  const routeCoords = location?.route
    ? location.route.map(([lng, lat]) => [lat, lng])
    : [];

  return (
    <div className="space-y-2">
      <MapContainer
        center={[user.lat, user.lng]}
        zoom={15}
        className="h-64 w-full rounded-xl"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Marker position={[user.lat, user.lng]}>
          <Popup>Pickup</Popup>
        </Marker>

        {location && <SmoothMarker location={location} />}

        {routeCoords.length > 0 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: "red", weight: 4 }}
          />
        )}
      </MapContainer>

      {location?.eta && (
        <div className="bg-white shadow-md p-3 rounded-xl text-center text-sm">
          ETA: <span className="font-semibold">{location.eta} min</span>
        </div>
      )}
    </div>
  );
}
