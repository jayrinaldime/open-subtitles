from fastapi import FastAPI, File, UploadFile, HTTPException, Form
import logging
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
import os
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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

SYSTEM_PROMPT_TRANSLATE = os.environ.get("SYSTEM_PROMPT_TRANSLATE") or """
You are a helpful translator.
Translate the text to the {LANGUAGE} language and only return the translated text.
Do **not** state the original input and do **NOT** summarize!
Maintain the original formatting, including line breaks and punctuation.
"""

LLM_CHAT_MODEL = os.environ.get("LLM_CHAT_MODEL") or "gpt-4o-mini"
LLM_STT_MODEL = os.environ.get("LLM_STT_MODEL") or "whisper-1"

# Dictionary mapping language codes to full names
LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    # Add more languages as needed
}

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mount the static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def index():
    with open("templates/index.html", "r") as file:
        return file.read()

class TranscriptionResponse(BaseModel):
    original_text: str
    translated_text: str

@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(
    audio: UploadFile = File(...),
    audio_level: float = Form(...),
    max_audio_level: float = Form(...),
    source_language: str = Form(default="auto"),
    target_language: str = Form(default="en")
):
    supported_formats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']
    file_extension = audio.filename.split('.')[-1].lower()
    if file_extension not in supported_formats:
       raise HTTPException(status_code=400, detail=f"Unsupported file format. Supported formats are: {', '.join(supported_formats)}")

    try:
        # Log the audio level
        logger.info(f"Received audio with average level: {audio_level}")

        # Read the content of the uploaded file
        audio_content = await audio.read()
        
        # Use the content for transcription

        if source_language!= "auto":
            optional_params = {"language": source_language}
        else: 
            optional_params = {}
        transcription = await client.audio.transcriptions.create(
            model=LLM_STT_MODEL,
            file=("audio.{}".format(file_extension), audio_content),
            response_format="text",
            **optional_params
        )
        
        # Delete the audio content after transcription
        del audio_content
        
        # Translate the transcribed text to the target language
        language_name = LANGUAGE_NAMES[target_language]
        translation = await translate_text(transcription, language_name)
        
        return {"original_text": transcription, "translated_text": translation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def translate_text(text: str, target_language: str) -> str:
    try:
        language_prompt = SYSTEM_PROMPT_TRANSLATE.format(LANGUAGE=target_language)
        messages = [
                {"role": "system", "content": language_prompt},
                {"role": "user", "content": text}
            ]
        print(messages)
        response = await client.chat.completions.create(
            model=LLM_CHAT_MODEL,
            messages=messages
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Translation error: {str(e)}")
        return f"Translation to {target_language} failed"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
