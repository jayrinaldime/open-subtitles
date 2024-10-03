let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let silenceDetectionTimer;
let silenceThreshold = 0.6;
let silenceDuration = 300;
let isSilent = true;
let audioLevelUpdateInterval;
let currentAudioLevel = 0;
let maxAudioLevel = 0
let maxAudioLevelThreshold = 10;

document.getElementById('startRecording').addEventListener('click', startRecording);
document.getElementById('stopRecording').addEventListener('click', stopRecording);
document.getElementById('maxAudioLevelThreshold').addEventListener('input', function() {
    maxAudioLevelThreshold = parseInt(this.value);
    document.getElementById('maxAudioLevelThresholdValue').textContent = maxAudioLevelThreshold;
});
document.getElementById('silenceThreshold').addEventListener('input', function() {
    silenceThreshold = parseFloat(this.value);
    document.getElementById('silenceThresholdValue').textContent = silenceThreshold.toFixed(2);
});
document.getElementById('silenceDuration').addEventListener('input', function() {
    silenceDuration = parseInt(this.value);
    document.getElementById('silenceDurationValue').textContent = silenceDuration;
});

function startContinuousRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            isRecording = true;
            isSilent = true
            maxAudioLevel = 0

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                sendAudioToServer(audioBlob);
                audioChunks = [];
                isSilent = true;
                maxAudioLevel = 0;
            };

            mediaRecorder.start();
            detectSilence(stream);
        });
}

function detectSilence(stream) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    function checkAudioLevel() {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        let max = maxAudioLevel;
        for (let i = 0; i < bufferLength; i++) {
            const value = Math.abs(dataArray[i] - 128);
            sum += value;
            if (value > max) {
                max = value;
            }
        }
        const average = sum / bufferLength;
        currentAudioLevel = average; // Store the current audio level
        maxAudioLevel = max; 

        // Update the audio level display
        const audioLevelElement = document.getElementById('audioLevel');
        if (audioLevelElement) {
            audioLevelElement.textContent = `Avg: ${average.toFixed(2)}, Max: ${maxAudioLevel.toFixed(2)}`;
        }
        
        if (currentAudioLevel < silenceThreshold) {
            if (isRecording && isSilent ) {
                audioChunks = []; 
            }
            if (!silenceDetectionTimer) {
                silenceDetectionTimer = setTimeout(() => {
                    if (isRecording) {
                        mediaRecorder.stop();
                        isRecording = false;
                        setTimeout(() => {
                            if (!isRecording) {
                                startContinuousRecording();
                            }
                        }, 100);
                    }
                }, silenceDuration);
            }
        } else {
            isSilent = false
            clearTimeout(silenceDetectionTimer);
            silenceDetectionTimer = null;
        }

        if (isRecording) {
            requestAnimationFrame(checkAudioLevel);
        }
    }

    checkAudioLevel();
}

function startRecording() {
    startContinuousRecording();
    document.getElementById('startRecording').disabled = true;
    document.getElementById('stopRecording').disabled = false;
    
    // Show audio level element
    const audioLevelContainer = document.getElementById('audioLevelContainer');
    if (audioLevelContainer) {
        audioLevelContainer.style.display = 'block';
    }
}

function stopRecording() {
    isRecording = false;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    document.getElementById('startRecording').disabled = false;
    document.getElementById('stopRecording').disabled = true;
    
    // Hide audio level element
    const audioLevelContainer = document.getElementById('audioLevelContainer');
    if (audioLevelContainer) {
        audioLevelContainer.style.display = 'none';
    }
}

function sendAudioToServer(audioBlob) {
    if (maxAudioLevel < maxAudioLevelThreshold) {
        return;
    }
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');
    formData.append('audio_level', currentAudioLevel.toFixed(2));
    formData.append('max_audio_level', maxAudioLevel.toFixed(2));

    fetch('/transcribe', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.original_text && data.translated_text) {
            addTranscriptionToUI(data.original_text, data.translated_text);
        } else if (data.error) {
            console.error('Error:', data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function addTranscriptionToUI(originalText, translatedText) {
    const container = document.getElementById('transcriptionContainer');
    const transcriptionElement = document.createElement('div');
    transcriptionElement.className = 'transcription-entry';
    
    const timestamp = new Date().toLocaleTimeString();
    const timestampElement = document.createElement('span');
    timestampElement.className = 'timestamp';
    timestampElement.textContent = timestamp + ': ';
    
    const originalTextElement = document.createElement('p');
    originalTextElement.className = 'original-text';
    originalTextElement.textContent = 'Original: ' + originalText;
    
    const translatedTextElement = document.createElement('p');
    translatedTextElement.className = 'translated-text';
    translatedTextElement.textContent = 'Translated: ' + translatedText;
    
    transcriptionElement.appendChild(timestampElement);
    transcriptionElement.appendChild(originalTextElement);
    transcriptionElement.appendChild(translatedTextElement);
    
    container.insertBefore(transcriptionElement, container.firstChild);
}
