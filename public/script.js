const socket = io();
const micButton = document.getElementById('micButton');
const voiceAnimation = document.getElementById('voiceAnimation');
const waves = document.querySelectorAll('.wave');

// Create status element if it doesn't exist
let statusElement = document.getElementById('status');
if (!statusElement) {
  statusElement = document.createElement('div');
  statusElement.id = 'status';
  statusElement.className = 'status-text';
  document.querySelector('.header').appendChild(statusElement);
}

let recognition;
let isListening = false;
let isSpeaking = false;
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;

// DOM Elements
const commandInput = document.getElementById('command-input');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.getElementById('chat-messages');
const currentTime = document.getElementById('current-time');
const currentWeather = document.getElementById('current-weather');
const cpuUsage = document.getElementById('cpu-usage');
const ramUsage = document.getElementById('ram-usage');
const diskUsage = document.getElementById('disk-usage');

// Initialize speech recognition
function initSpeechRecognition() {
  try {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      statusElement.textContent = 'Listening...';
      voiceAnimation.classList.add('listening');
      console.log('Speech recognition started');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      statusElement.textContent = `Processing: "${transcript}"`;
      console.log('Speech recognition result:', transcript);
      
      // Add user message to chat
      messagesContainer.appendChild(createMessageElement(transcript, true));
      scrollToBottom();
      
      // Send command to server
      socket.emit('processCommand', { command: transcript });
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      statusElement.textContent = 'Error occurred. Click mic to try again.';
      resetState();
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      if (isListening) {
        recognition.start(); // Continue listening
      } else {
        resetState();
      }
    };
    
    return true;
  } catch (error) {
    console.error('Speech recognition not supported:', error);
    statusElement.textContent = 'Speech recognition not supported in this browser';
    return false;
  }
}

// Handle assistant responses
socket.on('assistantResponse', (data) => {
  console.log('Received assistant response:', data);
  messagesContainer.appendChild(createMessageElement(data.text));
  scrollToBottom();
  
  // Speak the response if available
  if (data.text) {
    speakResponse(data.text);
  }
});

// Update conversation UI
function updateConversationUI(history) {
  if (!history || !Array.isArray(history)) return;
  
  messagesContainer.innerHTML = '';
  
  history.forEach(msg => {
    if (msg.user) {
      const userMsg = document.createElement('div');
      userMsg.className = 'message user-message';
      userMsg.innerHTML = `
        <div>${msg.user}</div>
        <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
      `;
      messagesContainer.appendChild(userMsg);
    }

    if (msg.assistant) {
      const assistantMsg = document.createElement('div');
      assistantMsg.className = 'message assistant-message';
      assistantMsg.innerHTML = `
        <div>${msg.assistant}</div>
        <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
      `;
      messagesContainer.appendChild(assistantMsg);
    }
  });

  // Scroll to bottom
  scrollToBottom();
}

// Speak the response
function speakResponse(text) {
  if (!text) return;
  
  if (currentUtterance) {
    speechSynthesis.cancel();
  }

  isSpeaking = true;
  isListening = false;
  statusElement.textContent = 'Speaking...';
  voiceAnimation.classList.remove('listening');
  voiceAnimation.classList.add('speaking');

  currentUtterance = new SpeechSynthesisUtterance(text);
  
  // Try to find a suitable voice
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    // First try to find an English male voice
    let selectedVoice = voices.find(voice => 
      voice.lang.includes('en') && voice.name.toLowerCase().includes('male')
    );
    
    // If no male voice, try any English voice
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => voice.lang.includes('en'));
    }
    
    // If still no voice, use the first available voice
    if (!selectedVoice) {
      selectedVoice = voices[0];
    }
    
    if (selectedVoice) {
      currentUtterance.voice = selectedVoice;
    }
  }
  
  currentUtterance.pitch = 1;
  currentUtterance.rate = 1;

  currentUtterance.onend = () => {
    isSpeaking = false;
    if (!isListening) {
      // statusElement.textContent = 'Click the mic to speak';
      statusElement.textContent = 'Click the mic to speak';
      voiceAnimation.classList.remove('speaking');
    }
  };

  currentUtterance.onerror = (event) => {
    console.error('Speech synthesis error:', event);
    isSpeaking = false;
    statusElement.textContent = 'Speech error. Click mic to try again.';
    voiceAnimation.classList.remove('speaking');
  };

  try {
    speechSynthesis.speak(currentUtterance);
  } catch (error) {
    console.error('Speech synthesis failed:', error);
    isSpeaking = false;
    statusElement.textContent = 'Speech error. Click mic to try again.';
    voiceAnimation.classList.remove('speaking');
  }
}

// Reset UI state
function resetState() {
  isListening = false;
  voiceAnimation.classList.remove('listening', 'speaking');
  if (!isSpeaking) {
    statusElement.textContent = 'Click the mic to speak';
  }
}

// Microphone button click handler
micButton.addEventListener('click', () => {
  console.log('Mic button clicked');
  
  if (isSpeaking) {
    speechSynthesis.cancel();
    isSpeaking = false;
  }

  if (!isListening) {
    if (!recognition) {
      const success = initSpeechRecognition();
      if (!success) return;
    }
    recognition.start();
  } else {
    isListening = false;
    recognition.stop();
    resetState();
  }
});

// Initialize speech synthesis when voices are loaded
if (speechSynthesis) {
  // Load voices immediately if available
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    console.log('Voices loaded:', voices.length);
  }

  // Also listen for voices being loaded
  speechSynthesis.onvoiceschanged = () => {
    console.log('Voices loaded:', speechSynthesis.getVoices().length);
  };
}

// Helper function to create message elements
function createMessageElement(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
    messageDiv.textContent = text;
    return messageDiv;
}

// Function to scroll chat to bottom
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Handle command submission
function sendCommand() {
    const command = commandInput.value.trim();
    if (command) {
        console.log('Sending command:', command);
        
        // Add user message to chat
        messagesContainer.appendChild(createMessageElement(command, true));
        scrollToBottom();

        // Send command to server
        socket.emit('processCommand', { command });

        // Clear input
        commandInput.value = '';
    }
}

// Event listeners
if (sendButton) {
  sendButton.addEventListener('click', sendCommand);
}

if (commandInput) {
  commandInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendCommand();
    }
  });
}

// Socket event handlers
socket.on('timeUpdate', (timeInfo) => {
    if (currentTime && timeInfo && timeInfo.time) {
      currentTime.textContent = timeInfo.time;
    }
});

socket.on('weatherUpdate', (weatherInfo) => {
    if (currentWeather && weatherInfo) {
      if (!weatherInfo.error) {
        currentWeather.textContent = `${weatherInfo.temperature}°C in ${weatherInfo.location}`;
      } else {
        currentWeather.textContent = 'Weather unavailable';
      }
    }
});

socket.on('systemStats', (stats) => {
    if (stats) {
      if (cpuUsage && stats.cpu && stats.cpu.currentLoad) {
        cpuUsage.textContent = `${stats.cpu.currentLoad.toFixed(1)}%`;
      }
      
      if (ramUsage && stats.mem && stats.mem.used) {
        ramUsage.textContent = `${(stats.mem.used / 1024 / 1024 / 1024).toFixed(1)} GB`;
      }
      
      if (diskUsage && stats.disk && stats.disk[0] && stats.disk[0].use) {
        diskUsage.textContent = `${stats.disk[0].use.toFixed(1)}%`;
      }
    }
});

// Initialize the UI
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing UI');
  
  // Add a welcome message
  const welcomeMessage = "Hello, I'm Friday. How can I assist you today?";
  messagesContainer.appendChild(createMessageElement(welcomeMessage));
  
  // Set initial status
  statusElement.textContent = 'Click the mic to speak';
  
  // Initialize speech recognition
  initSpeechRecognition();
});
