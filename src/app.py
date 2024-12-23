import asyncio
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
import logging
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from pydantic import BaseModel
from dotenv import load_dotenv
from ai_interface import get_transcription_service, get_translation_service

# Load environment variables
load_dotenv()

__version__ = "0.0.6"

app = FastAPI(title="Audio Transcribe & Translate", version=__version__)

TRANSCRIPTION_PROVIDER = os.environ.get("TRANSCRIPTION_PROVIDER", "openai").lower()
TRANSLATION_PROVIDER = os.environ.get("TRANSLATION_PROVIDER", "openai").lower()
TRANSLATION_TIMEOUT = float(os.environ.get("TRANSLATION_TIMEOUT", 60.0))
if TRANSLATION_PROVIDER not in ["openai", "groq", "ollama"]:
    raise ValueError(f"Unsupported translation provider: {TRANSLATION_PROVIDER}")

transcription_service = get_transcription_service(TRANSCRIPTION_PROVIDER)
translation_service = get_translation_service(TRANSLATION_PROVIDER)

from utils.executiontimelogger import ExecutionTimeLogger

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

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
log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, log_level))
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
    target_language: str = Form(default="en"),
    enable_translation: bool = Form(default=True),
):
    with ExecutionTimeLogger(logger, message="transcribe request") as executionLogger:
        supported_formats = [
            "flac",
            "m4a",
            "mp3",
            "mp4",
            "mpeg",
            "mpga",
            "oga",
            "ogg",
            "wav",
            "webm",
        ]
        file_extension = audio.filename.split(".")[-1].lower()
        if file_extension not in supported_formats:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format. Supported formats are: {', '.join(supported_formats)}",
            )

        # Log the audio level and providers
        logger.info(
            f"Received audio with average level: {audio_level}, using Transcription provider: {TRANSCRIPTION_PROVIDER}, Translation provider: {TRANSLATION_PROVIDER}"
        )

        # Read the content of the uploaded file
        audio_content = await audio.read()
        audio_byte_size = len(audio_content)
        logger.info(f"Audio buffer size: {audio_byte_size}")

        # Use the content for transcription
        with executionLogger.log("Transcribe Service") as transcribeLogger:
            transcription = await transcription_service.transcribe(
                audio_content, file_extension, source_language
            )

        transcription = str(transcription).strip()

        # Perform translation if enabled
        if enable_translation and transcription != "":
            try:
                with executionLogger.log("Translate Service") as translateLogger:
                    translation = await asyncio.wait_for(
                        translation_service.translate(transcription, target_language), 
                        timeout=TRANSLATION_TIMEOUT
                    )
                translated_text = translation.strip()
            except asyncio.TimeoutError:
                logger.warning(f"Translation timed out for text: {transcription[:100]}...")
                translated_text = ""  # Set to blank string on timeout
            except Exception as e:
                logger.error(f"Translation error: {e}")
                translated_text = ""  # Set to blank string on any translation error
        else:
            translated_text = transcription

        return TranscriptionResponse(
            original_text=transcription, translated_text=translated_text
        )


@app.post("/translate", response_model=TranscriptionResponse)
async def translate_text(
    text: str = Form(...),
    target_language: str = Form(default="en"),
    enable_translation: bool = Form(default=True),
):
    with ExecutionTimeLogger(logger, message="translate request") as executionLogger:
        try:
            # Only translate if translation is enabled
            if enable_translation:
                with executionLogger.log("Translate Service") as translateLogger:
                    translation = await translation_service.translate(
                        text, target_language
                    )
                return TranscriptionResponse(
                    original_text=text, translated_text=translation.strip()
                )
            else:
                # If translation is disabled, return original text
                return TranscriptionResponse(original_text=text, translated_text=text)
            return {"translated_text": translation.strip()}
        except Exception as e:
            logger.error(f"Error translating text: {e}")
            raise HTTPException(status_code=500, detail="Error translating text")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
