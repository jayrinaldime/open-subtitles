import os
import groq
from .abstract_services import TranscriptionService, TranslationService

class GroqTranscriptionService(TranscriptionService):
    def __init__(self):
        self.client = groq.AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))
        self.LLM_STT_MODEL = os.environ.get("LLM_STT_MODEL") or "whisper-large-v3"

    async def transcribe(self, audio_content: bytes, file_extension: str, source_language: str = "auto") -> str:
        optional_params = {"language": source_language} if source_language != "auto" else {}
        transcription = await self.client.audio.transcriptions.create(
            model=self.LLM_STT_MODEL,
            file=("audio.{}".format(file_extension), audio_content),
            response_format="text",
            **optional_params
        )
        return transcription

class GroqTranslationService(TranslationService):
    def __init__(self):
        self.client = groq.AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))
        self.LLM_CHAT_MODEL = os.environ.get("GROQ_CHAT_MODEL") or "llama-3.2-3b-preview"
        self.SYSTEM_PROMPT_TRANSLATE = os.environ.get("SYSTEM_PROMPT_TRANSLATE") or """
        You are a helpful translator.
        Translate the text to the {LANGUAGE} language and only return the translated text.
        Do **not** state the original input and do **NOT** summarize!
        """

    async def translate(self, text: str, target_language: str) -> str:
        language_prompt = self.SYSTEM_PROMPT_TRANSLATE.format(LANGUAGE=target_language)
        messages = [
            {"role": "system", "content": language_prompt},
            {"role": "user", "content": text}
        ]
        response = await self.client.chat.completions.create(
            model=self.LLM_CHAT_MODEL,
            messages=messages
        )
        return response.choices[0].message.content.strip()
