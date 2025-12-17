import os
import json
import uuid
import re
import requests
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from youtube_transcript_api import YouTubeTranscriptApi
import google.generativeai as genai

# ================== FLASK APP ==================
app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = "lecturemind-secret"

# ================== GEMINI CONFIG ==================
# (Working version – later env variable bana lena)
genai.configure(api_key="AIzaSyCA9e2DShSwCl0O1DoPd28RD0N9RNoP6Jg")

model = genai.GenerativeModel("models/gemini-flash-latest")

# ================== TEMP STORAGE ==================
lecture_cache = {}

# ================== YOUTUBE ID ==================
def extract_video_id(url):
    regex = r"(?:v=|\/)([0-9A-Za-z_-]{11})"
    match = re.search(regex, url)
    return match.group(1) if match else None

# ================== VIDEO META ==================
def get_video_metadata(video_id):
    try:
        r = requests.get(
            f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json",
            timeout=10
        )
        if r.status_code == 200:
            data = r.json()
            return data.get("title", "Unknown Title"), "Description not available"
    except:
        pass
    return "Unknown Title", "Description not available"

# ================== TRANSCRIPT ==================
def get_transcript(video_id):
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        transcript = transcript_list.find_transcript(["en", "hi"])
        fetched = transcript.fetch()
        return " ".join([t["text"] for t in fetched])
    except Exception as e:
        print("Transcript error:", e)
        return None

# ================== GEMINI ANALYSIS ==================
def analyze_with_gemini(text_source):
    prompt = f"""
You are an expert university professor.

Analyze the lecture content elow and STRICTLY return VALID JSON only.

CONTENT:
{text_source}

FORMAT:
{{
  "detailed_notes": "Detailed structured notes in a sturected way point like heading ,point and sub point  in a html formate so that any browser understand it ",
  "revision_notes": "Short revision points",
  "key_concepts": ["Concept 1", "Concept 2"],
  "important_questions": ["Question 1", "Question 2"],
  "doubt_points": [
    {{
      "timestamp": "00:10",
      "concept": "Concept Name",
      "explanation": "Why students get confused",
      "confidence": 75
    }}
  ]
}}
"""
    try:
        response = model.generate_content(prompt)
        raw = response.text
        start = raw.find("{")
        end = raw.rfind("}") + 1
        return json.loads(raw[start:end])
    except Exception as e:
        print("Gemini Analysis Error:", e)
        return {
            "detailed_notes": "Notes not available",
            "revision_notes": "Revise important points",
            "key_concepts": [],
            "important_questions": [],
            "doubt_points": []
        }

# ================== MCQ GENERATOR ==================
def generate_mcqs(text_source):
    prompt = f"""
Create 10 MCQs from the content below.
Return ONLY JSON.

{text_source}

FORMAT:
{{
  "mcqs": [
    {{
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correct": "A",
      "explanation": "string"
    }}
  ]
}}
"""
    try:
        response = model.generate_content(prompt)
        raw = response.text
        start = raw.find("{")
        end = raw.rfind("}") + 1
        return json.loads(raw[start:end])
    except Exception as e:
        print("MCQ Error:", e)
        return {"mcqs": []}

# ================== ROUTES ==================
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/process", methods=["POST"])
def process_video():
    data = request.get_json()
    video_url = data.get("url")

    video_id = extract_video_id(video_url)
    if not video_id:
        return jsonify({"error": "Invalid YouTube URL"}), 400

    title, description = get_video_metadata(video_id)
    transcript = get_transcript(video_id)

    text_source = transcript if transcript else f"{title}\n{description}"

    lecture_id = str(uuid.uuid4())

    lecture_cache[lecture_id] = {
        "id": lecture_id,
        "title": title,
        "timestamp": datetime.now().isoformat(),
        "analysis": analyze_with_gemini(text_source),
        "mcqs": generate_mcqs(text_source)
    }

    return jsonify({
        "success": True,
        "redirect": f"/notes/{lecture_id}"
    })

@app.route("/notes/<lecture_id>")
def notes(lecture_id):
    lecture = lecture_cache.get(lecture_id)
    if not lecture:
        return "Lecture not found", 404
    return render_template("notes.htm", lecture=lecture)

@app.route("/health")
def health():
    return jsonify({"status": "OK"})

# ================== RUN ==================
if __name__ == "__main__":
    app.run(debug=True)
