
const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const app = express();
const packageDef = protoLoader.loadSync("../proto/user.proto");
const proto = grpc.loadPackageDefinition(packageDef);

const client = new proto.UserService(
  "localhost:50051",
  grpc.credentials.createInsecure()
);

app.get("/user/:id", (req, res) => {
  const start = Date.now();
  client.GetUser({ id: req.params.id }, (err, response) => {
    const latency = Date.now() - start;
    res.json({ response, internalLatency: latency });
  });
});

app.listen(6000, () => console.log("Service B running on port 6000"));
