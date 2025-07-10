import { Component, ElementRef, OnDestroy, OnInit, ViewChild, HostListener } from '@angular/core';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { WebsocketService } from '../services/websocket';
import { CommandTrackerService } from '../services/command-tracker';
import { AutocompleteService } from '../services/autocomplete';
import { CommandHelpService } from '../services/command-help';
import { CommandHelpPanelComponent } from './command-help-panel';
import { NaturalInputComponent } from './natural-input';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-terminal',
  imports: [CommandHelpPanelComponent, NaturalInputComponent, CommonModule],
  templateUrl: './terminal.html',
  styleUrl: './terminal.scss'
})
export class TerminalComponent implements OnInit, OnDestroy {
  @ViewChild('terminalContainer', { static: false }) terminalContainer!: ElementRef;
  @ViewChild('terminalOutput', { static: true }) terminalOutput!: ElementRef;
  
  private terminal!: Terminal;
  isNaturalLanguageMode: boolean = true;
  private fitAddon!: FitAddon;
  private webLinksAddon!: WebLinksAddon;
  private searchAddon!: SearchAddon;
  private subscriptions: Subscription[] = [];
  currentInput: string = '';
  private cursorPosition: number = 0;
  
  currentCommand: string = '';
  showCommandHelp: boolean = false;
  helpPanelPosition: { top: number; left: number } = { top: 0, left: 0 };
  private helpTimeout: any;

  constructor(
    private websocketService: WebsocketService,
    private commandTracker: CommandTrackerService,
    private autocompleteService: AutocompleteService,
    private commandHelpService: CommandHelpService
  ) {}

  ngOnInit() {
    this.setupWebSocketListeners();
    
    if (this.isNaturalLanguageMode) {
      this.initializeBackendConnection();
    } else {
      this.initializeTerminal();
    }
  }

  ngOnDestroy() {
    this.terminal?.dispose();
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.websocketService.disconnect();
  }

  private initializeTerminal() {
    if (!this.terminalContainer) {
      console.error('Terminal container not found');
      return;
    }
    
    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff'
      },
      cols: 80,
      rows: 24
    });

    this.fitAddon = new FitAddon();
    this.webLinksAddon = new WebLinksAddon();
    this.searchAddon = new SearchAddon();

    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(this.webLinksAddon);
    this.terminal.loadAddon(this.searchAddon);

    this.terminal.open(this.terminalContainer.nativeElement);
    this.fitAddon.fit();

    this.terminal.onData(data => {
      this.handleInput(data);
    });

    this.terminal.onResize(({ cols, rows }) => {
      this.websocketService.resizeTerminal(cols, rows);
    });

    window.addEventListener('resize', () => {
      this.fitAddon.fit();
    });

    setTimeout(() => {
      this.websocketService.createTerminal(this.terminal.cols, this.terminal.rows);
    }, 100);
  }

  private initializeBackendConnection() {
    console.log('Initializing backend connection for natural language mode');
    setTimeout(() => {
      this.websocketService.createTerminal(80, 24);
    }, 100);
  }

  private setupWebSocketListeners() {
    const outputSub = this.websocketService.getTerminalOutput().subscribe(data => {
      if (this.isNaturalLanguageMode) {
        this.displayCommandOutput(data);
      } else if (this.terminal) {
        this.terminal.write(data);
      }
      this.commandTracker.trackInput(data);
    });

    const exitSub = this.websocketService.getTerminalExit().subscribe(({ code }) => {
      if (this.terminal) {
        this.terminal.write(`\r\nTerminal exited with code ${code}\r\n`);
      }
    });

    const connectionSub = this.websocketService.getConnectionStatus().subscribe(connected => {
      if (connected) {
        console.log('WebSocket connected');
      } else {
        if (this.terminal) {
          this.terminal.write('\r\nConnection lost. Reconnecting...\r\n');
        }
      }
    });

    this.subscriptions.push(outputSub, exitSub, connectionSub);
  }

  private handleInput(data: string) {
    if (data === '\u0008') {
      this.toggleCommandHelp();
      return;
    }

    if (data === '\t') {
      return;
    }

    if (data === '\u001b[A' || data === '\u001b[B') {
      this.websocketService.sendInput(data);
      return;
    }

    if (data === '\u001b') {
      this.hideCommandHelp();
      return;
    }

    if (data === '\r') {
      this.hideCommandHelp();
      this.commandTracker.executeCommand(this.currentInput);
      this.currentInput = '';
      this.cursorPosition = 0;
      this.websocketService.sendInput(data);
      return;
    }

    if (data === '\u007F') {
      if (this.currentInput.length > 0) {
        this.currentInput = this.currentInput.slice(0, -1);
        this.cursorPosition = Math.max(0, this.cursorPosition - 1);
        this.commandTracker.updateCurrentInput(this.currentInput);
        this.websocketService.sendInput(data);
        this.updateCommandHelp();
      }
      return;
    }

    if (data >= ' ') {
      this.currentInput += data;
      this.cursorPosition++;
      this.commandTracker.updateCurrentInput(this.currentInput);
      this.websocketService.sendInput(data);
      this.updateCommandHelp();
      return;
    }

    this.websocketService.sendInput(data);
  }

  applySuggestion(suggestion: string) {
    if (this.currentInput) {
      this.terminal.write('\r\u001b[K');
    }

    const parts = this.currentInput.trim().split(/\s+/);
    const isFirstWord = parts.length <= 1;
    
    if (isFirstWord) {
      this.currentInput = suggestion + ' ';
      this.websocketService.sendInput(suggestion + ' ');
    } else if (suggestion.startsWith('-')) {
      this.currentInput += suggestion + ' ';
      this.websocketService.sendInput(suggestion + ' ');
    } else {
      parts[parts.length - 1] = suggestion;
      const newInput = parts.join(' ') + ' ';
      const toSend = newInput.substring(this.currentInput.length);
      this.currentInput = newInput;
      this.websocketService.sendInput(toSend);
    }
    
    this.cursorPosition = this.currentInput.length;
    this.updateCommandHelp();
  }

  private updateCommandHelp() {
    if (this.helpTimeout) {
      clearTimeout(this.helpTimeout);
    }

    this.helpTimeout = setTimeout(() => {
      const command = this.currentInput.trim().split(' ')[0];
      if (command && this.commandHelpService.getCommandHelp(command)) {
        this.currentCommand = command;
        this.updateHelpPanelPosition();
        this.showCommandHelp = true;
      } else {
        this.hideCommandHelp();
      }
    }, 300);
  }

  private updateHelpPanelPosition() {
    if (this.terminalContainer) {
      const terminalRect = this.terminalContainer.nativeElement.getBoundingClientRect();
      this.helpPanelPosition = {
        top: terminalRect.top + 50,
        left: terminalRect.right + 10
      };
    }
  }

  private toggleCommandHelp() {
    if (this.showCommandHelp) {
      this.hideCommandHelp();
    } else {
      const command = this.currentInput.trim().split(' ')[0];
      if (command && this.commandHelpService.getCommandHelp(command)) {
        this.currentCommand = command;
        this.updateHelpPanelPosition();
        this.showCommandHelp = true;
      }
    }
  }

  hideCommandHelp() {
    this.showCommandHelp = false;
    if (this.helpTimeout) {
      clearTimeout(this.helpTimeout);
    }
  }

  toggleMode(naturalMode: boolean) {
    this.isNaturalLanguageMode = naturalMode;
    
    if (!naturalMode && !this.terminal) {
      setTimeout(() => {
        this.initializeTerminal();
      }, 100);
    }
  }

  executeNaturalCommand(command: string) {
    console.log('Executing natural command:', command);
    
    this.displayCommandExecution(command);
    
    if (!this.websocketService.isConnected()) {
      console.log('WebSocket not connected, initializing...');
      this.initializeBackendConnection();
      
      setTimeout(() => {
        this.websocketService.sendInput(command + '\r');
      }, 500);
    } else {
      this.websocketService.sendInput(command + '\r');
    }
  }

  private displayCommandExecution(command: string) {
    if (this.terminalOutput) {
      const timestamp = new Date().toLocaleTimeString();
      const commandElement = document.createElement('div');
      commandElement.innerHTML = `
        <div style="color: #7cc7ff; font-family: 'Consolas', 'Monaco', monospace; margin: 15px 0; padding: 15px; background: #2a2a2a; border-radius: 8px; border-left: 4px solid #7cc7ff; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
          <div style="color: #888; font-size: 12px; margin-bottom: 6px;">
            <span style="color: #ffd700;">⚡</span> Executing at ${timestamp}
          </div>
          <div style="color: #98d982; font-size: 14px; font-weight: 500;">$ ${command}</div>
          <div style="color: #888; font-size: 11px; margin-top: 6px; font-style: italic;">Output will appear below...</div>
        </div>
      `;
      this.terminalOutput.nativeElement.appendChild(commandElement);
      
      this.terminalOutput.nativeElement.scrollTop = this.terminalOutput.nativeElement.scrollHeight;
    }
  }

  private displayCommandOutput(data: string) {
    if (this.terminalOutput && data.trim()) {
      // Remove ANSI escape sequences and terminal prompts
      let cleanData = data.replace(/\x1b\[[0-9;]*m/g, '');
      
      // Remove common terminal prompts (user@host:path$ format)
      cleanData = cleanData.replace(/^[^@]+@[^:]+:[^$]*\$\s*/gm, '');
      
      // Skip if empty after cleaning or just prompt characters
      if (!cleanData.trim() || cleanData.match(/^[\s$~]*$/)) {
        return;
      }
      
      const outputElement = document.createElement('div');
      outputElement.style.cssText = `
        color: #e0e0e0;
        font-family: 'Consolas', 'Monaco', monospace;
        white-space: pre-wrap;
        margin: 8px 0;
        padding: 12px;
        background: #0a0a0a;
        border: 1px solid #333;
        border-radius: 6px;
        font-size: 14px;
        line-height: 1.5;
        border-left: 4px solid #4CAF50;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      `;
      
      outputElement.textContent = cleanData;
      
      this.terminalOutput.nativeElement.appendChild(outputElement);
      
      this.terminalOutput.nativeElement.scrollTop = this.terminalOutput.nativeElement.scrollHeight;
      
      console.log('Output displayed:', cleanData);
    }
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(event: any) {
    if (this.terminal && this.fitAddon) {
      this.fitAddon.fit();
    }
    if (this.showCommandHelp) {
      this.updateHelpPanelPosition();
    }
  }
}