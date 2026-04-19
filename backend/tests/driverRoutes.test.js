// tests/driverRoutes.test.js
// Integration tests for driver REST endpoints using Supertest

jest.mock("../config/firebase");
jest.mock("../services/driverService");

const request = require("supertest");
const { app } = require("../server");
const driverService = require("../services/driverService");

const sampleDriver = {
  id: "d001",
  name: "Suresh",
  vehicleNumber: "JH05-1234",
  totalSeats: 3,
  availableSeats: 3,
  isOnline: true,
  registeredAt: Date.now(),
};

describe("POST /api/drivers/register", () => {
  it("should register a driver and return 201", async () => {
    driverService.registerDriver.mockResolvedValue(sampleDriver);

    const res = await request(app).post("/api/drivers/register").send({
      name: "Suresh",
      vehicleNumber: "JH05-1234",
      totalSeats: 3,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Suresh");
  });

  it("should return 400 if name or vehicleNumber are missing", async () => {
    const res = await request(app).post("/api/drivers/register").send({
      name: "Suresh",
      // missing vehicleNumber
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/name and vehicleNumber are required/i);
  });
});

describe("GET /api/drivers", () => {
  it("should return list of online drivers", async () => {
    driverService.getOnlineDrivers.mockResolvedValue([sampleDriver]);

    const res = await request(app).get("/api/drivers");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].id).toBe("d001");
  });
});

describe("GET /api/drivers/:driverId", () => {
  it("should return a single driver by ID", async () => {
    driverService.getDriverById.mockResolvedValue(sampleDriver);

    const res = await request(app).get("/api/drivers/d001");

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe("d001");
  });

  it("should return 500 if driver not found (service throws)", async () => {
    driverService.getDriverById.mockRejectedValue(new Error("Driver not found"));

    const res = await request(app).get("/api/drivers/nonexistent");

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe("PUT /api/drivers/:driverId/status", () => {
  it("should successfully update driver status", async () => {
    const updated = { ...sampleDriver, isOnline: false };
    driverService.setDriverStatus.mockResolvedValue(updated);

    const res = await request(app).put("/api/drivers/d001/status").send({
      isOnline: false,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.isOnline).toBe(false);
  });

  it("should return 400 if isOnline is not a boolean", async () => {
    const res = await request(app).put("/api/drivers/d001/status").send({
      isOnline: "yes",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/boolean/i);
  });
});

describe("PUT /api/drivers/:driverId/seats", () => {
  it("should successfully update available seats", async () => {
    const updated = { ...sampleDriver, availableSeats: 2 };
    driverService.updateAvailableSeats.mockResolvedValue(updated);

    const res = await request(app).put("/api/drivers/d001/seats").send({
      seats: 2,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.availableSeats).toBe(2);
  });

  it("should return 400 if seats is missing or invalid", async () => {
    const res = await request(app).put("/api/drivers/d001/seats").send({
      seats: -1,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/non-negative number/i);
  });
});
