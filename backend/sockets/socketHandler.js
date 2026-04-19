// sockets/socketHandler.js
// Defines all Socket.IO real-time event handlers

/**
 * WebSocket Events:
 *
 * CLIENT → SERVER:
 *   join_as_driver     { driverId, driverName }  - Driver connects and joins driver room
 *   join_as_passenger  { passengerId }             - Passenger connects and joins personal room
 *   driver_going_offline { driverId }              - Driver disconnects gracefully
 *
 * SERVER → CLIENT:
 *   ride_request_broadcast  { ...rideDetails }    - Sent to all drivers when a new ride is requested
 *   driver_accept           { rideId, driverName, vehicleNumber, eta, passengerId } - Sent to all when driver accepts
 *   ride_update             { ...updatedRide }    - General ride status change
 *   connected               { message }           - Confirmation on socket connect
 */

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Acknowledge connection
    socket.emit("connected", { message: "Connected to Rickshaw Matching System" });

    // Driver joins the "drivers" room to receive ride broadcasts
    socket.on("join_as_driver", ({ driverId, driverName }) => {
      socket.join("drivers");
      socket.driverId = driverId;
      console.log(`[Socket] Driver joined: ${driverName} (${driverId})`);
      socket.emit("joined", { role: "driver", room: "drivers" });
    });

    // Passenger joins their own room (keyed by passengerId) for targeted notifications
    socket.on("join_as_passenger", ({ passengerId }) => {
      socket.join(`passenger_${passengerId}`);
      socket.passengerId = passengerId;
      console.log(`[Socket] Passenger joined room: passenger_${passengerId}`);
      socket.emit("joined", { role: "passenger", room: `passenger_${passengerId}` });
    });

    // Driver going offline — notify others
    socket.on("driver_going_offline", ({ driverId }) => {
      console.log(`[Socket] Driver going offline: ${driverId}`);
      socket.leave("drivers");
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = socketHandler;
