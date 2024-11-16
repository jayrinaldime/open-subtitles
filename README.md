# Audio Transcribe & Translate

## Project Overview
This is a web-based application that provides close to real-time audio transcription and translation services using browser microphone input. Leveraging multiple AI providers, the application captures live speech, transcribes it, and translates the text into different languages as users speak.

## Key Features
- Browser Microphone Integration
  - Close to Real-time speech capture directly in the web browser
  - Intelligent phrase detection and transcription
- Multi-Provider Support
  - Transcription Providers: Configurable (default: OpenAI)
  - Translation Providers: OpenAI, Groq, Ollama
- Supports Multiple Audio Formats
  - Supported formats: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm
- Language Translation
  - Supports multiple languages including English, Spanish, French, German, Italian, Japanese, Korean, Chinese

## Project Structure
- `app.py`: Main FastAPI application
- `ai_interface/`: AI service implementations
  - `abstract_services.py`: Base service interface
  - `openai_services.py`: OpenAI service implementation
  - `ollama_services.py`: Ollama service implementation
  - `groq_services.py`: Groq service implementation
- `static/`: Web assets
- `templates/`: HTML templates

## Prerequisites
- Python 3.8+
- pip (Python package manager)
- Modern web browser with microphone support

## Installation
1. Clone the repository
2. Create a virtual environment
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.template` to `.env` and configure your API keys

## Environment Configuration
Configure your `.env` file with the following variables:
- `TRANSCRIPTION_PROVIDER`: Choose transcription provider (default: openai)
- `TRANSLATION_PROVIDER`: Choose translation provider (openai, groq, ollama)
- API keys for respective providers

## Running the Application
```bash
python app.py
```
Or using Uvicorn:
```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

## How It Works
1. Open the web application in a browser
2. Grant microphone permissions
3. Speak naturally - the application will:
   - Detect when you complete a phrase
   - Transcribe your speech in real-time
   - Translate the transcribed text to your desired language

## API Endpoints
- `GET /`: Main application interface
- `POST /transcribe`: Upload and transcribe audio files
  - Parameters:
    - `audio`: Audio file
    - `audio_level`: Audio level
    - `max_audio_level`: Maximum audio level
    - `source_language`: Source language (default: auto)
    - `target_language`: Target language for translation (default: en)

## Technologies
- FastAPI
- Python
- Browser Microphone API
- OpenAI API
- Ollama
- Groq API
- Whisper (for local Speech to Text)
   - Use docker image https://hub.docker.com/r/onerahmet/openai-whisper-asr-webservice 

## Version
Current version: 0.0.6

## License
See the LICENSE file for details.

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Contact
For issues or inquiries, please open a GitHub issue.
