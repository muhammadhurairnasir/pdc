const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const protoDef = protoLoader.loadSync("translation.proto");
const grpcObj = grpc.loadPackageDefinition(protoDef);
const translationPkg = grpcObj.translation;

function translateText(call, callback) {
  const { text, targetLanguage } = call.request;

  const map = {
    ur: `URDU: ${text}`,
    fr: `FRENCH: ${text}`,
    de: `GERMAN: ${text}`
  };

  callback(null, {
    translatedText: map[targetLanguage] || text
  });
}

const server = new grpc.Server();
server.addService(
  translationPkg.TranslationService.service,
  { TranslateText: translateText }
);

server.bindAsync(
  "0.0.0.0:50051",
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log("Translation Service running at 50051");
    server.start();
  }
);
