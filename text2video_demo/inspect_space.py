import os
from gradio_client import Client

space_id = os.getenv("WAN_SPACE_ID", "Wan-AI/Wan2.1")
print(f"Connecting to Hugging Face Space: {space_id} ...")

try:
    client = Client(space_id)
    print("\n--- Space API Endpoints ---")
    api_info = client.view_api(return_format="dict")
    print("Endpoints found:", list(api_info.get("named_endpoints", {}).keys()), list(api_info.get("unnamed_endpoints", {}).keys()))
    
    import json
    with open("api_spec.json", "w") as f:
        json.dump(api_info, f, indent=2)
    print("\nFull API written to api_spec.json")
except Exception as e:
    print(f"Error connecting to Space: {e}")
