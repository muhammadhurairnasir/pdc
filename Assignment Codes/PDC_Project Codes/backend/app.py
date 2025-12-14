from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import json
import os

app = Flask(__name__)
# Allow CORS for all domains (simplify for development)
CORS(app)

# Global variables
model = None
labels_map = None

def load_model_resources():
    global model, labels_map
    
    # 1. Load Model
    print("Loading Keras model...")
    # Ensure this path matches where you put the file on your server
    model_path = os.path.join("..", "model", "best_model.keras") 
    try:
        model = tf.keras.models.load_model(model_path)
        print("Model loaded successfully")
    except Exception as e:
        print(f"CRITICAL ERROR: Could not load model at {model_path}. Details: {e}")

    # 2. Load Labels
    labels_path = os.path.join(os.path.dirname(__file__), "labels.json")
    try:
        with open(labels_path, "r") as f:
            data = json.load(f)
            # Create a dictionary for O(1) lookups: int(index) -> label_data
            labels_map = {int(item["index"]): item for item in data}
        print(f"Loaded {len(labels_map)} labels from json.")
    except Exception as e:
        print(f"CRITICAL ERROR: Could not load labels.json. Details: {e}")

# Load resources immediately on startup
load_model_resources()

def preprocess_image(image_bytes):
    """
    Prepares an image for the model.
    CRITICAL: Must match training preprocessing exactly.
    """
    # 1. Open image
    img = Image.open(io.BytesIO(image_bytes))
    
    # 2. Ensure RGB (removes Alpha channel if PNG, converts Grayscale if B&W)
    if img.mode != "RGB":
        img = img.convert("RGB")
    
    # 3. Resize to model input size (224x224)
    img = img.resize((224, 224))
    
    # 4. Convert to Array
    img_array = np.array(img)
    
    # 5. Normalize (0-255 -> 0-1)
    # THIS WAS THE KEY FIX: Training used / 255.0, so this must match.
    img_array = img_array.astype('float32') / 255.0
    
    # 6. Add Batch Dimension (224, 224, 3) -> (1, 224, 224, 3)
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array

@app.route("/predict", methods=["POST"])
def predict():
    if not model or not labels_map:
        return jsonify({"error": "Model or Labels not loaded properly on server."}), 500

    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file uploaded"}), 400

    try:
        # Read and Preprocess
        buffer = file.read()
        tensor = preprocess_image(buffer)

        # Predict
        # verbose=0 prevents cluttering server logs
        raw_predictions = model.predict(tensor, verbose=0)[0] 

        # Convert to standard python list
        probs = raw_predictions.tolist()

        # Organize results
        results = []
        for idx, probability in enumerate(probs):
            # Get label info, default to "Unknown" if index missing
            label_info = labels_map.get(idx, {"plant": "Unknown", "disease": "Unknown"})
            
            results.append({
                "index": idx,
                "probability": float(probability), # ensure float for JSON serialization
                "plant": label_info.get("plant"),
                "disease": label_info.get("disease"),
                "healthy": label_info.get("healthy", False)
            })

        # Sort by probability (Highest first) and take Top 3
        top_3 = sorted(results, key=lambda x: x["probability"], reverse=True)[:3]

        return jsonify({
            "predictions": top_3
        })

    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({"error": "Internal processing error", "details": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)