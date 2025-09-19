from flask import Flask, jsonify, request
import config

app = Flask(__name__)


@app.route("/", methods = ["GET", "POST", "OPTIONS"])
def answer():
    res = jsonify({
        "from": "AI Assistant",
        "text": "An example reply from AI assistant"
        })
    res.headers.add("Access-Control-Allow-Headers", "Content-Type,Access-Control-Allow-Origin")
    res.headers.add("Content-Type", "application/json")
    res.headers.add("Access-Control-Allow-Origin", config.allowed_origin)
    return res