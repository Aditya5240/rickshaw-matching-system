// tests/socket.test.js
// Integration tests for Socket.IO event flow
// Tests join events, ride broadcast, and driver_accept flow

jest.mock("../config/firebase");
jest.mock("../services/matchingService");

const http = require("http");
const { Server } = require("socket.io");
const { io: ioc } = require("socket.io-client"); // client-side socket for testing
const socketHandler = require("../sockets/socketHandler");

let server, io, clientA, clientB;
const PORT = 5099; // isolated test port

// ── Setup ─────────────────────────────────────────────────────────────────
beforeAll((done) => {
  const app = require("express")();
  server = http.createServer(app);

  io = new Server(server, { cors: { origin: "*" } });
  socketHandler(io);

  server.listen(PORT, done);
});

afterAll((done) => {
  if (clientA?.connected) clientA.disconnect();
  if (clientB?.connected) clientB.disconnect();
  io.close();
  server.close(done);
});

// Helper: create a connected socket client
const createClient = () =>
  ioc(`http://localhost:${PORT}`, {
    transports: ["websocket"],
    forceNew: true,
  });

const waitFor = (socket, event) =>
  new Promise((resolve) => socket.once(event, resolve));

// ── Tests ─────────────────────────────────────────────────────────────────

describe("Socket.IO - Connection", () => {
  it("should emit 'connected' event on connect", async () => {
    clientA = createClient();
    const data = await waitFor(clientA, "connected");
    expect(data).toHaveProperty("message");
    expect(data.message).toMatch(/rickshaw/i);
  });
});

describe("Socket.IO - Driver Room", () => {
  it("driver should receive 'joined' with role=driver after join_as_driver", async () => {
    clientA = createClient();
    await waitFor(clientA, "connected");

    clientA.emit("join_as_driver", { driverId: "d001", driverName: "Suresh" });
    const joined = await waitFor(clientA, "joined");

    expect(joined.role).toBe("driver");
    expect(joined.room).toBe("drivers");
  });
});

describe("Socket.IO - Passenger Room", () => {
  it("passenger should receive 'joined' with correct room name", async () => {
    clientB = createClient();
    await waitFor(clientB, "connected");

    clientB.emit("join_as_passenger", { passengerId: "p001" });
    const joined = await waitFor(clientB, "joined");

    expect(joined.role).toBe("passenger");
    expect(joined.room).toBe("passenger_p001");
  });
});

describe("Socket.IO - Ride Broadcast", () => {
  it("all clients should receive ride_request_broadcast emitted by server", (done) => {
    const client1 = createClient();
    const client2 = createClient();

    let readyCount = 0;
    const onReady = () => {
      readyCount++;
      if (readyCount === 2) {
        // Server emits the broadcast (simulating what REST route does)
        io.emit("ride_request_broadcast", {
          id: "ride-123",
          passengerId: "p001",
          pickupStop: "Station Road",
          destinationStop: "College Gate",
          status: "pending",
        });
      }
    };

    let received = 0;
    const onBroadcast = (data) => {
      expect(data.id).toBe("ride-123");
      expect(data.status).toBe("pending");
      received++;
      if (received === 2) {
        client1.disconnect();
        client2.disconnect();
        done();
      }
    };

    client1.on("connected", onReady);
    client2.on("connected", onReady);
    client1.on("ride_request_broadcast", onBroadcast);
    client2.on("ride_request_broadcast", onBroadcast);
  });
});

describe("Socket.IO - Driver Accept", () => {
  it("driver_accept event should carry correct payload", (done) => {
    const client = createClient();
    client.on("connected", () => {
      client.on("driver_accept", (data) => {
        expect(data).toHaveProperty("rideId");
        expect(data).toHaveProperty("driverName");
        expect(data).toHaveProperty("eta");
        client.disconnect();
        done();
      });

      // Simulate server emitting driver_accept
      io.emit("driver_accept", {
        rideId: "ride-123",
        passengerId: "p001",
        driverName: "Suresh",
        vehicleNumber: "JH05-1234",
        eta: "5 min",
      });
    });
  });
});
