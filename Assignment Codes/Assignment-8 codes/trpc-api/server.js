
const express = require("express");
const { createExpressMiddleware } = require("@trpc/server/adapters/express");
const { appRouter } = require("./router");

const app = express();
app.use("/trpc", createExpressMiddleware({ router: appRouter }));

app.listen(4000, () => console.log("tRPC server running on port 4000"));
