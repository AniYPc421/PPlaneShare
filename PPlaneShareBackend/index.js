import http from "node:http";
import express from "express";
import webRouter from "./routes/webRoute.js";
import { WebSocketServer } from "ws";
import { closeHandler, handler } from "./routes/wsRoute.js";
import debugCreator from "./general/debugCreator.js";

const debug = debugCreator("index");

const port = 42100;

const app = express();
app.use(webRouter);

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", function (ws, req) {
  debug(
    "received connection from %s:%s",
    req.socket.remoteAddress,
    req.socket.remotePort
  );
  ws.on("error", console.error);
  ws.on("message", function (m) {
    handler(this, m);
  });
  ws.on("close", function () {
    debug(
      "connection closed from %s:%s",
      req.socket.remoteAddress,
      req.socket.remotePort
    );
    closeHandler(this);
  });
});

server.listen(port);
