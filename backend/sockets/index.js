
const { getRoute } = require("../utils/route");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 Connected:", socket.id);

    // 🚑 Join ride room (user + hospital)
    socket.on("joinRide", (rideId) => {
      socket.join(rideId);
      console.log("📥 Joined ride:", rideId);
    });

    // 🧑‍🚒 Driver joins personal room
    socket.on("joinDriver", (driverId) => {
      socket.join(driverId);
      console.log("👤 Driver joined room:", driverId);
    });

    // 📡 Driver sends live location
    socket.on("driverLocation", async (data) => {
      console.log("📡 BACKEND RECEIVED:", data);

      const { rideId, lat, lng } = data;

      const userLocation = {
        lat: 12.97,
        lng: 77.59
      };

      let eta = null;
      let route = null;

      try {
        const result = await getRoute(
          { lat, lng },
          userLocation
        );

        eta = result?.eta;
        route = result?.geometry;

        console.log("⏱ ETA:", eta);
        console.log("🛣 Route points:", route?.length);
      } catch (err) {
        console.error("ROUTE ERROR:", err.message);
      }

      console.log("📤 EMITTING TO ROOM:", rideId);

      io.to(rideId).emit("driverLocation", {
        lat,
        lng,
        eta,
        route
      });
    });

    socket.on("disconnect", () => {
      console.log("🔴 Disconnected:", socket.id);
    });
  });
};

