export default function RideCard({ ride }) {
  return (
    <div className="p-4 bg-gray-100 rounded-xl">
      <p className="text-sm text-gray-500">Ride ID</p>
      <p className="font-medium">{ride._id}</p>

      <p className="text-sm text-gray-500 mt-2">Status</p>
      <p className="font-semibold text-green-600">{ride.status}</p>
    </div>
  );
}