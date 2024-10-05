import os
from abc import ABC, abstractmethod
from openai import AsyncOpenAI

class AIInterface(ABC):
    @abstractmethod
    async def transcribe(self, audio_content: bytes, file_extension: str, source_language: str = "auto") -> str:
        pass

    @abstractmethod
    async def translate(self, text: str, target_language: str) -> str:
        pass

class OpenAIInterface(AIInterface):
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

class GrokInterface(AIInterface):
    def __init__(self):
        # Initialize Grok client here (you'll need to implement this based on Grok's API)
        self.client = None  # Replace with actual Grok client initialization
        self.SYSTEM_PROMPT_TRANSLATE = os.environ.get("SYSTEM_PROMPT_TRANSLATE") or """
        You are a helpful translator.
        Translate the text to the {LANGUAGE} language and only return the translated text.
        Do **not** state the original input and do **NOT** summarize!
        """

    async def transcribe(self, audio_content: bytes, file_extension: str, source_language: str = "auto") -> str:
        # Implement Grok transcription logic here
        # This is a placeholder implementation
        return "Grok transcription not implemented yet"

    async def translate(self, text: str, target_language: str) -> str:
        # Implement Grok translation logic here
        # This is a placeholder implementation
        return f"Grok translation to {target_language} not implemented yet"

def get_ai_interface(provider: str = "openai") -> AIInterface:
    if provider.lower() == "openai":
        return OpenAIInterface()
    elif provider.lower() == "grok":
        return GrokInterface()
    else:
        raise ValueError(f"Unsupported AI provider: {provider}")
