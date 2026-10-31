import os
import time
from gradio_client import Client

space_id = os.getenv("WAN_SPACE_ID", "Wan-AI/Wan2.1")
print(f"Connecting to client for Space: {space_id}...")
client = Client(space_id)

prompt = "A red flower blooming, macro, soft sunlight"
print(f"Sending test prompt: '{prompt}' to /t2v_generation_async ...")

try:
    res = client.predict(
        prompt=prompt,
        size="832*1088",  # lighter resolution
        watermark_wan=False,
        seed=42,
        api_name="/t2v_generation_async"
    )
    print("Async generation response:", res)
    cost_time, est_wait = res
    print(f"Cost time: {cost_time}, Estimated wait: {est_wait}s")

    print("\nPolling /status_refresh (up to 3 checks)...")
    for i in range(3):
        time.sleep(3)
        status = client.predict(api_name="/status_refresh")
        video_data, cost, wait_time, progress = status
        print(f"Poll {i+1}: progress={progress}%, est_wait={wait_time}s, video={bool(video_data)}")
        if isinstance(video_data, dict) and video_data.get("value"):
            print("Video ready!", video_data["value"])
            break
        elif isinstance(video_data, str) and video_data:
            print("Video ready (path/url)!", video_data)
            break

except Exception as e:
    print(f"Error during test: {e}")
