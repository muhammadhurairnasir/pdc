import React, { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [userId, setUserId] = useState("");
  const [language, setLanguage] = useState("ur");
  const [text, setText] = useState("");
  const [textResponseGRPC, setTextResponseGRPC] = useState(null);
  const [textResponseREST, setTextResponseREST] = useState(null);
  const [audioResponseGRPC, setAudioResponseGRPC] = useState(null);
  const [audioResponseREST, setAudioResponseREST] = useState(null);
  const [audioSize, setAudioSize] = useState(1024);
  const [comparisonData, setComparisonData] = useState([]);

  const API = "http://localhost:3000";

  const setUserLanguage = async () => {
    await axios.post(`${API}/set-language`, {
      userId,
      language
    });
    alert("Language set successfully!");
  };

  const sendTextGRPC = async () => {
    try {
      const res = await axios.post(`${API}/send-text`, {
        userId,
        text
      });
      setTextResponseGRPC(res.data);
      addComparisonData("Text", "gRPC", res.data);
    } catch (err) {
      console.error("gRPC Error:", err);
      alert("gRPC Error: " + err.message);
    }
  };

  const sendTextREST = async () => {
    try {
      const res = await axios.post(`${API}/send-text-rest`, {
        userId,
        text
      });
      setTextResponseREST(res.data);
      addComparisonData("Text", "REST", res.data);
    } catch (err) {
      console.error("REST Error:", err);
      alert("REST Error: " + err.message);
    }
  };

  const sendAudioGRPC = async () => {
    try {
      const res = await axios.post(`${API}/send-audio`, {
        audioSize
      });
      setAudioResponseGRPC(res.data);
      addComparisonData("Audio", "gRPC", res.data);
    } catch (err) {
      console.error("gRPC Audio Error:", err);
      alert("gRPC Audio Error: " + err.message);
    }
  };

  const sendAudioREST = async () => {
    try {
      const res = await axios.post(`${API}/send-audio-rest`, {
        audioSize
      });
      setAudioResponseREST(res.data);
      addComparisonData("Audio", "REST", res.data);
    } catch (err) {
      console.error("REST Audio Error:", err);
      alert("REST Audio Error: " + err.message);
    }
  };

  const addComparisonData = (type, protocol, data) => {
    setComparisonData([...comparisonData, {
      type,
      protocol,
      timestamp: new Date().toLocaleTimeString(),
      responseTime: data.responseTimeMs,
      requestPayload: data.requestPayloadBytes,
      responsePayload: data.responsePayloadBytes
    }]);
  };

  return (
    <div className="container">
      <h2>🌐 Distributed Chat System - REST vs gRPC</h2>

      {/* USER SETUP */}
      <div className="card">
        <label>User ID</label>
        <input
          placeholder="Enter User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />

        <label style={{ marginTop: "10px" }}>Target Language</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="ur">Urdu</option>
          <option value="fr">French</option>
          <option value="de">German</option>
        </select>

        <button onClick={setUserLanguage}>Set Language</button>
      </div>

      {/* TEXT MESSAGE COMPARISON */}
      <div className="card">
        <h3>💬 Text Message - gRPC vs REST</h3>

        <input
          placeholder="Type your message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button onClick={sendTextGRPC} style={{ flex: 1, backgroundColor: "#4CAF50" }}>
            Send via gRPC
          </button>
          <button onClick={sendTextREST} style={{ flex: 1, backgroundColor: "#2196F3" }}>
            Send via REST
          </button>
        </div>

        {textResponseGRPC && (
          <div className="result" style={{ borderLeft: "4px solid #4CAF50" }}>
            <p><b>🔹 gRPC Result:</b></p>
            <p><b>Original:</b> {textResponseGRPC.original}</p>
            <p><b>Translated:</b> {textResponseGRPC.translated}</p>
            <p className="metric">
              ⏱ {textResponseGRPC.responseTimeMs} ms | 📦 Request: {textResponseGRPC.requestPayloadBytes} B | Response: {textResponseGRPC.responsePayloadBytes} B
            </p>
          </div>
        )}

        {textResponseREST && (
          <div className="result" style={{ borderLeft: "4px solid #2196F3" }}>
            <p><b>🔹 REST Result:</b></p>
            <p><b>Original:</b> {textResponseREST.original}</p>
            <p><b>Translated:</b> {textResponseREST.translated}</p>
            <p className="metric">
              ⏱ {textResponseREST.responseTimeMs} ms | 📦 Request: {textResponseREST.requestPayloadBytes} B | Response: {textResponseREST.responsePayloadBytes} B
            </p>
          </div>
        )}

        {textResponseGRPC && textResponseREST && (
          <div className="comparison">
            <p><b>📊 Comparison:</b></p>
            <p>
              gRPC is {((textResponseREST.responseTimeMs - textResponseGRPC.responseTimeMs) / textResponseREST.responseTimeMs * 100).toFixed(2)}% 
              {textResponseGRPC.responseTimeMs < textResponseREST.responseTimeMs ? " faster" : " slower"}
            </p>
            <p>
              Payload difference: gRPC {textResponseGRPC.requestPayloadBytes}B vs REST {textResponseREST.requestPayloadBytes}B
            </p>
          </div>
        )}
      </div>

      {/* AUDIO MESSAGE COMPARISON */}
      <div className="card">
        <h3>🎧 Audio Message - gRPC vs REST</h3>

        <label>Audio Size (bytes)</label>
        <input
          type="number"
          value={audioSize}
          onChange={(e) => setAudioSize(parseInt(e.target.value))}
          placeholder="Enter audio size in bytes"
        />

        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button onClick={sendAudioGRPC} style={{ flex: 1, backgroundColor: "#4CAF50" }}>
            Send Audio (gRPC)
          </button>
          <button onClick={sendAudioREST} style={{ flex: 1, backgroundColor: "#2196F3" }}>
            Send Audio (REST)
          </button>
        </div>

        {audioResponseGRPC && (
          <div className="result" style={{ borderLeft: "4px solid #4CAF50" }}>
            <p><b>🔹 gRPC Result:</b></p>
            <p><b>{audioResponseGRPC.message}</b></p>
            <p className="metric">
              ⏱ {audioResponseGRPC.responseTimeMs} ms | 📦 Request: {audioResponseGRPC.requestPayloadBytes} B | Response: {audioResponseGRPC.responsePayloadBytes} B
            </p>
          </div>
        )}

        {audioResponseREST && (
          <div className="result" style={{ borderLeft: "4px solid #2196F3" }}>
            <p><b>🔹 REST Result:</b></p>
            <p><b>{audioResponseREST.message}</b></p>
            <p className="metric">
              ⏱ {audioResponseREST.responseTimeMs} ms | 📦 Request: {audioResponseREST.requestPayloadBytes} B | Response: {audioResponseREST.responsePayloadBytes} B
            </p>
          </div>
        )}

        {audioResponseGRPC && audioResponseREST && (
          <div className="comparison">
            <p><b>📊 Comparison:</b></p>
            <p>
              gRPC is {((audioResponseREST.responseTimeMs - audioResponseGRPC.responseTimeMs) / audioResponseREST.responseTimeMs * 100).toFixed(2)}% 
              {audioResponseGRPC.responseTimeMs < audioResponseREST.responseTimeMs ? " faster" : " slower"}
            </p>
            <p>
              Payload difference: gRPC {audioResponseGRPC.requestPayloadBytes}B vs REST {audioResponseREST.requestPayloadBytes}B
            </p>
          </div>
        )}
      </div>

      {/* COMPARISON TABLE */}
      {comparisonData.length > 0 && (
        <div className="card">
          <h3>📈 Performance Log</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "10px", textAlign: "left" }}>Type</th>
                <th style={{ padding: "10px", textAlign: "left" }}>Protocol</th>
                <th style={{ padding: "10px", textAlign: "left" }}>Time</th>
                <th style={{ padding: "10px", textAlign: "left" }}>Response (ms)</th>
                <th style={{ padding: "10px", textAlign: "left" }}>Req Size (B)</th>
                <th style={{ padding: "10px", textAlign: "left" }}>Resp Size (B)</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((entry, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>{entry.type}</td>
                  <td style={{ padding: "10px", fontWeight: "bold", color: entry.protocol === "gRPC" ? "#4CAF50" : "#2196F3" }}>
                    {entry.protocol}
                  </td>
                  <td style={{ padding: "10px", fontSize: "0.9em" }}>{entry.timestamp}</td>
                  <td style={{ padding: "10px" }}>{entry.responseTime}</td>
                  <td style={{ padding: "10px" }}>{entry.requestPayload}</td>
                  <td style={{ padding: "10px" }}>{entry.responsePayload}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
