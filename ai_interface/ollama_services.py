import os
import aiohttp
from .abstract_services import TranslationService

class OllamaTranslationService(TranslationService):
    def __init__(self):
        self.base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        self.model = os.environ.get("OLLAMA_MODEL", "llama2")
        self.SYSTEM_PROMPT_TRANSLATE = os.environ.get("SYSTEM_PROMPT_TRANSLATE") or """
        You are a helpful translator.
        Translate the text to the {LANGUAGE} language and only return the translated text.
        Do **not** state the original input and do **NOT** summarize!
        """

    async def translate(self, text: str, target_language: str) -> str:
        prompt = self.SYSTEM_PROMPT_TRANSLATE.format(LANGUAGE=target_language) + "\n\n" + text
        
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{self.base_url}/api/generate", json={
                "model": self.model,
                "prompt": prompt,
                "stream": False
            }) as response:
                if response.status == 200:
                    result = await response.json()
                    return result["response"].strip()
                else:
                    raise Exception(f"Ollama API request failed with status {response.status}")
