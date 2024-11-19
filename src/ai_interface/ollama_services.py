import os
from .abstract_services import TranslationService, TranscriptionService
from ollama import AsyncClient
import httpx


class LocalTranscriptionService(TranscriptionService):
    def __init__(self):
        self.endpoint_url = os.environ["LOCAL_TRANSCRIPTION_ENDPOINT"]

    async def transcribe(
        self, audio_content: bytes, file_extension: str, source_language: str = "auto"
    ) -> str:
        data = {"task": "transcribe", "output": "txt"}

        # Open file in binary mode
        files = {"audio_file": audio_content}

        # Send POST request with file
        if source_language != "auto":
            data["language"] = source_language

        async with httpx.AsyncClient() as client:
            response = await client.post(self.endpoint_url, params=data, files=files)

        return response.text


class OllamaTranslationService(TranslationService):
    def __init__(self):
        self.model = os.environ.get("LLM_CHAT_MODEL", "llama2")
        self.host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
        self.client = AsyncClient(host=self.host)
        self.SYSTEM_PROMPT_TRANSLATE = (
            os.environ.get("SYSTEM_PROMPT_TRANSLATE")
            or """
        You are a helpful translator.
        Translate the text to the {LANGUAGE} language and only return the translated text.
        Do **not** state the original input and do **NOT** summarize!
        """
        ).strip()

    async def translate(self, text: str, target_language: str) -> str:
        prompt = (
            self.SYSTEM_PROMPT_TRANSLATE.format(LANGUAGE=target_language)
            + "\n\n"
            + f"```text\n{text}\n```"
        )

        response = await self.client.generate(model=self.model, prompt=prompt)
        return response["response"]
