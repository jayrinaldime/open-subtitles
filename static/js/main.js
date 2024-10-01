let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let silenceDetectionTimer;
const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION = 300; // 0.3 seconds of silence

document.getElementById('startRecording').addEventListener('click', startRecording);
document.getElementById('stopRecording').addEventListener('click', stopRecording);

function startContinuousRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            isRecording = true;

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                sendAudioToServer(audioBlob);
                audioChunks = [];
                if (isRecording) {
                    mediaRecorder.start();
                }
            };

            mediaRecorder.start(1000); // Collect data every second
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
        for (let i = 0; i < bufferLength; i++) {
            sum += Math.abs(dataArray[i] - 128);
        }
        const average = sum / bufferLength;
        
        if (average < SILENCE_THRESHOLD) {
            if (!silenceDetectionTimer) {
                silenceDetectionTimer = setTimeout(() => {
                    if (isRecording) {
                        mediaRecorder.stop();
                    }
                }, SILENCE_DURATION);
            }
        } else {
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
}

function stopRecording() {
    isRecording = false;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    document.getElementById('startRecording').disabled = false;
    document.getElementById('stopRecording').disabled = true;
}

function sendAudioToServer(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');

    fetch('/transcribe', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.text) {
            addTranscriptionToUI(data.text);
        } else if (data.error) {
            console.error('Error:', data.error);
        }
    })
    .catch(error => console.error('Error:', error));
}

function addTranscriptionToUI(text) {
    const container = document.getElementById('transcriptionContainer');
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    container.appendChild(paragraph);
}
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let silenceDetectionTimer;
const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION = 1000; // 1 second of silence

function startContinuousRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            isRecording = true;

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                sendAudioToServer(audioBlob);
                audioChunks = [];
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
        for (let i = 0; i < bufferLength; i++) {
            sum += Math.abs(dataArray[i] - 128);
        }
        const average = sum / bufferLength;
        
        if (average < SILENCE_THRESHOLD) {
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
                }, SILENCE_DURATION);
            }
        } else {
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
}

function stopRecording() {
    isRecording = false;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    document.getElementById('startRecording').disabled = false;
    document.getElementById('stopRecording').disabled = true;
}

function sendAudioToServer(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');

    fetch('/transcribe', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('transcription').value += data.text + '\n';
    })
    .catch(error => {
        console.error('Error:', error);
    });
}
