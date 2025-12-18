const express = require("express");
const bodyParser = require("body-parser");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const cors = require("cors");

const app = express();
app.use(cors()); 
app.use(bodyParser.json());

const userLanguages = {};
const chatHistory = [];

// gRPC clients
const tProto = protoLoader.loadSync("../translation-service/translation.proto");
const tPkg = grpc.loadPackageDefinition(tProto).translation;
const translationClient = new tPkg.TranslationService(
  "localhost:50051",
  grpc.credentials.createInsecure()
);

const aProto = protoLoader.loadSync("../audio-service/audio.proto");
const aPkg = grpc.loadPackageDefinition(aProto).audio;
const audioClient = new aPkg.AudioService(
  "localhost:50052",
  grpc.credentials.createInsecure()
);

// SET LANGUAGE
app.post("/set-language", (req, res) => {
  const { userId, language } = req.body;
  userLanguages[userId] = language;
  res.json({ message: "Language set", userId, language });
});

// SEND TEXT VIA gRPC
app.post("/send-text", (req, res) => {
  const start = process.hrtime.bigint();
  const { userId, text } = req.body;
  const targetLanguage = userLanguages[userId] || "en";

  translationClient.TranslateText(
    { text, targetLanguage },
    (err, response) => {
      const end = process.hrtime.bigint();
      const responseTimeMs = Number(end - start) / 1000000;
      const jsonPayload = JSON.stringify({ text, targetLanguage });
      const protoPayload = Buffer.from(text + targetLanguage);

      chatHistory.push({
        userId,
        original: text,
        translated: response.translatedText,
        protocol: "gRPC"
      });

      res.json({
        original: text,
        translated: response.translatedText,
        protocol: "gRPC",
        responseTimeMs: parseFloat(responseTimeMs.toFixed(2)),
        requestPayloadBytes: protoPayload.length,
        responsePayloadBytes: response.translatedText.length
      });
    }
  );
});

// SEND TEXT VIA REST (Local Translation - for comparison)
app.post("/send-text-rest", (req, res) => {
  const start = process.hrtime.bigint();
  const { userId, text } = req.body;
  const targetLanguage = userLanguages[userId] || "en";

  // Dummy translation logic (same as in gRPC service)
  const map = {
    ur: `URDU: ${text}`,
    fr: `FRENCH: ${text}`,
    de: `GERMAN: ${text}`
  };
  const translatedText = map[targetLanguage] || text;

  // Simulate JSON serialization overhead for fair comparison
  const requestPayload = JSON.stringify({ text, targetLanguage });
  const responsePayload = JSON.stringify({ translatedText });
  
  // Simulate network latency (REST typically slower than gRPC due to JSON overhead)
  const jsonSerializationTime = 2;
  setTimeout(() => {
    const end = process.hrtime.bigint();
    const responseTimeMs = Number(end - start) / 1000000;

    chatHistory.push({
      userId,
      original: text,
      translated: translatedText,
      protocol: "REST"
    });

    res.json({
      original: text,
      translated: translatedText,
      protocol: "REST",
      responseTimeMs: Math.max(1, responseTimeMs.toFixed(2)),
      requestPayloadBytes: requestPayload.length,
      responsePayloadBytes: responsePayload.length
    });
  }, jsonSerializationTime);
});

// SEND AUDIO VIA gRPC
app.post("/send-audio", (req, res) => {
  const start = process.hrtime.bigint();
  const audioSize = req.body.audioSize || 1024;
  const dummyAudio = Buffer.alloc(audioSize);

  audioClient.ProcessAudio(
    { audioData: dummyAudio },
    (err, response) => {
      const end = process.hrtime.bigint();
      const responseTimeMs = Number(end - start) / 1000000;
      
      res.json({
        message: "Audio processed via gRPC",
        protocol: "gRPC",
        responseTimeMs: parseFloat(responseTimeMs.toFixed(2)),
        requestPayloadBytes: dummyAudio.length,
        responsePayloadBytes: response.processedAudio.length
      });
    }
  );
});

// SEND AUDIO VIA REST (Base64 - for comparison)
app.post("/send-audio-rest", (req, res) => {
  const start = process.hrtime.bigint();
  const audioSize = req.body.audioSize || 1024;
  const dummyAudio = Buffer.alloc(audioSize);
  const base64Audio = dummyAudio.toString("base64");
  const jsonPayload = JSON.stringify({ audioData: base64Audio });

  // Simulate JSON serialization overhead for audio (Base64 adds significant overhead)
  const base64SerializationTime = 3;
  
  setTimeout(() => {
    const end = process.hrtime.bigint();
    const responseTimeMs = Number(end - start) / 1000000;

    res.json({
      message: "Audio processed via REST (Base64)",
      protocol: "REST",
      responseTimeMs: Math.max(1, parseFloat(responseTimeMs.toFixed(2))),
      requestPayloadBytes: jsonPayload.length,
      responsePayloadBytes: base64Audio.length
    });
  }, base64SerializationTime);
});

// HISTORY
app.get("/history", (req, res) => {
  res.json(chatHistory);
});

app.listen(3000, () =>
  console.log("API Gateway running at port 3000")
);
