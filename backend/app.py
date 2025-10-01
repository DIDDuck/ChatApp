from flask import Flask, jsonify, request, Response, stream_with_context
import os, config, json
import requests

app = Flask(__name__)


@app.route("/api/chat", methods = ["POST", "OPTIONS"])
def answer():

    user_prompt = ""
    stream = config.stream # default value, gets overwritten with frontend form value
    messages = None
    content_type = request.headers.get('Content-Type')
    if (content_type == 'application/json'):
        user_prompt = request.json["message"]
        stream = request.json["stream"]
        messages = request.json["messages"]
        print("REQUEST:", request.json)
    

    print("USER_PROMPT:", user_prompt)
    print("STREAM:", stream)

    # We wait for the response to be complete
    if stream == False and request.method == "POST":
        if os.getenv("LLM_URL").endswith("generate"):
            api_response = requests.post(os.getenv("LLM_URL"), json = {
                "model": config.model,
                "prompt": user_prompt,
                "stream": False
            })

        if os.getenv("LLM_URL").endswith("chat"):
            api_response = requests.post(os.getenv("LLM_URL"), json = {
                "model": config.model,
                "messages": messages,
                "stream": False
            })

    # We get a streaming response piece by piece
    else:
        if request.method == "POST":
            def generate_stream():
                if os.getenv("LLM_URL").endswith("generate"):
                    api_response = requests.post(os.getenv("LLM_URL"), json = {
                        "model": config.model,
                        "prompt": user_prompt, # Only the latest user message is sent to Ollama /api/generate
                        "stream": True
                    }, stream = True)

                if os.getenv("LLM_URL").endswith("chat"):
                    api_response = requests.post(os.getenv("LLM_URL"), json = {
                        "model": config.model,
                        "messages": messages, # All conversation messages are sent to Ollama /api/chat
                        "stream": True
                    }, stream = True)

                i = 0
                for part_response in api_response.iter_lines():
                    if part_response:
                        i += 1
                        decoded_part = part_response.decode("utf-8")
                        print(f"PART_{i}_UNdecoded:", part_response)
                        print(f"PART_{i}_DECODED:", json.loads(decoded_part))
                        yield decoded_part

            headers = {
                    "Access-Control-Allow-Headers": "Content-Type,Access-Control-Allow-Origin",
                    "Access-Control-Allow-Origin": config.allowed_origin
                } 
            return Response(stream_with_context(generate_stream()), content_type = "text/plain", headers = headers)

    if request.method == "OPTIONS": res = jsonify({}) # dummy payload for OPTIONS message reply

    if os.getenv("LLM_URL").endswith("generate") and request.method == "POST":
        res = jsonify({
        "from": "AI Assistant",
        "text": api_response.json()["response"] # Response from Ollama /api/generate
        })

    if os.getenv("LLM_URL").endswith("chat") and request.method == "POST":
        res = jsonify({
            "from": "AI Assistant",
            "text": api_response.json()["message"]["content"] # Response from Ollama /api/chat
            }) 
    res.headers.add("Access-Control-Allow-Headers", "Content-Type,Access-Control-Allow-Origin")
    res.headers.add("Content-Type", "application/json")
    res.headers.add("Access-Control-Allow-Origin", config.allowed_origin)
    
    return res