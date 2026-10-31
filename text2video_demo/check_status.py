import os
import json
from gradio_client import Client

space_id = os.getenv("WAN_SPACE_ID", "Wan-AI/Wan2.1")
client = Client(space_id)

print("\n--- Inspecting current state via /status_refresh ---")
status = client.predict(api_name="/status_refresh")
print("Status Refresh:", json.dumps(status, indent=2, default=str))

print("\n--- Inspecting /online_process_change ---")
try:
    opc = client.predict(api_name="/online_process_change")
    print("online_process_change:", json.dumps(opc, indent=2, default=str))
except Exception as e:
    print("Error on /online_process_change:", e)
