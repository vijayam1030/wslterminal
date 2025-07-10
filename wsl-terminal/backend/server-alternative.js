const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const terminals = {};

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'WSL Terminal Backend is running' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create-terminal', (data) => {
    try {
      console.log('Creating terminal for client:', socket.id);
      
      // Use WSL for Windows
      const terminal = spawn('wsl.exe', ['-e', 'bash'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false
      });

      terminals[socket.id] = terminal;

      // Send initial prompt
      socket.emit('terminal-output', '\x1b[32mWSL Terminal Ready\x1b[0m\r\n$ ');

      terminal.stdout.on('data', (data) => {
        socket.emit('terminal-output', data.toString());
      });

      terminal.stderr.on('data', (data) => {
        socket.emit('terminal-output', data.toString());
      });

      terminal.on('exit', (code) => {
        console.log(`Terminal ${socket.id} exited with code ${code}`);
        delete terminals[socket.id];
        socket.emit('terminal-exit', { code });
      });

      terminal.on('error', (error) => {
        console.error('Terminal error:', error);
        socket.emit('terminal-output', `\r\nError: ${error.message}\r\n`);
      });

      socket.emit('terminal-created', {
        id: socket.id,
        message: 'Terminal created successfully'
      });

    } catch (error) {
      console.error('Failed to create terminal:', error);
      socket.emit('terminal-output', `\r\nFailed to create WSL terminal: ${error.message}\r\n`);
      socket.emit('terminal-output', 'Make sure WSL is installed and configured.\r\n');
    }
  });

  socket.on('terminal-input', (data) => {
    const terminal = terminals[socket.id];
    if (terminal && terminal.stdin) {
      terminal.stdin.write(data);
    }
  });

  socket.on('terminal-resize', (data) => {
    // Note: child_process doesn't support resize like node-pty
    // This is a limitation of the alternative approach
    console.log('Resize requested but not supported with child_process');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const terminal = terminals[socket.id];
    if (terminal) {
      terminal.kill();
      delete terminals[socket.id];
    }
  });
});

server.listen(PORT, () => {
  console.log(`WSL Terminal Backend running on port ${PORT}`);
  console.log('Note: Using child_process fallback (resize not supported)');
});