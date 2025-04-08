require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const fs = require('fs');
const path = require('path');
const os = require('os');
const si = require('systeminformation');
const { exec } = require('child_process');
const open = require('open');
const nodemailer = require('nodemailer');

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Conversation logging
function logConversation(user, assistant) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - User: ${user}\n${timestamp} - Assistant: ${assistant}\n\n`;
  const logFile = path.join(logsDir, `conversation_${new Date().toISOString().split('T')[0]}.txt`);
  
  fs.appendFileSync(logFile, logEntry, 'utf8');
  return logEntry;
}

// Time utility function
function getCurrentTime() {
  const now = new Date();
  return {
    time: now.toLocaleTimeString(),
    date: now.toLocaleDateString(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
    timeOfDay: now.getHours() < 12 ? 'morning' : 
               now.getHours() < 17 ? 'afternoon' : 
               now.getHours() < 20 ? 'evening' : 'night'
  };
}

// OpenRouter API integration
async function getAIResponse(prompt) {
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: "openai/gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter error:', error);
    return "Sorry, I encountered an error processing your request.";
  }
}

// Time utility function
function getCurrentTime() {
  const now = new Date();
  return {
    time: now.toLocaleTimeString(),
    date: now.toLocaleDateString(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
    timeOfDay: now.getHours() < 12 ? 'morning' : 
               now.getHours() < 17 ? 'afternoon' : 
               now.getHours() < 20 ? 'evening' : 'night'
  };
}

// Enhanced weather API integration
async function getWeather(location) {
  try {
    // Clean up location input
    let targetLocation = location ? location.trim() : null;
    
    // If no location provided or invalid, use default
    if (!targetLocation) {
      targetLocation = process.env.DEFAULT_LOCATION || 'Mumbai';
    }
    
    // Remove any "in" prefix if present (e.g., "in Mumbai" -> "Mumbai")
    targetLocation = targetLocation.replace(/^in\s+/i, '');
    
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(targetLocation)}&appid=${process.env.WEATHER_API_KEY}&units=metric`
    );
    
    const weather = response.data;
    const timeInfo = getCurrentTime();
    
    return {
      location: weather.name,
      country: weather.sys.country,
      description: weather.weather[0].description,
      temperature: Math.round(weather.main.temp),
      feels_like: Math.round(weather.main.feels_like),
      humidity: weather.main.humidity,
      wind_speed: weather.wind.speed,
      time: timeInfo,
      sunrise: new Date(weather.sys.sunrise * 1000).toLocaleTimeString(),
      sunset: new Date(weather.sys.sunset * 1000).toLocaleTimeString()
    };
  } catch (error) {
    console.error('Weather API error:', error.response?.data || error.message);
    return {
      error: true,
      message: error.response?.data?.message || "Couldn't fetch weather information. Please specify a valid city name.",
      time: getCurrentTime()
    };
  }
}

// Simplify weather response
async function getWeatherResponse(weatherInfo) {
  if (weatherInfo.error) {
    return weatherInfo.message;
  }

  return `Current weather in ${weatherInfo.location}, ${weatherInfo.country}: ${weatherInfo.description}. Temperature is ${weatherInfo.temperature}°C (feels like ${weatherInfo.feels_like}°C) with ${weatherInfo.humidity}% humidity and wind speed of ${weatherInfo.wind_speed}m/s. Sunrise at ${weatherInfo.sunrise} and sunset at ${weatherInfo.sunset}.`;
}

// Email configuration using Nodemailer with debug logging
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASSWORD
  },
  logger: true,
  debug: true
});

// Enhanced email sending function with detailed error handling
async function sendEmail(to, subject, body) {
  try {
    console.log('Attempting to send email with config:', {
      service: 'gmail',
      user: process.env.GMAIL_EMAIL,
      password: process.env.GMAIL_PASSWORD ? '***' : 'MISSING'
    });

    const mailOptions = {
      from: process.env.GMAIL_EMAIL,
      to: to,
      subject: subject,
      text: body
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Detailed email error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      response: error.response
    });
    return {
      success: false,
      error: error.message,
      details: {
        code: error.code,
        response: error.response
      }
    };
  }
}

// Test email endpoint
app.post('/api/test-email', async (req, res) => {
  try {
    const result = await sendEmail(
      req.body.to || 'test@example.com',
      req.body.subject || 'Test Email',
      req.body.body || 'This is a test email from the server'
    );
    
    if (result.success) {
      res.status(200).json({ 
        success: true,
        message: `Email sent successfully to ${req.body.to || 'test@example.com'}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

// Modified email endpoint for basic auth
app.get('/api/emails', (req, res) => {
  res.status(200).json({
    message: 'Email monitoring requires Gmail API. Using basic SMTP for sending only.'
  });
});

// Simple auth endpoint (just for UI consistency)
app.get('/auth/google', (req, res) => {
  res.send('Using basic SMTP authentication. Email sending is ready if credentials are configured.');
});

// Socket.io for real-time communication
io.on('connection', (socket) => {
  console.log('Client connected');

  let conversationHistory = [];
  
  // Send initial time and weather data
  const sendTimeAndWeather = async () => {
    const timeInfo = getCurrentTime();
    const weatherInfo = await getWeather();
    socket.emit('timeUpdate', timeInfo);
    socket.emit('weatherUpdate', weatherInfo);
  };
  
  // Send time and weather immediately on connection
  sendTimeAndWeather();
  
  // Update time every second
  const timeInterval = setInterval(() => {
    socket.emit('timeUpdate', getCurrentTime());
  }, 1000);
  
  // Update weather every 5 minutes
  const weatherInterval = setInterval(async () => {
    const weatherInfo = await getWeather();
    socket.emit('weatherUpdate', weatherInfo);
  }, 300000);

  socket.on('processCommand', async (data) => {
    let response;
    const command = data.command.toLowerCase();
    
    if (command.includes('send email') || command.includes('send mail')) {
      try {
        // Extract email details using regex
        const toMatch = command.match(/to\s+([^\s]+@[^\s]+)/);
        const subjectMatch = command.match(/subject\s+"([^"]+)"/);
        const bodyMatch = command.match(/body\s+"([^"]+)"/);

        if (!toMatch || !subjectMatch || !bodyMatch) {
          response = "Please provide email details in the format: send email to recipient@example.com subject \"Your Subject\" body \"Your Message\"";
        } else {
          const to = toMatch[1];
          const subject = subjectMatch[1];
          const body = bodyMatch[1];

          const result = await sendEmail(to, subject, body);
          
          if (result.success) {
            response = `Email sent successfully to ${to}!`;
          } else {
            response = `Failed to send email: ${result.error}`;
          }
        }
      } catch (error) {
        console.error('Email command error:', error);
        response = "Sorry, I encountered an error processing your email request.";
      }
    }
    else if (command.includes('time')) {
      const timeInfo = getCurrentTime();
      const timeResponse = `It's ${timeInfo.time} on ${timeInfo.date}. Good ${timeInfo.timeOfDay}!`;
      response = timeResponse;
    }
    else if (command.includes('weather')) {
      const location = command.split('weather')[1].trim();
      const weatherInfo = await getWeather(location);
      response = await getWeatherResponse(weatherInfo);
    }
    else if (command.includes('open') && command.includes('http')) {
      const url = command.match(/https?:\/\/[^\s]+/)[0];
      openWebsite(url);
      response = `Opening ${url} for you, ${userName}.`;
    }
    else if (command.includes('create file')) {
      const fileName = command.split('create file')[1].trim();
      const desktopPath = path.join(os.homedir(), 'Desktop', fileName);
      fs.writeFileSync(desktopPath, '');
      response = `Created file ${fileName} on your desktop, ${userName}.`;
    }
    else if (command.includes('read file')) {
      const fileName = command.split('read file')[1].trim();
      const desktopPath = path.join(os.homedir(), 'Desktop', fileName);
      if (fs.existsSync(desktopPath)) {
        const content = fs.readFileSync(desktopPath, 'utf8');
        response = `Contents of ${fileName}:\n${content}`;
      } else {
        response = `File ${fileName} not found on desktop, ${userName}.`;
      }
    }
    else if (command.includes('system') || command.includes('stats')) {
      const stats = await getSystemStats();
      const statsResponse = `System status:\nCPU: ${stats.cpu.currentLoad.toFixed(1)}%\nRAM: ${(stats.mem.used / 1024 / 1024 / 1024).toFixed(1)}GB used\nDisk: ${stats.disk[0].use.toFixed(1)}% full`;
      response = statsResponse;
    }
    else {
      // Default AI response
      response = await getAIResponse(data.command);
    }
    
    const logEntry = logConversation(data.command, response);
    conversationHistory.push({
      user: data.command,
      assistant: response,
      timestamp: new Date().toISOString()
    });
    
    socket.emit('assistantResponse', { 
      text: response,
      history: conversationHistory 
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    clearInterval(timeInterval);
    clearInterval(weatherInterval);
  });
});

// System monitoring
async function getSystemStats() {
  return {
    cpu: await si.currentLoad(),
    mem: await si.mem(),
    disk: await si.fsSize(),
    network: await si.networkStats(),
    osInfo: await si.osInfo(),
    time: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString()
  };
}

// File operations
function handleFileOperation(command) {
  const desktopPath = path.join(os.homedir(), 'Desktop');
  // Implementation for file operations
}

// Web browsing
function openWebsite(url) {
  open(url);
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  const stats = await getSystemStats();
  io.emit('systemStats', stats);
});

// Send periodic system updates
setInterval(async () => {
  const stats = await getSystemStats();
  io.emit('systemStats', stats);
}, 5000);
