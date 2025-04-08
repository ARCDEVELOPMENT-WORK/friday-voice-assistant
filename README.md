# Friday Voice Assistant

A voice-controlled personal assistant with email capabilities, weather updates, system monitoring, and more.

## Features

- **Voice Commands**: Control using natural language voice commands
- **Email Integration**: Send emails via Gmail SMTP
- **Weather Updates**: Get current weather for any location
- **System Monitoring**: View CPU, RAM, and disk usage
- **Time/Date**: Current time and date information
- **File Operations**: Create and read files on desktop
- **Web Browsing**: Open URLs in default browser

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Arcdeveloment-work/friday-voice-assistant.git
cd friday-voice-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your credentials:
```env
GMAIL_EMAIL=your_email@gmail.com
GMAIL_PASSWORD=your_app_specific_password
OPENROUTER_API_KEY=your_openrouter_key
WEATHER_API_KEY=your_openweathermap_key
PORT=3000
DEFAULT_LOCATION=Mumbai
```

4. Start the development server:
```bash
npm run dev
```

## Usage

1. Open `http://localhost:3000` in your browser
2. Click the microphone button and speak commands
3. Example commands:
   - "What time is it?"
   - "What's the weather in London?"
   - "Send email to test@example.com subject 'Hello' body 'This is a test'"
   - "Create file test.txt"
   - "Open https://google.com"

## Email Configuration

For Gmail SMTP to work:
1. Enable "Less Secure Apps" in your Google Account settings OR
2. Create an App Password if using 2FA
3. Ensure correct credentials in `.env` file

## TODO List

### High Priority
- [ ] Fix email sending functionality (current issue)
- [ ] Add proper error handling for voice recognition
- [ ] Implement email template system
- [ ] Add contact management for emails
- [ ] Create proper authentication system

### Medium Priority
- [ ] Add calendar integration
- [ ] Implement reminders/alarms
- [ ] Add news feed integration
- [ ] Create mobile app version
- [ ] Add multi-language support

### Low Priority
- [ ] Implement voice customization
- [ ] Add dark/light mode toggle
- [ ] Create browser extension
- [ ] Add plugin system for extensions
- [ ] Implement AI model switching

## Future Updates

### Version 1.1 (Next Release)
- Email scheduling functionality
- Improved voice command accuracy
- Better error messages for failed commands
- Enhanced security for email operations

### Version 1.2
- Calendar integration with Google Calendar
- Reminder system with notifications
- Contact management system
- Email templates and signatures

### Version 2.0
- Mobile app with push notifications
- Cross-platform synchronization
- Advanced natural language processing
- Plugin architecture for extensions

## Troubleshooting

### Email Not Sending
1. Verify `.env` credentials are correct
2. Check Google Account security settings
3. Look at server console for detailed error logs
4. Test using `/api/test-email` endpoint

### Voice Recognition Issues
1. Ensure microphone permissions are granted
2. Try different browsers (Chrome works best)
3. Check console for speech recognition errors

### Port Already in Use
```bash
# Find and kill process using port 3000
netstat -ano | findstr :3000
taskkill /PID [PID] /F
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
