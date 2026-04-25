
const express = require("express");
const router = express.Router();

const Ride = require("./ride.model");
const { findNearbyDrivers } = require("../dispatch/dispatch.service");
const Driver = require("../driver/driver.model");

// 🚑 Request Ride (MULTI-DRIVER)
module.exports = (io) => {

  router.post("/request", async (req, res) => {
    const { lng, lat } = req.body;

    if (!lng || !lat) {
      return res.status(400).json({ message: "Location required" });
    }

    // 1. Create ride
    const ride = new Ride({
      userLocation: {
        type: "Point",
        coordinates: [lng, lat]
      },
      status: "REQUESTED"
    });

    await ride.save();

    // 2. Find nearby drivers
    const drivers = await findNearbyDrivers(lng, lat);

    if (!drivers.length) {
      return res.status(404).json({
        message: "No drivers nearby",
        ride
      });
    }

    // 3. 🔥 Broadcast to ALL drivers
    drivers.forEach((driver) => {
      io.to(driver._id.toString()).emit("newRide", {
        rideId: ride._id,
        location: { lng, lat }
      });
    });

    res.json({
      message: "Ride request sent to drivers",
      ride
    });
  });


  // ✅ ACCEPT RIDE (FIRST DRIVER WINS)
  router.post("/accept", async (req, res) => {
    const { rideId, driverId } = req.body;

    const ride = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        status: "REQUESTED" // 🔥 ensures only first driver gets it
      },
      {
        status: "DRIVER_ASSIGNED",
        driver: driverId
      },
      { returnDocument: "after" }
    );

    if (!ride) {
      return res.status(400).json({
        message: "Ride already taken"
      });
    }

    // 🔒 Lock driver
    await Driver.findByIdAndUpdate(
      driverId,
      { isAvailable: false },
      { returnDocument: "after" }
    );

    res.json({
      message: "Ride accepted",
      ride
    });
  });


  // 🚀 Start Ride
  router.post("/start", async (req, res) => {
    const { rideId } = req.body;

    const ride = await Ride.findByIdAndUpdate(
      rideId,
      { status: "ONGOING" },
      { returnDocument: "after" }
    );

    res.json({
      message: "Ride started",
      ride
    });
  });


  // 🏁 Complete Ride
  router.post("/complete", async (req, res) => {
    const { rideId } = req.body;

    const ride = await Ride.findById(rideId).populate("driver");

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    ride.status = "COMPLETED";
    await ride.save();

    // 🔓 Free driver
    await Driver.findByIdAndUpdate(
      ride.driver._id,
      { isAvailable: true },
      { returnDocument: "after" }
    );

    res.json({
      message: "Ride completed",
      ride
    });
  });

  return router;
};




