from flask import Flask, jsonify, request, Response, stream_with_context
import os, config, json
import requests

app = Flask(__name__)


@app.route("/", methods = ["GET", "POST", "OPTIONS"])
def answer():

    user_prompt = ""
    content_type = request.headers.get('Content-Type')
    if (content_type == 'application/json'):
        user_prompt = request.json["question"]

    print("USER_PROMPT:", user_prompt)

    # We wait for the response to be complete
    if config.stream == False:
        api_response = requests.post(os.getenv("LLM_URL"), json = {
            "model": config.model,
            "prompt": user_prompt,
            "stream": config.stream
        })

    # We get a streaming response piece by piece
    else:
        def generate_stream():
            api_response = requests.post(os.getenv("LLM_URL"), json = {
                "model": config.model,
                "prompt": user_prompt,
                "stream": config.stream
            }, stream = True)

            i = 0
            for part_response in api_response.iter_lines():
                if part_response:
                    #print(f"PART_{i}:", part_response.json()["response"])
                    i += 1
                    decoded_part = part_response.decode("utf-8")
                    print(f"PART_{i}:", json.loads(decoded_part))

                    yield json.dumps(json.loads(decoded_part))# + "\n"

        headers = {
                "Access-Control-Allow-Headers": "Content-Type,Access-Control-Allow-Origin",
                "Access-Control-Allow-Origin": config.allowed_origin
            } 
        return Response(stream_with_context(generate_stream()), content_type = "text/plain", headers = headers)


    """
    res = jsonify({
        "from": "AI Assistant",
        "text": api_response.json()["response"]
        })
    """

    res = jsonify({
        "from": "AI Assistant",
        "text": "Placeholder response..."
        })    
    res.headers.add("Access-Control-Allow-Headers", "Content-Type,Access-Control-Allow-Origin")
    res.headers.add("Content-Type", "application/json")
    res.headers.add("Access-Control-Allow-Origin", config.allowed_origin)
    
    return res