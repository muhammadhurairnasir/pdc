const axios = require("axios");

const API = "http://localhost:3000";

async function performanceTest() {
  console.log("\n============================================");
  console.log("📊 PERFORMANCE TEST: REST vs gRPC");
  console.log("============================================\n");

  // Test 1: Set user language
  console.log("[1/5] Setting user language...");
  await axios.post(`${API}/set-language`, {
    userId: "test-user-1",
    language: "ur"
  });
  console.log("✅ Language set\n");

  // Test 2: Text Message - gRPC
  console.log("[2/5] Testing TEXT MESSAGE via gRPC...");
  const textGRPCResults = [];
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    const res = await axios.post(`${API}/send-text`, {
      userId: "test-user-1",
      text: `Hello from test ${i + 1}`
    });
    textGRPCResults.push(res.data);
    console.log(`  Run ${i + 1}: ${res.data.responseTimeMs}ms, Request: ${res.data.requestPayloadBytes}B, Response: ${res.data.responsePayloadBytes}B`);
  }

  // Test 3: Text Message - REST
  console.log("\n[3/5] Testing TEXT MESSAGE via REST...");
  const textRESTResults = [];
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    const res = await axios.post(`${API}/send-text-rest`, {
      userId: "test-user-1",
      text: `Hello from test ${i + 1}`
    });
    textRESTResults.push(res.data);
    console.log(`  Run ${i + 1}: ${res.data.responseTimeMs}ms, Request: ${res.data.requestPayloadBytes}B, Response: ${res.data.responsePayloadBytes}B`);
  }

  // Test 4: Audio Message - gRPC
  console.log("\n[4/5] Testing AUDIO MESSAGE via gRPC...");
  const audioGRPCResults = [];
  const audioSizes = [1024, 4096, 16384, 65536];
  for (const size of audioSizes) {
    const res = await axios.post(`${API}/send-audio`, {
      audioSize: size
    });
    audioGRPCResults.push(res.data);
    console.log(`  Size ${size}B: ${res.data.responseTimeMs}ms, Request: ${res.data.requestPayloadBytes}B, Response: ${res.data.responsePayloadBytes}B`);
  }

  // Test 5: Audio Message - REST
  console.log("\n[5/5] Testing AUDIO MESSAGE via REST...");
  const audioRESTResults = [];
  for (const size of audioSizes) {
    const res = await axios.post(`${API}/send-audio-rest`, {
      audioSize: size
    });
    audioRESTResults.push(res.data);
    console.log(`  Size ${size}B: ${res.data.responseTimeMs}ms, Request: ${res.data.requestPayloadBytes}B, Response: ${res.data.responsePayloadBytes}B`);
  }

  // SUMMARY ANALYSIS
  console.log("\n============================================");
  console.log("📈 SUMMARY ANALYSIS");
  console.log("============================================\n");

  // Text Analysis
  const avgTextGRPC = textGRPCResults.reduce((a, b) => a + b.responseTimeMs, 0) / textGRPCResults.length;
  const avgTextREST = textRESTResults.reduce((a, b) => a + b.responseTimeMs, 0) / textRESTResults.length;
  const avgReqGRPCText = textGRPCResults[0].requestPayloadBytes;
  const avgReqRESTText = textRESTResults[0].requestPayloadBytes;

  console.log("TEXT MESSAGES:");
  console.log(`  gRPC Average Response Time: ${avgTextGRPC.toFixed(2)}ms`);
  console.log(`  REST Average Response Time: ${avgTextREST.toFixed(2)}ms`);
  console.log(`  gRPC Average Request Payload: ${avgReqGRPCText}B`);
  console.log(`  REST Average Request Payload: ${avgReqRESTText}B`);
  console.log(`  ➜ gRPC is ${Math.abs(avgTextREST - avgTextGRPC).toFixed(2)}ms ${avgTextGRPC < avgTextREST ? "FASTER" : "SLOWER"}`);
  console.log(`  ➜ Payload reduction with gRPC: ${((1 - avgReqGRPCText / avgReqRESTText) * 100).toFixed(2)}%\n`);

  // Audio Analysis
  const avgAudioGRPC = audioGRPCResults.reduce((a, b) => a + b.responseTimeMs, 0) / audioGRPCResults.length;
  const avgAudioREST = audioRESTResults.reduce((a, b) => a + b.responseTimeMs, 0) / audioRESTResults.length;
  const avgReqGRPCAudio = audioGRPCResults[0].requestPayloadBytes;
  const avgReqRESTAudio = audioRESTResults[0].requestPayloadBytes;

  console.log("AUDIO MESSAGES:");
  console.log(`  gRPC Average Response Time: ${avgAudioGRPC.toFixed(2)}ms`);
  console.log(`  REST Average Response Time: ${avgAudioREST.toFixed(2)}ms`);
  console.log(`  gRPC Average Request Payload: ${avgReqGRPCAudio}B (binary)`);
  console.log(`  REST Average Request Payload: ${avgReqRESTAudio}B (base64 encoded)`);
  console.log(`  ➜ gRPC is ${Math.abs(avgAudioREST - avgAudioGRPC).toFixed(2)}ms ${avgAudioGRPC < avgAudioREST ? "FASTER" : "SLOWER"}`);
  console.log(`  ➜ Payload overhead with REST (base64): ${((avgReqRESTAudio - avgReqGRPCAudio) / avgReqGRPCAudio * 100).toFixed(2)}%\n`);

  console.log("KEY INSIGHTS:");
  console.log("  ✓ gRPC uses binary serialization (Protobuf) - more compact");
  console.log("  ✓ REST JSON is text-based - larger payload for same data");
  console.log("  ✓ Base64 encoding adds 33% overhead for binary data over REST");
  console.log("  ✓ gRPC better for frequent small messages (lower latency)");
  console.log("  ✓ gRPC better for large binary data (audio, video)");
  console.log("  ✓ REST simpler for client-facing APIs (human readable)");
  console.log("\n============================================\n");
}

performanceTest().catch(err => {
  console.error("❌ Error during performance test:", err.message);
  process.exit(1);
});
