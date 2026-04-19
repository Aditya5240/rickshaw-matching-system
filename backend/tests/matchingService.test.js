// tests/matchingService.test.js
// Unit tests for core matching logic
// Firebase is mocked — no real DB calls are made

jest.mock("../config/firebase");
jest.mock("uuid", () => ({ v4: () => "mock-uuid-1234" }));

const { getDb } = require("../config/firebase");

// ── Mock Firebase DB structure ───────────────────────────────────────────
const mockRideData = {
  id: "mock-uuid-1234",
  passengerId: "p001",
  passengerName: "Ravi",
  pickupStop: "Station Road",
  destinationStop: "College Gate",
  seats: 2,
  status: "pending",
  driverId: null,
  driverName: null,
  eta: null,
};

let mockDb;

beforeEach(() => {
  mockDb = {
    ref: jest.fn().mockReturnValue({
      set: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue(true),
      remove: jest.fn().mockResolvedValue(true),
      once: jest.fn().mockResolvedValue({
        exists: () => true,
        val: () => ({ ...mockRideData }),
      }),
      orderByChild: jest.fn().mockReturnThis(),
      equalTo: jest.fn().mockReturnThis(),
    }),
  };
  getDb.mockReturnValue(mockDb);
});

const matchingService = require("../services/matchingService");

// ── Tests ────────────────────────────────────────────────────────────────

describe("matchingService - createRideRequest", () => {
  it("should create a ride request with correct fields", async () => {
    const ride = await matchingService.createRideRequest({
      passengerId: "p001",
      passengerName: "Ravi",
      pickupStop: "Station Road",
      destinationStop: "College Gate",
      seats: 2,
    });

    expect(ride.id).toBe("mock-uuid-1234");
    expect(ride.status).toBe("pending");
    expect(ride.pickupStop).toBe("Station Road");
    expect(ride.destinationStop).toBe("College Gate");
    expect(ride.seats).toBe(2);
    expect(ride.driverId).toBeNull();
  });

  it("should default seats to 1 if not provided", async () => {
    const ride = await matchingService.createRideRequest({
      passengerId: "p002",
      passengerName: "Meena",
      pickupStop: "Market",
      destinationStop: "Hospital",
    });

    expect(ride.seats).toBe(1);
  });

  it("should call Firebase set with correct path", async () => {
    await matchingService.createRideRequest({
      passengerId: "p001",
      passengerName: "Ravi",
      pickupStop: "A",
      destinationStop: "B",
    });

    expect(mockDb.ref).toHaveBeenCalledWith("rideRequests/mock-uuid-1234");
    expect(mockDb.ref().set).toHaveBeenCalled();
  });
});

describe("matchingService - acceptRideRequest", () => {
  it("should update ride status to accepted and set driver info", async () => {
    const rideRef = {
      once: jest.fn().mockResolvedValue({
        exists: () => true,
        val: () => ({ ...mockRideData }),
      }),
      update: jest.fn().mockResolvedValue(true),
    };

    const driverRef = {
      once: jest.fn().mockResolvedValue({
        exists: () => true,
        val: () => ({ availableSeats: 3 }),
      }),
      update: jest.fn().mockResolvedValue(true),
    };

    mockDb.ref.mockImplementation((path) => {
      if (path === `rideRequests/${mockRideData.id}`) return rideRef;
      if (path.startsWith("drivers/")) return driverRef;
      return { once: jest.fn(), update: jest.fn() };
    });

    const updated = await matchingService.acceptRideRequest(mockRideData.id, {
      driverId: "d001",
      driverName: "Suresh",
      vehicleNumber: "JH05-1234",
    });

    expect(updated.status).toBe("accepted");
    expect(updated.driverId).toBe("d001");
    expect(updated.driverName).toBe("Suresh");
    expect(updated.eta).toMatch(/\d+ min/);
    expect(rideRef.update).toHaveBeenCalled();
  });

  it("should throw if ride does not exist", async () => {
    mockDb.ref.mockReturnValue({
      once: jest.fn().mockResolvedValue({ exists: () => false, val: () => null }),
      update: jest.fn(),
    });

    await expect(
      matchingService.acceptRideRequest("nonexistent", { driverId: "d001", driverName: "X" })
    ).rejects.toThrow("Ride request not found");
  });

  it("should throw if ride is already accepted", async () => {
    mockDb.ref.mockReturnValue({
      once: jest.fn().mockResolvedValue({
        exists: () => true,
        val: () => ({ ...mockRideData, status: "accepted" }),
      }),
      update: jest.fn(),
    });

    await expect(
      matchingService.acceptRideRequest("mock-uuid-1234", { driverId: "d001", driverName: "X" })
    ).rejects.toThrow("Ride request is no longer available");
  });
});

describe("matchingService - cancelRideRequest", () => {
  it("should set ride status to cancelled", async () => {
    const rideRef = {
      once: jest.fn().mockResolvedValue({ exists: () => true, val: () => mockRideData }),
      update: jest.fn().mockResolvedValue(true),
    };
    mockDb.ref.mockReturnValue(rideRef);

    const result = await matchingService.cancelRideRequest("mock-uuid-1234");
    expect(result.status).toBe("cancelled");
    expect(rideRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled" })
    );
  });
});
