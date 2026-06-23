const { getRoute } = require("../utils/route");
const Ride = require("../modules/ride/ride.model");
const Driver = require("../modules/driver/driver.model");

const PENDING_RIDE_RADIUS_METERS = Number(process.env.DISPATCH_RADIUS_METERS) || 25000;

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("joinRide", (rideId) => {
      if (!rideId) return;
      socket.join(rideId);
      console.log("Joined ride:", rideId);
    });

    socket.on("joinDriver", async (driverId) => {
      if (!driverId) return;
      socket.join(driverId);
      console.log("Driver joined room:", driverId);

      try {
        const driver = await Driver.findById(driverId).lean();
        const coordinates = driver?.location?.coordinates;

        if (!driver?.isAvailable || !coordinates?.length) {
          return;
        }

        const pendingRides = await Ride.find({
          status: "REQUESTED",
          userLocation: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates
              },
              $maxDistance: PENDING_RIDE_RADIUS_METERS
            }
          }
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();

        pendingRides.forEach((ride) => {
          const [lng, lat] = ride.userLocation.coordinates;

          socket.emit("newRide", {
            rideId: ride._id.toString(),
            ride,
            location: { lng, lat },
            replayed: true
          });
        });
      } catch (err) {
        console.error("Pending ride replay error:", err.message);
      }
    });

    socket.on("driverLocation", async (data = {}) => {
      const { rideId, lat, lng } = data;

      if (!rideId || lat === undefined || lng === undefined) {
        return;
      }

      let eta = null;
      let route = null;
      let ride = null;

      try {
        ride = await Ride.findById(rideId).populate("driver").lean();
        const [userLng, userLat] = ride?.userLocation?.coordinates || [];

        if (userLat !== undefined && userLng !== undefined) {
          const result = await getRoute(
            { lat: Number(lat), lng: Number(lng) },
            { lat: userLat, lng: userLng }
          );

          eta = result?.eta || null;
          route = result?.geometry || null;
        }
      } catch (err) {
        console.error("Route lookup error:", err.message);
      }

      io.to(rideId).emit("driverLocation", {
        lat: Number(lat),
        lng: Number(lng),
        eta,
        route,
        rideId,
        ride: ride || null,
        status: ride?.status || null,
        driver: ride?.driver || null
      });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};
