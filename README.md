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
   ```bash
   cp .env.template .env
   ```

## Deployment
### Docker Deployment
This project can be deployed using Docker. The Docker image for the application is available at `ghcr.io/jayrinaldime/open-subtitles:latest`.

#### Using Docker Compose
We provide sample Docker Compose files for different configurations:

- **Docker Compose for Local Deployment (Using Ollama):**
  ```bash
  docker-compose -f docker-compose-local-ollama.yml up
  ```

- **Docker Compose for OpenAI Deployment:**
  ```bash
  docker-compose -f docker-compose-openai.yml up
  ```

- **Docker Compose for Groq Deployment:**
  ```bash
  docker-compose -f docker-compose-groq.yml up
  ```

### Running the Application
- Without Docker:
  ```bash
  python app.py
  ```
  Or using Uvicorn:
  ```bash
  uvicorn app:app --host 0.0.0.0 --port 8000
  ```

- With Docker:
  ```bash
  docker run -p 8000:8000 ghcr.io/jayrinaldime/open-subtitles:latest
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

## Settings UI
### Description of Settings

1. **Silence Threshold:**
   - **Description:** The minimum average audio level required to detect speech. Lower values will make the system more sensitive to quieter sounds.
   - **Range:** 0.0 to 1.0
   - **Default Value:** 0.6

2. **Silence Duration (ms):**
   - **Description:** The duration of silence (in milliseconds) required to stop recording and process the audio. Longer values will allow for more natural pauses in speech.
   - **Range:** 100ms to 2000ms
   - **Default Value:** 300ms

3. **Max Audio Level Threshold:**
   - **Description:** The maximum audio level required to process the audio. If the detected audio level exceeds this threshold, the audio will be sent to the server for transcription.
   - **Range:** 1 to 128
   - **Default Value:** 10

4. **Transcript View Layout:**
   - **Description:** Choose between a detailed or compact view for the transcribed text. The detailed view shows both the original and translated text, while the compact view shows only the translated text.
   - **Options:**
     - Detailed
     - Compact (default)
   - **Default Value:** Compact

5. **Debug Mode:**
   - **Description:** Enable debug mode to show additional information about the audio levels and processing.
   - **Default Value:** Disabled

6. **Source Language:**
   - **Description:** The language of the incoming audio. Set to "auto" for automatic language detection.
   - **Options:**
     - Auto-detect
     - English (en)
     - Spanish (es)
     - French (fr)
     - German (de)
     - Italian (it)
     - Japanese (ja)
     - Korean (ko)
     - Chinese (zh)
   - **Default Value:** Auto-detect

7. **Target Language:**
   - **Description:** The language to which the transcribed text will be translated.
   - **Options:**
     - English (en)
     - Spanish (es)
     - French (fr)
     - German (de)
     - Italian (it)
     - Japanese (ja)
     - Korean (ko)
     - Chinese (zh)
   - **Default Value:** English (en)

8. **Enable Translation:**
   - **Description:** Enable or disable the translation of the transcribed text.
   - **Default Value:** Enabled

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
