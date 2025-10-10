# ChatApp
This project is a simple web application that allows asking questions from AI Assistant.

App expects you to have an Ollama installation running a LLM. For Ollama details, please check:
https://ollama.com/ and https://github.com/ollama/ollama

App works with Ollama api endpoints: /api/generate and /api/chat.

### Configuration
In local (development) mode you can use Live Preview in VS Code to run frontend and Flask's own development server to run backend.
In production mode Nginx (frontend, proxy for backend) with Waitress (backend, check Flask documentation for more info) seems to work for example.
You can change the mode by setting local in frontend/configuration.js and backend/config.py to true or false.

### .env
Set your Ollama api endpoint url in backend folder .env file as LLM_API.
Also, in production mode set your frontend url in backend folder .env file as PRODUCTION_FRONTEND. 