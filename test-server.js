#!/usr/bin/env node

// This is a test script to run the server with environment variables
// It loads the environment variables from .env.example and runs the server

import { readFileSync } from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the .env.example file
const envFile = readFileSync(join(__dirname, ".env.example"), "utf8");

// Parse the environment variables
const env = {};
envFile.split("\n").forEach((line) => {
  // Skip comments and empty lines
  if (line.startsWith("#") || !line.trim()) return;

  const [key, value] = line.split("=");
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

console.log("Starting server with environment variables:");
console.log(env);

// Run the server with the environment variables
const server = spawn("node", ["build/index.js"], {
  env: { ...process.env, ...env },
  stdio: "inherit",
});

server.on("close", (code) => {
  console.log(`Server exited with code ${code}`);
});

// Handle Ctrl+C to gracefully shut down the server
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  server.kill("SIGINT");
});
