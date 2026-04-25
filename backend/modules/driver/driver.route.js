const express = require("express");
const router = express.Router();
const Driver = require("./driver.model");
const auth = require("../../shared/middleware/auth");

// ➤ Create driver (for testing)
router.post("/create", auth, async (req, res) => {
  const { name, phone, lng, lat } = req.body;

  const driver = new Driver({
    user: req.user.id,   // 🔥 THIS IS THE KEY
    name,
    phone,
    location: {
      type: "Point",
      coordinates: [lng, lat]
    }
  });

  await driver.save();

  res.json({ driver });
});
// ➤ Get all drivers (debug)
router.get("/all", async (req, res) => {
  const drivers = await Driver.find();
  res.json(drivers);
});

// ➤ Update driver location (SECURE)
router.post("/update-location", auth, async (req, res) => {
  const { lng, lat } = req.body;

  console.log("REQ USER:", req.user.id); // 👈 debug

  const driver = await Driver.findOneAndUpdate(
    { user: req.user.id },
    {
      location: {
        type: "Point",
        coordinates: [lng, lat]
      }
    },
    { returnDocument: "after" }
  );

  console.log("UPDATED DRIVER:", driver); // 👈 debug

  res.json({
    message: "Location updated",
    driver
  });
});
// ➤ Toggle availability (SECURE)
router.post("/set-availability", auth, async (req, res) => {
  const { isAvailable } = req.body;

  const driver = await Driver.findOneAndUpdate(
    { user: req.user.id },
    { isAvailable },
    { returnDocument: "after" }
  );

  res.json(driver);
});

router.get("/me", auth, async (req, res) => {
  const driver = await Driver.findOne({ user: req.user.id });

  if (!driver) {
    return res.status(404).json({ message: "Driver not found" });
  }

  res.json(driver);
});

module.exports = router;