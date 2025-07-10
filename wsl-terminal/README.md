# WSL Terminal UI

A browser-based Linux terminal UI that interacts with WSL on Windows, featuring AI-driven suggestions and autocomplete using Ollama.

## Features

- 🖥️ Real-time WSL command execution through a web browser
- 🤖 AI-powered command explanations and suggestions using Ollama
- 📱 Modern Angular UI with Material Design
- 🔄 WebSocket communication for real-time terminal interaction
- 📖 Smart sidebar with:
  - Command explanations
  - Available options and flags
  - Safer/more efficient alternatives

## Tech Stack

- **Frontend**: Angular 17+ with Angular Material
- **Backend**: Node.js with Express and Socket.IO
- **Terminal**: xterm.js for browser-based terminal emulation
- **AI**: Ollama (local LLM) for intelligent suggestions
- **Communication**: WebSocket for real-time data streaming

## Prerequisites

1. **Windows with WSL**: Make sure WSL is installed and configured
2. **Node.js**: Version 16+ required
3. **Ollama**: Install and run Ollama locally with a model like `codellama`

### Installing Ollama

1. Install Ollama from [https://ollama.ai](https://ollama.ai)
2. Pull a model:
   ```bash
   ollama pull codellama
   ```
3. Make sure Ollama is running (usually starts automatically)

## Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the backend server:
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to the main project directory:
   ```bash
   cd wsl-terminal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Angular development server:
   ```bash
   ng serve
   ```
   The frontend will run on `http://localhost:4200`

## Usage

1. **Start the Backend**: Run the Node.js server first
2. **Start the Frontend**: Launch the Angular development server
3. **Open Browser**: Navigate to `http://localhost:4200`
4. **Use Terminal**: 
   - Type commands in the terminal interface
   - The AI sidebar will provide real-time suggestions
   - Commands are executed in WSL environment

## AI Features

The AI assistant provides:

- **Command Explanations**: Detailed breakdown of what commands do
- **Options & Flags**: Available parameters and their usage
- **Alternatives**: Safer or more efficient command suggestions
- **Auto-completion**: Smart suggestions based on partial input

## Project Structure

```
wsl-terminal/
├── src/app/
│   ├── components/
│   │   └── terminal/          # Terminal component with xterm.js
│   ├── services/
│   │   ├── websocket.ts       # WebSocket communication
│   │   ├── ollama.ts          # Ollama AI integration
│   │   └── command-tracker.ts # Command analysis and tracking
│   └── app.component.*        # Main app with sidebar
├── backend/
│   ├── server.js              # Express + Socket.IO server
│   └── package.json           # Backend dependencies
└── README.md
```

## Development

### Adding New AI Features

1. **Extend OllamaService**: Add new methods for different types of analysis
2. **Update CommandTrackerService**: Integrate new AI capabilities
3. **Modify UI**: Add new sections to the sidebar for new features

### Customizing Terminal

- Edit `terminal.component.ts` to modify terminal behavior
- Update `terminal.scss` for styling changes
- Adjust xterm.js configuration in the component

## Troubleshooting

### Common Issues

1. **WSL Not Working**: Ensure WSL is properly installed and accessible
2. **Ollama Connection Failed**: Check if Ollama is running on port 11434
3. **Backend Connection Issues**: Verify Node.js server is running on port 3000
4. **WebSocket Errors**: Check firewall settings and CORS configuration

### Debugging

- Check browser console for frontend errors
- Check Node.js server logs for backend issues
- Verify Ollama is accessible: `curl http://localhost:11434/api/tags`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use and modify as needed.