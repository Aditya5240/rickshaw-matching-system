// tests/stopController.test.js
// Unit tests for stop controller functions

jest.mock("../services/stopService");
const stopService = require("../services/stopService");
const { getStops, addStop, removeStop } = require("../controllers/stopController");

// Helper to create mock req/res/next
const mockReqRes = (body = {}, params = {}) => ({
  req: { body, params },
  res: {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  },
  next: jest.fn(),
});

describe("stopController - getStops", () => {
  it("should return all stops with success: true", async () => {
    const sampleStops = [
      { id: "s1", name: "Station Road" },
      { id: "s2", name: "College Gate" },
    ];
    stopService.getAllStops.mockResolvedValue(sampleStops);

    const { req, res, next } = mockReqRes();
    await getStops(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: sampleStops });
  });

  it("should call next with error if service fails", async () => {
    stopService.getAllStops.mockRejectedValue(new Error("DB error"));

    const { req, res, next } = mockReqRes();
    await getStops(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("stopController - addStop", () => {
  it("should add a stop and return 201", async () => {
    const newStop = { id: "s3", name: "Bus Stand", description: "Main bus stand" };
    stopService.addStop.mockResolvedValue(newStop);

    const { req, res, next } = mockReqRes({ name: "Bus Stand", description: "Main bus stand" });
    await addStop(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: newStop });
  });

  it("should call next with 400 error if name is missing", async () => {
    const { req, res, next } = mockReqRes({ name: "" });
    await addStop(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Stop name is required", statusCode: 400 })
    );
  });
});

describe("stopController - removeStop", () => {
  it("should delete a stop and return success", async () => {
    stopService.removeStop.mockResolvedValue({ id: "s1", deleted: true });

    const { req, res, next } = mockReqRes({}, { stopId: "s1" });
    await removeStop(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: "s1", deleted: true } });
  });

  it("should call next with error if stop not found", async () => {
    stopService.removeStop.mockRejectedValue(new Error("Stop not found"));

    const { req, res, next } = mockReqRes({}, { stopId: "nonexistent" });
    await removeStop(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
