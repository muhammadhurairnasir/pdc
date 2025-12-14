
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const packageDef = protoLoader.loadSync("../proto/user.proto");
const proto = grpc.loadPackageDefinition(packageDef);

function GetUser(call, callback) {
  callback(null, { id: call.request.id, name: "Ali", email: "ali@test.com" });
}

const server = new grpc.Server();
server.addService(proto.UserService.service, { GetUser });

server.bindAsync("0.0.0.0:50051",
  grpc.ServerCredentials.createInsecure(),
  () => server.start()
);
