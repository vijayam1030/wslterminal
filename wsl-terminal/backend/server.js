const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const pty = require('node-pty');
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
const logs = {};

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'WSL Terminal Backend is running' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create-terminal', (data) => {
    const { cols, rows } = data;
    
    const shell = process.platform === 'win32' ? 'wsl.exe' : 'bash';
    const args = process.platform === 'win32' ? [] : [];
    
    const terminal = pty.spawn(shell, args, {
      name: 'xterm-color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: process.env.HOME,
      env: process.env
    });

    terminals[socket.id] = terminal;
    logs[socket.id] = [];

    terminal.on('data', (data) => {
      if (logs[socket.id]) {
        logs[socket.id].push(data);
      }
      socket.emit('terminal-output', data);
    });

    terminal.on('exit', (code) => {
      console.log(`Terminal ${socket.id} exited with code ${code}`);
      delete terminals[socket.id];
      delete logs[socket.id];
      socket.emit('terminal-exit', { code });
    });

    socket.emit('terminal-created', {
      id: socket.id,
      message: 'Terminal created successfully'
    });
  });

  socket.on('terminal-input', (data) => {
    const terminal = terminals[socket.id];
    if (terminal) {
      terminal.write(data);
    }
  });

  socket.on('terminal-resize', (data) => {
    const terminal = terminals[socket.id];
    if (terminal) {
      terminal.resize(data.cols, data.rows);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const terminal = terminals[socket.id];
    if (terminal) {
      terminal.kill();
      delete terminals[socket.id];
      delete logs[socket.id];
    }
  });
});

server.listen(PORT, () => {
  console.log(`WSL Terminal Backend running on port ${PORT}`);
});