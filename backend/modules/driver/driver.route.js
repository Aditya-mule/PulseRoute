const express = require("express");
const Driver = require("./driver.model");
const auth = require("../../shared/middleware/auth");

const router = express.Router();

router.post("/create", auth, async (req, res) => {
  try {
    const { name, phone, lng, lat } = req.body;

    if (!name || !phone || lng === undefined || lat === undefined) {
      return res.status(400).json({ message: "Name, phone, lng and lat are required" });
    }

    const driver = await Driver.findOneAndUpdate(
      { user: req.user.id },
      {
        user: req.user.id,
        name,
        phone,
        location: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)]
        }
      },
      { returnDocument: "after", upsert: true, runValidators: true }
    );

    return res.status(201).json({ driver });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const drivers = await Driver.find();
    return res.json(drivers);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post("/update-location", auth, async (req, res) => {
  try {
    const { lng, lat } = req.body;

    if (lng === undefined || lat === undefined) {
      return res.status(400).json({ message: "lng and lat are required" });
    }

    const driver = await Driver.findOneAndUpdate(
      { user: req.user.id },
      {
        location: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)]
        }
      },
      { returnDocument: "after", runValidators: true }
    );

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    return res.json({
      message: "Location updated",
      driver
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post("/set-availability", auth, async (req, res) => {
  try {
    const { isAvailable } = req.body;

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ message: "isAvailable must be a boolean" });
    }

    const driver = await Driver.findOneAndUpdate(
      { user: req.user.id },
      { isAvailable },
      { returnDocument: "after", runValidators: true }
    );

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    return res.json(driver);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user.id });

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    return res.json(driver);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
