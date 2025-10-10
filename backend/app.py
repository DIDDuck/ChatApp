from flask import Flask, jsonify, request, Response, stream_with_context
import os, config, json
import requests

app = Flask(__name__)


@app.route("/chat", methods = ["POST", "OPTIONS"])
def answer():

    user_prompt = ""
    stream = config.stream # default value, gets overwritten with frontend form value
    messages = None
    content_type = request.headers.get('Content-Type')

    if (content_type == 'application/json'):
        user_prompt = request.json["message"]
        stream = request.json["stream"]
        messages = request.json["messages"]
        message_to_frontend = "Failed to get an answer from AI."
        print("REQUEST:", request.json)
    
    print("USER_PROMPT:", user_prompt)
    print("STREAM:", stream)

    # We get a streaming response piece by piece
    if stream == True and request.method == "POST":
        if request.method == "POST":
            def generate_stream():
                try:
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
                except:
                    # For example, if Ollama api is not running, we end up here.
                    print("Something failed")
                    res_dict = {
                        "error": True,
                        "message": message_to_frontend
                    }
                    yield json.dumps(res_dict)
                    return 

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

    # We wait for the response to be complete
    if stream == False and request.method == "POST":
        try:
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
        except:
            print("Something failed")
            res = jsonify({
                "error": True,
                "message": message_to_frontend
            })
            res.headers.add("Access-Control-Allow-Headers", "Content-Type,Access-Control-Allow-Origin")
            res.headers.add("Content-Type", "application/json")
            res.headers.add("Access-Control-Allow-Origin", config.allowed_origin)

            return res

        
    if request.method == "OPTIONS": res = jsonify({}) # dummy payload for OPTIONS message reply

    if os.getenv("LLM_URL").endswith("generate") and request.method == "POST": # Response from Ollama /api/generate
        if "error" in api_response.json():
            res = jsonify({
                "error": True,
                "message": message_to_frontend 
            })    
        else:
            res = jsonify({
                "from": "AI Assistant",
                "text": api_response.json()["response"] 
            })

    if os.getenv("LLM_URL").endswith("chat") and request.method == "POST": # Response from Ollama /api/chat
        if "error" in api_response.json():
            res = jsonify({
                "error": True,
                "message": message_to_frontend 
            })
        else:    
            res = jsonify({
                "from": "AI Assistant",
                "text": api_response.json()["message"]["content"] 
                }) 
    res.headers.add("Access-Control-Allow-Headers", "Content-Type,Access-Control-Allow-Origin")
    res.headers.add("Content-Type", "application/json")
    res.headers.add("Access-Control-Allow-Origin", config.allowed_origin)
    
    return res