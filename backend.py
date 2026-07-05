import os
from io import BytesIO

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file, send_from_directory
from huggingface_hub import InferenceClient

load_dotenv()

app = Flask(__name__, static_folder=".", static_url_path="")


@app.get("/")
def index():
    return send_from_directory(".", "index.html")


@app.post("/api/generate")
def generate_image():
    api_key = os.getenv("API_KEY")
    if not api_key:
        return jsonify(error="API_KEY is missing from .env"), 500

    data = request.get_json()
    model = data["model"]
    parameters = data["parameters"]

    try:
        client = InferenceClient(api_key=api_key, timeout=120)
        image = client.text_to_image(
            data["inputs"],
            model=model,
            width=parameters["width"],
            height=parameters["height"],
        )
        image_bytes = BytesIO()
        image.save(image_bytes, format="PNG")
        image_bytes.seek(0)
    except Exception as error:
        return jsonify(error=str(error)), 502

    return send_file(image_bytes, mimetype="image/png")
