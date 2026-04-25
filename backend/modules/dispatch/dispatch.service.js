const Driver = require("../driver/driver.model");

const findNearbyDrivers = async (lng, lat) => {
  try {
    const drivers = await Driver.find({
      isAvailable: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          $maxDistance: 5000 // 5 km
        }
      }
    })
    .limit(5)
    .lean(); // ✅ faster

    return drivers;

  } catch (err) {
    console.error("Driver search error:", err.message);
    return [];
  }
};

module.exports = { findNearbyDrivers };