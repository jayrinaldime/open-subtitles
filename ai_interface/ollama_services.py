import os
from .abstract_services import TranslationService
import ollama

class OllamaTranslationService(TranslationService):
    def __init__(self):
        self.model = os.environ.get("OLLAMA_MODEL", "llama2")
        self.SYSTEM_PROMPT_TRANSLATE = os.environ.get("SYSTEM_PROMPT_TRANSLATE") or """
        You are a helpful translator.
        Translate the text to the {LANGUAGE} language and only return the translated text.
        Do **not** state the original input and do **NOT** summarize!
        """

    async def translate(self, text: str, target_language: str) -> str:
        prompt = self.SYSTEM_PROMPT_TRANSLATE.format(LANGUAGE=target_language) + "\n\n" + text
        
        response = await ollama.generate(model=self.model, prompt=prompt)
        return response['response'].strip()

    async def stream_translate(self, text: str, target_language: str):
        prompt = self.SYSTEM_PROMPT_TRANSLATE.format(LANGUAGE=target_language) + "\n\n" + text
        
        async for part in ollama.generate(model=self.model, prompt=prompt, stream=True):
            yield part['response']
