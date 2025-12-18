from flask import Flask, request, jsonify
import tensorflow as tf
import numpy as np
import json
import os
import io

app = Flask(__name__)

model = None
labels_map = None

def load_model_resources():
    global model, labels_map

    print("Loading Keras model...")
    model_path = os.path.join("..", "model", "best_model.keras")

    model = tf.keras.models.load_model(model_path)
    print("Model loaded successfully")

    labels_path = os.path.join(os.path.dirname(__file__), "labels.json")
    with open(labels_path, "r") as f:
        data = json.load(f)
        labels_map = {int(item["index"]): item for item in data}

    print(f"Loaded {len(labels_map)} labels")

load_model_resources()

@app.route("/predict", methods=["POST"])
def predict():
    """
    Receives a preprocessed tensor (numpy .npy file)
    """
    if "tensor" not in request.files:
        return jsonify({"error": "No tensor provided"}), 400

    try:
        raw = request.files["tensor"].read()
        tensor = np.load(io.BytesIO(raw))  # shape (1,224,224,3)

        predictions = model.predict(tensor, verbose=0)[0]
        probs = predictions.tolist()

        results = []
        for idx, probability in enumerate(probs):
            label_info = labels_map.get(idx, {})
            results.append({
                "index": idx,
                "probability": float(probability),
                "plant": label_info.get("plant"),
                "disease": label_info.get("disease"),
                "healthy": label_info.get("healthy", False)
            })

        top_3 = sorted(results, key=lambda x: x["probability"], reverse=True)[:3]

        return jsonify({"predictions": top_3})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
