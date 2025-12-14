
const express = require("express");
const app = express();

app.get("/user/:id", (req, res) => {
  const start = Date.now();

  const user = {
    id: req.params.id,
    name: "Ali",
    email: "ali@test.com"
  };

  const latency = Date.now() - start;
  const payload = Buffer.byteLength(JSON.stringify(user));

  res.set("X-Response-Time", latency + "ms");
  res.set("X-Payload-Size", payload + "bytes");

  res.json(user);
});

app.listen(3000, () => console.log("REST API running on port 3000"));
