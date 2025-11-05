import { io } from "socket.io-client";

let socket = null;

const initializeSocket = (URL, accessToken) => {
  console.log("Initializing socket with:", URL);
  if (!socket) {
    socket = io(URL, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { token: accessToken },
    });
  }
  return socket;
};

export default initializeSocket;
