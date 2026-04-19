# 🛺 Rickshaw Matching System

A real-time ride-matching platform built without GPS or maps. Passengers request rides between predefined stops; drivers accept them. All matching happens through WebSocket events for instant updates.

---

## 📋 Project Overview

This system mimics a ride-hailing platform using a stop-based model (like bus stops). Instead of GPS coordinates, passengers select pickup and destination stops from a fixed list. Drivers see live incoming requests and accept them in real time.

**Roles:**
- **Passenger** — selects stops and broadcasts a ride request
- **Driver** — views incoming requests and accepts them
- **Admin** — manages the list of stops

---

## ✨ Features

| Feature | Description |
|---|---|
| Stop selection | Passengers choose from predefined stops |
| Real-time ride broadcast | New requests pushed instantly to all online drivers |
| Driver acceptance | Driver accepts a ride; passenger is notified immediately |
| Seat management | Driver's available seats decrease on acceptance |
| Online/Offline toggle | Drivers can go online or offline |
| Stop CRUD | Admin can add and remove stops |
| Mock ETA | System generates a random ETA on acceptance |
| REST + WebSocket | Hybrid architecture for both persistent data and live events |

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6 |
| Backend | Node.js, Express 4 |
| Real-time | Socket.IO 4 (WebSockets) |
| Database | Firebase Realtime Database |
| HTTP Client | Axios |
| Testing | Jest, Supertest, socket.io-client |
| Deployment | Render (separate frontend + backend services) |

---

## 🏗️ High-Level Design

### Use Cases & Flow
![Use Case Diagram](./use_case_diagram.png)

![Activity Flow Diagram](./activity_flow_diagram.png)

### Architecture Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                      │
│                                                               │
│  ┌─────────────────┐   ┌─────────────────┐  ┌─────────────┐  │
│  │  Passenger UI   │   │   Driver UI     │  │  Admin UI   │  │
│  │  - Select stops │   │  - View requests│  │  - Add stop │  │
│  │  - Request ride │   │  - Accept ride  │  │  - Del stop │  │
│  │  - View status  │   │  - Online/Off   │  │             │  │
│  └────────┬────────┘   └────────┬────────┘  └──────┬──────┘  │
│           │   REST + Socket.IO  │                  │ REST     │
└───────────┼────────────────────┼──────────────────┼──────────┘
            │                    │                  │
            ▼                    ▼                  ▼
┌───────────────────────────────────────────────────────────────┐
│                     BACKEND (Express + Socket.IO)             │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ /api/rides   │  │ /api/drivers │  │    /api/stops        │ │
│  │ rideController  │ driverCtrl   │  │    stopController    │ │
│  └──────┬───────┘  └──────────────┘  └─────────────────────┘ │
│         │                                                     │
│  ┌──────▼──────────────────────────────────────────────────┐  │
│  │            matchingService / driverService               │  │
│  └──────┬──────────────────────────────────────────────────┘  │
│         │ read/write                                          │
│  ┌──────▼──────────────────────────────────────────────────┐  │
│  │         Socket.IO Server (socketHandler.js)             │  │
│  │  Events: ride_request_broadcast, driver_accept,         │  │
│  │          ride_update, join_as_driver, join_as_passenger  │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬────────────────────────────────┘
                               │ Firebase Admin SDK
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                   Firebase Realtime Database                  │
│                                                               │
│   /stops          /drivers        /rideRequests              │
│   /stops/{id}     /drivers/{id}   /rideRequests/{id}         │
└───────────────────────────────────────────────────────────────┘
```

### System Components

**Passenger Module** — Allows passengers to select pickup/destination stops, submit ride requests, and receive real-time notifications when a driver accepts.

**Driver Module** — Allows drivers to register, toggle online/offline, view live incoming requests (via WebSocket broadcast), and accept rides. Seat count decrements automatically on acceptance.

**Matching System** — Core service (`matchingService.js`) that creates ride requests in Firebase, assigns drivers, calculates mock ETAs, and emits Socket.IO events for live synchronization.

**Stop Management System** — Admin-facing service (`stopService.js`) that handles CRUD operations on predefined stops stored in Firebase.

---

## 🗄️ Database Design

### Class & Domain Model
![Class Diagram](./class_diagram.png)

### `/stops/{stopId}`
```json
{
  "id": "uuid",
  "name": "Station Road",
  "description": "Near main railway station",
  "createdAt": 1700000000000
}
```

### `/drivers/{driverId}`
```json
{
  "id": "uuid",
  "name": "Suresh Kumar",
  "vehicleNumber": "JH05-1234",
  "totalSeats": 3,
  "availableSeats": 2,
  "isOnline": true,
  "registeredAt": 1700000000000
}
```

### `/rideRequests/{rideId}`
```json
{
  "id": "uuid",
  "passengerId": "uuid",
  "passengerName": "Ravi",
  "pickupStop": "Station Road",
  "destinationStop": "College Gate",
  "seats": 1,
  "status": "pending | accepted | cancelled | completed",
  "driverId": null,
  "driverName": null,
  "vehicleNumber": null,
  "eta": null,
  "createdAt": 1700000000000,
  "acceptedAt": null
}
```

---

## 🌐 API Documentation

### Stops

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stops` | Get all stops |
| POST | `/api/stops` | Add a new stop |
| DELETE | `/api/stops/:stopId` | Remove a stop |

**POST /api/stops** body:
```json
{ "name": "Station Road", "description": "Near railway station" }
```

---

### Drivers

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/drivers/register` | Register a driver |
| GET | `/api/drivers` | Get all online drivers |
| GET | `/api/drivers/:driverId` | Get driver by ID |
| PUT | `/api/drivers/:driverId/status` | Set online/offline |
| PUT | `/api/drivers/:driverId/seats` | Update available seats |

**POST /api/drivers/register** body:
```json
{ "name": "Suresh", "vehicleNumber": "JH05-1234", "totalSeats": 3 }
```

---

### Ride Requests

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/rides` | Create a ride request |
| GET | `/api/rides/pending` | Get all pending requests |
| GET | `/api/rides/:rideId` | Get single ride by ID |
| PUT | `/api/rides/:rideId/accept` | Driver accepts a ride |
| PUT | `/api/rides/:rideId/cancel` | Cancel a ride |

**POST /api/rides** body:
```json
{
  "passengerId": "uuid",
  "passengerName": "Ravi",
  "pickupStop": "Station Road",
  "destinationStop": "College Gate",
  "seats": 1
}
```

**PUT /api/rides/:rideId/accept** body:
```json
{
  "driverId": "uuid",
  "driverName": "Suresh",
  "vehicleNumber": "JH05-1234"
}
```

---

## 🔌 WebSocket Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join_as_driver` | `{ driverId, driverName }` | Driver joins `drivers` room |
| `join_as_passenger` | `{ passengerId }` | Passenger joins personal room |
| `driver_going_offline` | `{ driverId }` | Driver gracefully leaves |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `connected` | `{ message }` | Sent on successful connection |
| `joined` | `{ role, room }` | Confirms room join |
| `ride_request_broadcast` | Full ride object | Broadcast to all when passenger requests a ride |
| `driver_accept` | `{ rideId, passengerId, driverName, vehicleNumber, eta }` | Broadcast when driver accepts |
| `ride_update` | Partial ride object | General status update (cancel, etc.) |

---

## 📁 Folder Structure

```
rickshaw-matching/
├── backend/
│   ├── config/
│   │   └── firebase.js          # Firebase Admin SDK init
│   ├── controllers/
│   │   ├── rideController.js    # Ride request HTTP handlers
│   │   ├── stopController.js    # Stop CRUD handlers
│   │   └── driverController.js  # Driver management handlers
│   ├── middleware/
│   │   └── errorHandler.js      # Centralized error handling
│   ├── routes/
│   │   ├── rideRoutes.js        # /api/rides (factory w/ io)
│   │   ├── stopRoutes.js        # /api/stops
│   │   └── driverRoutes.js      # /api/drivers
│   ├── services/
│   │   ├── matchingService.js   # Core ride-matching logic
│   │   ├── stopService.js       # Stop CRUD logic
│   │   └── driverService.js     # Driver management logic
│   ├── sockets/
│   │   └── socketHandler.js     # All Socket.IO event handlers
│   ├── tests/
│   │   ├── matchingService.test.js  # Unit tests
│   │   ├── stopController.test.js   # Unit tests
│   │   ├── rideRoutes.test.js       # Integration tests
│   │   └── socket.test.js           # WebSocket integration tests
│   ├── .env.example
│   ├── package.json
│   └── server.js                # Entry point
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── context/
    │   │   └── AppContext.js    # Global state (user, stops)
    │   ├── pages/
    │   │   ├── HomePage.js      # Role selection + login form
    │   │   ├── PassengerPage.js # Ride request + live acceptance
    │   │   ├── DriverPage.js    # Live requests + accept flow
    │   │   └── AdminPage.js     # Stop management UI
    │   ├── services/
    │   │   ├── api.js           # Axios REST wrappers
    │   │   └── socket.js        # Socket.IO singleton + events
    │   ├── App.js               # Router + ProtectedRoute
    │   └── index.css            # Global styles (no framework)
    ├── .env.example
    └── package.json
```

---

## 🧪 Testing

Run all backend tests:
```bash
cd backend
npm test
```

Test files and what they cover:

| File | Type | Coverage |
|---|---|---|
| `matchingService.test.js` | Unit | createRideRequest, acceptRideRequest, cancelRideRequest |
| `stopController.test.js` | Unit | getStops, addStop, removeStop |
| `rideRoutes.test.js` | Integration | All /api/rides endpoints |
| `socket.test.js` | Integration | WebSocket join, broadcast, driver_accept |

---

## 🔐 Environment Variables

### Backend (`backend/.env`)
```
PORT=5000
FRONTEND_URL=https://your-frontend.onrender.com
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=...
FIREBASE_CLIENT_ID=...
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
```

### Frontend (`frontend/.env`)
```
REACT_APP_API_URL=https://your-backend.onrender.com
REACT_APP_SOCKET_URL=https://your-backend.onrender.com
```

---

## 📝 Design Decisions

- **No GPS/Maps** — The system uses named stops (strings) instead of coordinates. This keeps the matching logic simple and deterministic.
- **Firebase Realtime DB** — Chosen for its live-sync capabilities and simple key-value structure that maps directly to the domain model.
- **Socket.IO over plain WebSockets** — Provides rooms, reconnection, and fallback transports out of the box.
- **Singleton Socket** — The frontend uses a single shared socket instance to avoid duplicate connections across components.
- **Factory route pattern** — `rideRoutes.js` exports a factory function that receives the `io` instance, enabling controllers to emit events without importing socket globally.
- **Mock ETA** — ETA is a random value (2–10 min) generated at acceptance time. In production this would be computed from driver location.
