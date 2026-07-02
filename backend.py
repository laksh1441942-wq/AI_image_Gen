import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from huggingface_hub import InferenceClient
from huggingface_hub.inference._providers import get_provider_helper

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
        provider = get_provider_helper(client.provider, task="text-to-image", model=model)
        image_request = provider.prepare_request(
            inputs=data["inputs"],
            parameters={
                "width": parameters["width"],
                "height": parameters["height"],
            },
            headers=client.headers,
            model=model,
            api_key=client.token,
        )
        image = client._inner_post(image_request)
        image = provider.get_response(image, image_request)
    except Exception as error:
        return jsonify(error=str(error)), 502

    return image, 200, {"Content-Type": "image/png"}
