from abc import ABC, abstractmethod


class TranscriptionService(ABC):
    @abstractmethod
    async def transcribe(
        self, audio_content: bytes, file_extension: str, source_language: str = "auto"
    ) -> str:
        pass


class TranslationService(ABC):
    @abstractmethod
    async def translate(self, text: str, target_language: str) -> str:
        pass
