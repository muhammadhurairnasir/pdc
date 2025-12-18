from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from PIL import Image
import io
import requests

app = Flask(__name__)
CORS(app)

INFERENCE_URL = "http://127.0.0.1:5001/predict"             #set the url where machine B is hosted

def preprocess_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes))

    if img.mode != "RGB":
        img = img.convert("RGB")

    img = img.resize((224, 224))
    img_array = np.array(img).astype("float32") / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    return img_array

@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    image_bytes = file.read()

    tensor = preprocess_image(image_bytes)

    # Send tensor to Machine B
    buffer = io.BytesIO()
    np.save(buffer, tensor)
    buffer.seek(0)

    response = requests.post(
        INFERENCE_URL,
        files={"tensor": ("tensor.npy", buffer, "application/octet-stream")}
    )

    return jsonify(response.json())


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
