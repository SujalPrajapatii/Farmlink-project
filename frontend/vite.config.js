import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const backendDirectory = resolve(currentDirectory, "../backend");

function backendIsRunning() {
  return new Promise((resolvePort) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: 5000 });
    const done = (running) => {
      socket.destroy();
      resolvePort(running);
    };

    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.setTimeout(500, () => done(false));
  });
}

// Starting `npm run dev` in the frontend now also starts the API if it is not
// already running. This prevents login from failing when only Vite was started.
function startFarmLinkBackend() {
  let backendProcess;

  return {
    name: "start-farmlink-backend",
    configureServer(server) {
      server.httpServer?.once("listening", async () => {
        if (await backendIsRunning()) return;

        backendProcess = spawn(process.execPath, ["server.js"], {
          cwd: backendDirectory,
          stdio: "inherit",
        });

        backendProcess.once("error", (error) => {
          console.error("Could not start the FarmLink backend:", error.message);
        });
      });

      server.httpServer?.once("close", () => backendProcess?.kill());
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), startFarmLinkBackend()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:5000",
      "/uploads": "http://127.0.0.1:5000",
    },
  },
});
