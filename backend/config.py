import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

local = True
production = os.getenv("PRODUCTION_FRONTEND")

allowed_origin = "http://127.0.0.1:3000" if local else production

#model = "llama3.2"
model = "gemma3:4b"
stream = False