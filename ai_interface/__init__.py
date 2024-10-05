from .abstract_services import TranscriptionService, TranslationService
from .openai_services import OpenAITranscriptionService, OpenAITranslationService
from .groq_services import GroqTranscriptionService, GroqTranslationService

def get_transcription_service(provider: str = "openai") -> TranscriptionService:
    if provider.lower() == "openai":
        return OpenAITranscriptionService()
    elif provider.lower() == "groq":
        return GroqTranscriptionService()
    else:
        raise ValueError(f"Unsupported transcription provider: {provider}")

def get_translation_service(provider: str = "openai") -> TranslationService:
    if provider.lower() == "openai":
        return OpenAITranslationService()
    elif provider.lower() == "groq":
        return GroqTranslationService()
    else:
        raise ValueError(f"Unsupported translation provider: {provider}")
