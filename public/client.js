
// Get references to our HTML elements
const talkButton = document.getElementById('talkButton');
const statusDiv = document.getElementById('status');

// App state variables
let socket;
let mediaRecorder;
let audioContext;
let audioQueue = [];
let isPlaying = false;
let isRecording = false;

// Attach event listener to the talk button
talkButton.addEventListener('click', () => {
  if (isRecording) {
    stopConversation();
  } else {
    startConversation();
  }
});

// --- Core Functions ---

/**
 * Starts the conversation: connects to the server, gets microphone access, and starts sending audio.
 */
async function startConversation() {
  statusDiv.textContent = 'Connecting...';
  talkButton.textContent = 'Stop Talking';
  talkButton.classList.replace('idle', 'recording');
  isRecording = true;
  audioQueue = []; // Clear any previous audio

  // Create a new AudioContext for playback
  audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Establish a WebSocket connection to the server
  // It automatically connects to the same host and port the page is served from
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(`${protocol}//${window.location.host}`);
  socket.binaryType = 'arraybuffer'; // We'll be sending and receiving binary data

  // 1. When the connection is open, get microphone access
  socket.onopen = async () => {
    statusDiv.textContent = 'Connected. Start speaking…';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const options = {mimeType: 'audio/webm; codecs=opus',
  audioBitsPerSecond: 128000, // Explicitly set a bitrate for consistency
};
mediaRecorder = new MediaRecorder(stream, options);
      // When the user starts talking, stop any AI playback (for interruption)
      mediaRecorder.onstart = stopPlayback;

      // Send recorded audio chunks to the server
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
          socket.send(event.data);
        }
      };

      // Start recording in 250ms chunks
      mediaRecorder.start(250);
    } catch (err) {
      console.error('Error getting media stream:', err);
      statusDiv.textContent = 'Error: Could not access microphone.';
      stopConversation();
    }
  };

  // 2. When a message (audio) is received from the server
  socket.onmessage = (event) => {
    // Check if the received data is binary audio data
    if (event.data instanceof ArrayBuffer) {
      audioQueue.push(event.data);
      // If nothing is currently playing, start the playback loop
      if (!isPlaying) {
        playNextAudioChunk();
      }
    } else if (typeof event.data === 'string') {
      // Handle non-audio messages (like errors) from the server
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'error') {
          console.error('Server error:', msg.message);
          statusDiv.textContent = `Error: ${msg.message}`;
        }
      } catch (e) {
        // This might be a simple text message
        console.log('Received text message:', event.data);
      }
    }
  };

  // 3. Handle connection closing and errors
  socket.onclose = () => {
    statusDiv.textContent = 'Connection closed.';
    stopConversation();
  };

  socket.onerror = (err) => {
    console.error('WebSocket Error:', err);
    statusDiv.textContent = 'Error: Connection failed.';
    stopConversation();
  };
}

/**
 * Plays the next available audio chunk from the queue.
 */
async function playNextAudioChunk() {
  if (audioQueue.length === 0) {
    isPlaying = false;
    return;
  }
  isPlaying = true;

  // Get the next audio chunk from the queue
  const audioData = audioQueue.shift();

  try {
    // Decode the raw audio data received from the server
    const audioBuffer = await audioContext.decodeAudioData(audioData);

    // Play the decoded audio
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();

    // When this chunk finishes playing, play the next one
    source.onended = playNextAudioChunk;
  } catch (e) {
    console.error('Error decoding or playing audio:', e);
    // If there's an error, try to play the next chunk anyway
    playNextAudioChunk();
  }
}

/**
 * Immediately stops any audio that is currently playing.
 * This is used for user interruptions (barge-in).
 */
function stopPlayback() {
  // This function is now handled by the logic in `stopConversation`
  // and the onended callback of the audio source.
  // We can simplify by just clearing the queue.
  audioQueue = [];
}

/**
 * Stops the conversation, closes connections, and resets the UI.
 */
function stopConversation() {
  isRecording = false;
  talkButton.textContent = 'Start Talking';
  talkButton.classList.replace('recording', 'idle');
  statusDiv.textContent = 'Click the button to start the conversation.';

  // Stop the microphone
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }

  // Close the WebSocket connection
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
  }

  // Stop playback and close the audio context
  if (audioContext) {
    // Clear any remaining audio in the queue
    audioQueue = [];
    // Close the context to free up resources
    audioContext.close();
  }
}