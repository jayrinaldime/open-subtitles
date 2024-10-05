import os
from abc import ABC, abstractmethod
from openai import AsyncOpenAI

class AIService(ABC):
    @abstractmethod
    async def transcribe(self, audio_content: bytes, file_extension: str, source_language: str = "auto") -> str:
        pass

    @abstractmethod
    async def translate(self, text: str, target_language: str) -> str:
        pass

class OpenAIService(AIService):
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        self.LLM_CHAT_MODEL = os.environ.get("LLM_CHAT_MODEL") or "gpt-4o-mini"
        self.LLM_STT_MODEL = os.environ.get("LLM_STT_MODEL") or "whisper-1"
        self.SYSTEM_PROMPT_TRANSLATE = os.environ.get("SYSTEM_PROMPT_TRANSLATE") or """
        You are a helpful translator.
        Translate the text to the {LANGUAGE} language and only return the translated text.
        Do **not** state the original input and do **NOT** summarize!
        """

    async def transcribe(self, audio_content: bytes, file_extension: str, source_language: str = "auto") -> str:
        optional_params = {"language": source_language} if source_language != "auto" else {}
        transcription = await self.client.audio.transcriptions.create(
            model=self.LLM_STT_MODEL,
            file=("audio.{}".format(file_extension), audio_content),
            response_format="text",
            **optional_params
        )
        return transcription

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

class GroqService(AIService):
    def __init__(self):
        # Initialize Groq client here (you'll need to implement this based on Groq's API)
        self.client = None  # Replace with actual Groq client initialization
        self.SYSTEM_PROMPT_TRANSLATE = os.environ.get("SYSTEM_PROMPT_TRANSLATE") or """
        You are a helpful translator.
        Translate the text to the {LANGUAGE} language and only return the translated text.
        Do **not** state the original input and do **NOT** summarize!
        """

    async def transcribe(self, audio_content: bytes, file_extension: str, source_language: str = "auto") -> str:
        # Implement Groq transcription logic here
        # This is a placeholder implementation
        return "Groq transcription not implemented yet"

    async def translate(self, text: str, target_language: str) -> str:
        # Implement Groq translation logic here
        # This is a placeholder implementation
        return f"Groq translation to {target_language} not implemented yet"

def get_ai_service(provider: str = "openai") -> AIService:
    if provider.lower() == "openai":
        return OpenAIService()
    elif provider.lower() == "groq":
        return GroqService()
    else:
        raise ValueError(f"Unsupported AI provider: {provider}")
