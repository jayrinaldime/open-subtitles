let mediaRecorder;
let audioChunks = [];
let silenceTimeout;
const SILENCE_THRESHOLD = 0.3; // 0.3 seconds
let audioContext;
let analyser;
let silenceDetector;

document.getElementById('startRecording').addEventListener('click', startRecording);
document.getElementById('stopRecording').addEventListener('click', stopRecording);

async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = sendAudioToServer;

    mediaRecorder.start(1000); // Record in 1-second chunks
    document.getElementById('startRecording').disabled = true;
    document.getElementById('stopRecording').disabled = false;

    silenceDetector = setInterval(detectSilence, 100); // Check for silence every 100ms
}

function detectSilence() {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    const silenceThreshold = 128; // Adjust this value if needed
    const isSilent = dataArray.every(value => Math.abs(value - 128) < silenceThreshold);

    if (isSilent) {
        if (!silenceTimeout) {
            silenceTimeout = setTimeout(() => {
                sendAudioToServer();
                audioChunks = []; // Clear the audio chunks after sending
            }, SILENCE_THRESHOLD * 1000);
        }
    } else {
        if (silenceTimeout) {
            clearTimeout(silenceTimeout);
            silenceTimeout = null;
        }
    }
}

function stopRecording() {
    mediaRecorder.stop();
    clearInterval(silenceDetector);
    document.getElementById('startRecording').disabled = false;
    document.getElementById('stopRecording').disabled = true;
}

function sendAudioToServer() {
    if (audioChunks.length === 0) return;

    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'words.wav');

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

    // Don't clear audioChunks here, as we want to continue recording
}

function addTranscriptionToUI(text) {
    const container = document.getElementById('transcriptionContainer');
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    container.appendChild(paragraph);
}
