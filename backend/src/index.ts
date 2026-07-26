import "dotenv/config";
import http from "http";
import app from "./app.js";
import { initSocketServer } from "../lib/socket.js";

const PORT = process.env.BACKEND_PORT || 3000;

const server = http.createServer(app);
initSocketServer(server);

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api/docs`);
  console.log(`Socket.IO ready`);
});
