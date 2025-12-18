const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const protoDef = protoLoader.loadSync("audio.proto");
const grpcObj = grpc.loadPackageDefinition(protoDef);
const audioPkg = grpcObj.audio;

function processAudio(call, callback) {
  callback(null, {
    processedAudio: call.request.audioData
  });
}

const server = new grpc.Server();
server.addService(
  audioPkg.AudioService.service,
  { ProcessAudio: processAudio }
);

server.bindAsync(
  "0.0.0.0:50052",
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log("Audio Service running at 50052");
    server.start();
  }
);
