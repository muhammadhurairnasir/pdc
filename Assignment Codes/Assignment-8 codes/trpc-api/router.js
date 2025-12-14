
const { initTRPC } = require("@trpc/server");
const t = initTRPC.create();

exports.appRouter = t.router({
  getUser: t.procedure.query(() => {
    return { id: "1", name: "Ali", email: "ali@test.com" };
  })
});
