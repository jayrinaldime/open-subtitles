let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let silenceDetectionTimer;
let silenceThreshold = 0.6;
let silenceDuration = 300;
let isSilent = true;
let audioLevelUpdateInterval;
let currentAudioLevel = 0;
let maxAudioLevel = 0;
let maxAudioLevelThreshold = 10;
let transcriptLayout = 'compact';
let debugMode = false;
let sourceLanguage = 'auto';
let targetLanguage = 'en';
let enableTranslation = true;
let isTranscribing = false; // New flag to prevent multiple simultaneous transcriptions
let audioQueue = []; // New queue to store audio blobs

const toggleRecordingButton = document.getElementById('toggleRecording');
toggleRecordingButton.addEventListener('click', toggleRecording);
document.getElementById('settingsButton').addEventListener('click', toggleSettings);
document.getElementById('processNow').addEventListener('click', processCurrentAudio);

function saveSettings() {
    localStorage.setItem('audioTranscribeSettings', JSON.stringify({
        maxAudioLevelThreshold,
        silenceThreshold,
        silenceDuration,
        transcriptLayout,
        debugMode,
        sourceLanguage,
        targetLanguage,
        enableTranslation
    }));
}

function loadSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('audioTranscribeSettings'));
    if (savedSettings) {
        maxAudioLevelThreshold = savedSettings.maxAudioLevelThreshold;
        silenceThreshold = savedSettings.silenceThreshold;
        silenceDuration = savedSettings.silenceDuration;
        transcriptLayout = savedSettings.transcriptLayout;
        debugMode = savedSettings.debugMode;
        sourceLanguage = savedSettings.sourceLanguage || 'auto';
        targetLanguage = savedSettings.targetLanguage || 'en';
        enableTranslation = savedSettings.enableTranslation !== undefined 
            ? savedSettings.enableTranslation 
            : true;

        document.getElementById('enableTranslation').checked = enableTranslation;

        document.getElementById('maxAudioLevelThreshold').value = maxAudioLevelThreshold;
        document.getElementById('maxAudioLevelThresholdValue').textContent = maxAudioLevelThreshold;
        document.getElementById('silenceThreshold').value = silenceThreshold;
        document.getElementById('silenceThresholdValue').textContent = silenceThreshold.toFixed(2);
        document.getElementById('silenceDuration').value = silenceDuration;
        document.getElementById('silenceDurationValue').textContent = silenceDuration;
        document.getElementById('transcriptLayout').value = transcriptLayout;
        document.getElementById('debugMode').checked = debugMode;
        document.getElementById('sourceLanguage').value = sourceLanguage;
        document.getElementById('targetLanguage').value = targetLanguage;
        document.getElementById('enableTranslation').checked = enableTranslation;
        updateAudioLevelVisibility();
        updateTranscriptLayout();
    }
}

loadSettings();

document.getElementById('sourceLanguage').addEventListener('change', function() {
    sourceLanguage = this.value;
    saveSettings();
});

document.getElementById('targetLanguage').addEventListener('change', function() {
    targetLanguage = this.value;
    saveSettings();
});

document.getElementById('maxAudioLevelThreshold').addEventListener('input', function() {
    maxAudioLevelThreshold = parseInt(this.value);
    document.getElementById('maxAudioLevelThresholdValue').textContent = maxAudioLevelThreshold;
    saveSettings();
});
document.getElementById('transcriptLayout').addEventListener('change', function() {
    transcriptLayout = this.value;
    updateTranscriptLayout();
    saveSettings();
});
document.getElementById('silenceThreshold').addEventListener('input', function() {
    silenceThreshold = parseFloat(this.value);
    document.getElementById('silenceThresholdValue').textContent = silenceThreshold.toFixed(2);
    saveSettings();
});
document.getElementById('silenceDuration').addEventListener('input', function() {
    silenceDuration = parseInt(this.value);
    document.getElementById('silenceDurationValue').textContent = silenceDuration;
    saveSettings();
});
document.getElementById('debugMode').addEventListener('change', function() {
    debugMode = this.checked;
    updateAudioLevelVisibility();
    saveSettings();
});
document.getElementById('enableTranslation').addEventListener('change', function() {
    enableTranslation = this.checked;
    saveSettings();
});

function updateAudioLevelVisibility() {
    const audioLevelContainer = document.getElementById('audioLevelContainer');
    if (audioLevelContainer) {
        audioLevelContainer.style.display = debugMode && isRecording ? 'block' : 'none';
    }
}

function toggleSettings() {
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel.style.display === 'none') {
        settingsPanel.style.display = 'block';
    } else {
        settingsPanel.style.display = 'none';
    }
}

function startContinuousRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            isRecording = true;
            isSilent = true;
            maxAudioLevel = 0;

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
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            showError('Unable to access microphone. Please check your permissions.');
            isRecording = false;
            updateRecordingState();
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

    let lastUpdateTime = 0;
    function checkAudioLevel(timestamp) {
        if (timestamp - lastUpdateTime > 100) { // Update every 100ms
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

            lastUpdateTime = timestamp;
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
            isSilent = false;
            clearTimeout(silenceDetectionTimer);
            silenceDetectionTimer = null;
        }

        if (isRecording) {
            requestAnimationFrame(checkAudioLevel);
        }
    }

    checkAudioLevel();
}

function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
    updateRecordingState();
}

function updateRecordingState() {
    const recordingIndicator = document.getElementById('recordingIndicator');
    toggleRecordingButton.setAttribute('aria-pressed', isRecording);
    toggleRecordingButton.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
    recordingIndicator.style.display = isRecording ? 'inline-block' : 'none';
    document.getElementById('processNow').style.display = isRecording ? 'inline-block' : 'none';
}

function startRecording() {
    startContinuousRecording();
    isRecording = true;
    updateAudioLevelVisibility();
    document.getElementById('exportButtonContainer').style.display = 'none'; // Hide the export button
}

function stopRecording() {
    isRecording = false;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    updateAudioLevelVisibility();
    document.getElementById('exportButtonContainer').style.display = 'block'; // Show the export button
}

function sendAudioToServer(audioBlob) {
    // If transcribing, add to queue instead of immediate processing
    if (isTranscribing) {
        audioQueue.push(audioBlob);
        return;
    }

    // If not transcribing and no audio blob, check queue
    if (!audioBlob && audioQueue.length > 0) {
        audioBlob = audioQueue.shift();
    }

    // Skip if no audio or below threshold
    if (!audioBlob || maxAudioLevel < maxAudioLevelThreshold) {
        return;
    }

    isTranscribing = true;
    const formData = new FormData();
    formData.append('enable_translation', enableTranslation);  // Add this line
    formData.append('audio', audioBlob, 'audio.wav');
    formData.append('audio_level', currentAudioLevel.toFixed(2));
    formData.append('max_audio_level', maxAudioLevel.toFixed(2));
    formData.append('source_language', sourceLanguage);
    formData.append('target_language', targetLanguage);
    formData.append('enable_translation', enableTranslation);

    fetch('/transcribe', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (enableTranslation && data.translated_text && data.translated_text.trim() !== '') {
            addTranscriptionToUI(data.original_text, data.translated_text);
        } else if (!enableTranslation && data.original_text && data.original_text.trim() !== '') {
            addTranscriptionToUI(data.original_text, data.original_text);
        } else if (data.error) {
            console.error('Error:', data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    })
    .finally(() => {
        isTranscribing = false;
        
        // Immediately process next queued audio if available
        if (audioQueue.length > 0) {
            sendAudioToServer(); // Call without argument to process queue
        }
    });
}

function processCurrentAudio() {
    if (audioChunks.length > 0 && maxAudioLevel >= maxAudioLevelThreshold) {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        sendAudioToServer(audioBlob);
        audioChunks = []; // Clear the audio chunks after processing
    }
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
    originalTextElement.textContent = originalText;
    originalTextElement.style.display = transcriptLayout === 'detailed' ? 'block' : 'none';
    
    const translatedTextElement = document.createElement('p');
    translatedTextElement.className = 'translated-text';
    translatedTextElement.textContent = translatedText;
    
    // Create action buttons
    const actionContainer = document.createElement('div');
    actionContainer.className = 'transcription-actions';
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = '🗑️';
    deleteButton.className = 'delete-entry';
    deleteButton.addEventListener('click', () => {
        container.removeChild(transcriptionElement);
        updateExportButtonVisibility();
    });
    
    const mergeButton = document.createElement('button');
    mergeButton.textContent = '🔗';
    mergeButton.className = 'merge-entry';
    mergeButton.addEventListener('click', () => mergeTranscriptionEntries(transcriptionElement));
    
    actionContainer.appendChild(deleteButton);
    actionContainer.appendChild(mergeButton);
    
    transcriptionElement.appendChild(timestampElement);
    transcriptionElement.appendChild(translatedTextElement);
    transcriptionElement.appendChild(originalTextElement);
    transcriptionElement.appendChild(actionContainer);
    
    // Store the original and translated text as data attributes
    transcriptionElement.dataset.originalText = originalText;
    transcriptionElement.dataset.translatedText = translatedText;
    
    container.insertBefore(transcriptionElement, container.firstChild);
    updateTranscriptLayout();
    updateExportButtonVisibility();
}

function updateExportButtonVisibility() {                                                  
    const container = document.getElementById('transcriptionContainer');                   
    const entries = container.getElementsByClassName('transcription-entry');               
    const exportButtonContainer = document.getElementById('exportButtonContainer');        
                                                                                           
    // Show export button only if there are transcription entries      
    if (isRecording) {
        exportButtonContainer.style.display = 'none';
    }                   
    else {
    exportButtonContainer.style.display = entries.length > 0 ? 'block' : 'none';   
    }        
} 

function updateTranscriptLayout() {
    const container = document.getElementById('transcriptionContainer');
    const entries = container.getElementsByClassName('transcription-entry');
    
    Array.from(entries).forEach(entry => {
        const originalText = entry.querySelector('.original-text');
        const translatedText = entry.querySelector('.translated-text');
        
        if (transcriptLayout === 'detailed') {
            originalText.style.display = 'block';
            originalText.textContent = 'Original: ' + entry.dataset.originalText;
            translatedText.textContent = entry.dataset.translatedText;
        } else { // compact layout
            originalText.style.display = 'none';
            translatedText.textContent = entry.dataset.translatedText;
        }
    });
}

document.getElementById('clearTranscript').addEventListener('click', function() {
    if (confirm('Are you sure you want to discard the transcript?')) {
        document.getElementById('transcriptionContainer').innerHTML = '';
        document.getElementById('exportButtonContainer').style.display = 'none'; // Hide the export button
    }
});

// Add the export button event listener
document.getElementById('exportTranscript').addEventListener('click', exportTranscript);

// Function to export the transcript as a text file
function exportTranscript() {
    const container = document.getElementById('transcriptionContainer');
    const entries = container.getElementsByClassName('transcription-entry');
    let transcriptText = '';

    // Convert the HTMLCollection to an array and sort by the order they appear in the DOM
    const sortedEntries = Array.from(entries).sort((a, b) => {
        return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    // Reverse the order of the entries
    sortedEntries.reverse();

    sortedEntries.forEach(entry => {
        const timestamp = entry.querySelector('.timestamp').textContent;
        const originalText = entry.querySelector('.original-text').textContent.replace(/^Original: /, "").trim();
        const translatedText = entry.querySelector('.translated-text').textContent.trim();
        transcriptText += `${timestamp}\n${translatedText}\n------\n${originalText}\n\n`;
    });

    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'transcript.txt';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}
function mergeTranscriptionEntries(currentEntry) {
    const container = document.getElementById('transcriptionContainer');
    const previousEntry = currentEntry.nextElementSibling;

    if (!previousEntry) {
        alert('No previous entry to merge with.');
        return;
    }

    const previousOriginalText = previousEntry.dataset.originalText;
    const currentOriginalText = currentEntry.dataset.originalText;

    // Concatenate texts with previous message first
    const concatenatedText = `${previousOriginalText} ${currentOriginalText}`;

    // Prepare data for translation
    const formData = new FormData();
    formData.append('text', concatenatedText);
    formData.append('target_language', targetLanguage);
    formData.append('enable_translation', enableTranslation);

    // Call translation endpoint
    fetch('/translate', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Update previous entry with merged and translated text
        previousEntry.dataset.originalText = concatenatedText;
        previousEntry.dataset.translatedText = data.translated_text;
        
        // Update the displayed text based on current layout
        const translatedTextElement = previousEntry.querySelector('.translated-text');
        const originalTextElement = previousEntry.querySelector('.original-text');
        
        translatedTextElement.textContent = data.translated_text;
        
        if (transcriptLayout === 'detailed') {
            originalTextElement.textContent = `Original: ${concatenatedText}`;
        }

        // Remove the current entry
        container.removeChild(currentEntry);
        
        // Update export button visibility
        updateExportButtonVisibility();
    })
    .catch(error => {
        console.error('Error merging and translating:', error);
        alert('Failed to merge and translate entries.');
    });
}
