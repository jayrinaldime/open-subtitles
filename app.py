from flask import Flask, render_template, request, jsonify
from openai import OpenAI
import os

app = Flask(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    
    try:
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
        return jsonify({"text": transcription.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
