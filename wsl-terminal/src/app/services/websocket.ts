import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: Socket;
  private terminalOutput$ = new Subject<string>();
  private terminalExit$ = new Subject<{ code: number }>();
  private connected$ = new Subject<boolean>();

  constructor() {
    this.socket = io('http://localhost:3000');
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to backend');
      this.connected$.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from backend');
      this.connected$.next(false);
    });

    this.socket.on('terminal-output', (data: string) => {
      this.terminalOutput$.next(data);
    });

    this.socket.on('terminal-exit', (data: { code: number }) => {
      this.terminalExit$.next(data);
    });

    this.socket.on('terminal-created', (data) => {
      console.log('Terminal created:', data);
    });
  }

  createTerminal(cols: number, rows: number) {
    this.socket.emit('create-terminal', { cols, rows });
  }

  sendInput(data: string) {
    this.socket.emit('terminal-input', data);
  }

  resizeTerminal(cols: number, rows: number) {
    this.socket.emit('terminal-resize', { cols, rows });
  }

  getTerminalOutput(): Observable<string> {
    return this.terminalOutput$.asObservable();
  }

  getTerminalExit(): Observable<{ code: number }> {
    return this.terminalExit$.asObservable();
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  disconnect() {
    this.socket.disconnect();
  }
}
