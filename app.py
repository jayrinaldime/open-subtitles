from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
import os
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def translate_to_english(text: str) -> str:
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a translator. Translate the following text to English. Only return the translated text. Do **not** state the original input and do **NOT** summarize"},
                {"role": "user", "content": text}
            ]
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Translation error: {str(e)}")
        return "Translation failed"

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize async OpenAI client
client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Mount the static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def index():
    with open("templates/index.html", "r") as file:
        return file.read()

class TranscriptionResponse(BaseModel):
    original_text: str
    translated_text: str

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
from pydantic import BaseModel
from dotenv import load_dotenv

# ... (keep the existing imports and setup)

@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(audio: UploadFile = File(...)):
    supported_formats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']
    file_extension = audio.filename.split('.')[-1].lower()
    if file_extension not in supported_formats:
       raise HTTPException(status_code=400, detail=f"Unsupported file format. Supported formats are: {', '.join(supported_formats)}")

    try:
        # Read the content of the uploaded file
        audio_content = await audio.read()
        
        # Use the content for transcription
        transcription = await client.audio.transcriptions.create(
            model="whisper-1",
            file=("audio.{}".format(file_extension), audio_content),
            response_format="text"
        )
        
        # Delete the audio content after transcription
        del audio_content
        
        # Translate the transcribed text to English
        translation = await translate_to_english(transcription)
        
        return {"original_text": transcription, "translated_text": translation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
