const API_URL = "http://localhost:5000/predict";

// Screen elements
const homeScreen = document.getElementById("homeScreen");
const uploadScreen = document.getElementById("uploadScreen");
const resultsScreen = document.getElementById("resultsScreen");

// Buttons
const startBtn = document.getElementById("startBtn");
const backBtn = document.getElementById("backBtn");
const predictBtn = document.getElementById("predictBtn");
const analyzeAnotherBtn = document.getElementById("analyzeAnotherBtn");

// File input and preview
const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const imagePreview = document.getElementById("imagePreview");
const previewGrid = document.getElementById("previewGrid");
const loading = document.getElementById("loading");

// Results
const predictionResult = document.getElementById("predictionResult");
const serialTimeEl = document.getElementById("serialTime");
const parallelTimeEl = document.getElementById("parallelTime");

let selectedFiles = []; // { file, preview }

// Screen navigation functions
function showScreen(screen) {
  homeScreen.classList.remove("active");
  uploadScreen.classList.remove("active");
  resultsScreen.classList.remove("active");
  screen.classList.add("active");
}

// Event Listeners
startBtn.addEventListener("click", () => {
  showScreen(uploadScreen);
});

backBtn.addEventListener("click", () => {
  showScreen(homeScreen);
  resetUploadScreen();
});

analyzeAnotherBtn.addEventListener("click", () => {
  showScreen(uploadScreen);
  resetResultsScreen();
  resetUploadScreen();
});

// File input handling
fileInput.addEventListener("change", (e) => {
  handleFiles(Array.from(e.target.files));
});

// Drag and drop
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
  handleFiles(files);
});

uploadArea.addEventListener("click", () => {
  fileInput.click();
});

function handleFiles(files) {
  if (!files || files.length === 0) return;

  const validImages = files.filter(f => f.type.startsWith("image/"));
  if (validImages.length === 0) {
    alert("Please select valid image files.");
    return;
  }

  // Append to existing selection with previews, cap at 10
  const combined = [...selectedFiles];

  validImages.forEach((file) => {
    combined.push({ file, preview: null });
  });

  if (combined.length > 100) {
    alert("You can upload up to 10 images total.");
    combined.splice(100);
  }

  Promise.all(
    combined.map((item) => {
      if (item.preview) return Promise.resolve(item.preview);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          item.preview = e.target.result;
          resolve(item.preview);
        };
        reader.readAsDataURL(item.file);
      });
    })
  ).then(() => {
    selectedFiles = combined;
    renderPreview(selectedFiles);
    predictBtn.disabled = false;
    // Clear input so re-selecting same files still fires change
    fileInput.value = "";
  });
}

function renderPreview(files) {
  previewGrid.innerHTML = "";
  files.forEach((item) => {
    const col = document.createElement("div");
    col.className = "col-6 col-md-4";
    const img = document.createElement("img");
    img.className = "preview-thumb";
    img.src = item.preview;
    col.appendChild(img);
    previewGrid.appendChild(col);
  });
  imagePreview.classList.remove("d-none");
}

// Reset functions
function resetUploadScreen() {
  fileInput.value = "";
  selectedFiles = [];
  imagePreview.classList.add("d-none");
  previewGrid.innerHTML = "";
  predictBtn.disabled = true;
  loading.classList.add("d-none");
}

function resetResultsScreen() {
  predictionResult.innerHTML = "";
  serialTimeEl.textContent = "--";
  parallelTimeEl.textContent = "--";
}

// Predict function (serial and parallel)
predictBtn.addEventListener("click", async () => {
  if (!selectedFiles.length) {
    alert("Please select image files first.");
    return;
  }

  loading.classList.remove("d-none");
  predictBtn.disabled = true;

  try {
    const { serialResults, serialTime } = await runSerial(selectedFiles);
    const { parallelResults, parallelTime } = await runParallel(selectedFiles);

    serialTimeEl.textContent = `${serialTime.toFixed(2)} ms`;
    parallelTimeEl.textContent = `${parallelTime.toFixed(2)} ms`;

    displayResults(serialResults, parallelResults);
    showScreen(resultsScreen);
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to analyze images. Please try again.");
  } finally {
    loading.classList.add("d-none");
    predictBtn.disabled = false;
  }
});

// Serial processing
async function runSerial(files) {
  const results = [];
  const start = performance.now();
  for (const item of files) {
    const res = await predictSingle(item);
    results.push(res);
  }
  const end = performance.now();
  return { serialResults: results, serialTime: end - start };
}

// Parallel processing
async function runParallel(files) {
  const start = performance.now();
  const results = await Promise.all(files.map((item) => predictSingle(item)));
  const end = performance.now();
  return { parallelResults: results, parallelTime: end - start };
}

async function predictSingle(item) {
  const file = item.file;
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      return { fileName: file.name, prediction: null, error: "Prediction failed" };
    }

    const data = await response.json();
    const prediction =
      data.predictions && data.predictions.length ? data.predictions[0] : null;
    return {
      fileName: file.name,
      preview: item.preview,
      prediction,
      error: null
    };
  } catch (err) {
    return { fileName: file.name, prediction: null, error: err.message || "Network error" };
  }
}

// Display results (top 1 per image for both serial and parallel)
function displayResults(serialResults, parallelResults) {
  const buildList = (title, results) => {
    const items = results.map((res, idx) => {
      if (!res.prediction || res.error) {
        return `<div class="result-item">
          <div class="disease">No prediction</div>
          <div class="plant">File: ${res.fileName}</div>
          <div class="text-danger small">${res.error || "No prediction returned"}</div>
        </div>`;
      }
      const plantName = res.prediction.plant || `Class ${res.prediction.index}`;
      const diseaseName = res.prediction.disease || "Unknown";
      return `<div class="result-item">
        <div class="disease">${diseaseName}</div>
        <div class="plant">Plant: ${plantName}</div>
        <div class="text-muted small">File: ${res.fileName}</div>
      </div>`;
    }).join("");

    return `<div class="mb-4">
      <h4 class="mb-3">${title}</h4>
      ${items}
    </div>`;
  };

  predictionResult.innerHTML = `
    ${buildList("Serial Results", serialResults)}
    ${buildList("Parallel Results", parallelResults)}
  `;

  // Group by plant (using parallel results as final outcomes)
  const categories = {};
  parallelResults.forEach((res) => {
    const pred = res.prediction;
    const plantName = pred && pred.plant ? pred.plant : "Unknown Plant";
    if (!categories[plantName]) categories[plantName] = [];
    categories[plantName].push({
      disease: pred ? pred.disease || "Unknown" : "No prediction",
      fileName: res.fileName,
      preview: res.preview || "",
      error: res.error || null
    });
  });

  const categoryHtml = Object.entries(categories)
    .map(([plant, items]) => {
      const cards = items
        .map((it) => {
          return `
            <div class="col-md-4 col-sm-6 mb-3">
              <div class="card h-100 shadow-sm">
                ${it.preview ? `<img src="${it.preview}" class="card-img-top" alt="${it.fileName}">` : ""}
                <div class="card-body">
                  <h6 class="card-title">${plant}</h6>
                  <p class="card-text mb-1"><strong>${it.disease}</strong></p>
                  <p class="card-text text-muted small mb-0">File: ${it.fileName}</p>
                  ${it.error ? `<p class="text-danger small mt-1">${it.error}</p>` : ""}
                </div>
              </div>
            </div>
          `;
        })
        .join("");
      return `
        <div class="mb-4">
          <h4 class="mb-3">${plant}</h4>
          <div class="row g-3">
            ${cards}
          </div>
        </div>
      `;
    })
    .join("");

  predictionResult.innerHTML += `
    <div class="mt-4">
      <h3 class="mb-3">By Plant Category</h3>
      ${categoryHtml || "<p>No predictions available.</p>"}
    </div>
  `;
}
