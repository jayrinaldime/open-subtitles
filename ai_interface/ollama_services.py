import os
from .abstract_services import TranslationService
from ollama import AsyncClient


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
        return response["response"].strip()
