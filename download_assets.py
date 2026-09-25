import urllib.request
import os
import sys

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def download_file(url, dest):
    print(f"Downloading {url} to {dest}...")
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
        with open(dest, 'wb') as f:
            f.write(data)
    print(f"Saved {dest}, size = {os.path.getsize(dest)} bytes")

os.makedirs('public/images', exist_ok=True)
os.makedirs('artifacts', exist_ok=True)

# 1. Download Couple Image
couple_url = "https://lh3.googleusercontent.com/aida-public/AB6AXuAQdTTrXDga8V3jHyDYUji8Y_FHJShHdxpWNW_5j7eXO5wIliZ9HuSTMJ69EuoxjnG2WmKClVg-SCNEXjAimj9HklZBhpkdYZOHYWleQWmxtGHSJYwxisE6bVe5yNwk8vcxrqHT8irW0GtA4TBiFuRCcux2FyZG0y0GstYohsnlqpqc97WbJW_Zq0N4DEq0-y44CQ183RzgXsqvyMpc0qQXqVQaPK1m-61vQ1yzDaehaZ9JyWlcCM1M"
download_file(couple_url, 'public/images/our-story-couple.webp')

# 2. Download Screenshot
screenshot_url = "https://lh3.googleusercontent.com/aida/AEtjO1XJovgBiPW2KXwL4tVZbG38_N6VeCyusBxlrfoviycSO1g1LpLZ1uSm7HWrIZbGMk8jzZXuYm9Vs4p7sJSrf_bPn7_di5-7ki9tLm6GLO0IB1v3OD8vxr6_CToneTkT4IMmcveV5yr52s43zIhVTccJYGePmudAoygBVJDVCpfK5DNwh2znJBLKyFdEk2wXToVCnSG7_BnwGEXjicYvYS0K-RsIvkaRpNljTIedLah543ThCR2QK3AyBQ8"
download_file(screenshot_url, 'artifacts/stitch_our_story_screenshot.png')

print("All downloads complete successfully!")
