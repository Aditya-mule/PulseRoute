const Driver = require("../driver/driver.model");

const DISPATCH_RADIUS_METERS = Number(process.env.DISPATCH_RADIUS_METERS) || 25000;

const findNearbyDrivers = async (lng, lat) => {
  return Driver.find({
    isAvailable: true,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        $maxDistance: DISPATCH_RADIUS_METERS
      }
    }
  })
    .limit(5)
    .lean();
};

module.exports = { findNearbyDrivers };
