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
  isNaturalLanguageMode: boolean = true; // Default to natural language mode
  private fitAddon!: FitAddon;
  private webLinksAddon!: WebLinksAddon;
  private searchAddon!: SearchAddon;
  private subscriptions: Subscription[] = [];
  currentInput: string = '';
  private cursorPosition: number = 0;
  
  // Help panel properties
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
    // Only initialize terminal if not in natural language mode
    if (!this.isNaturalLanguageMode) {
      this.initializeTerminal();
      this.setupWebSocketListeners();
    } else {
      // Still need to setup WebSocket listeners for natural language mode
      this.setupWebSocketListeners();
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

  private setupWebSocketListeners() {
    const outputSub = this.websocketService.getTerminalOutput().subscribe(data => {
      if (this.isNaturalLanguageMode) {
        // In natural language mode, display output in our custom output area
        this.displayCommandOutput(data);
      } else if (this.terminal) {
        // In terminal mode, write to xterm
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
    // Handle Ctrl+H for help
    if (data === '\u0008') {
      this.toggleCommandHelp();
      return;
    }

    // Handle tab completion - now integrated with side panel
    if (data === '\t') {
      // Tab completion will be handled by the suggestions panel
      return;
    }

    // Handle arrow keys for navigation
    if (data === '\u001b[A' || data === '\u001b[B') {
      this.websocketService.sendInput(data);
      return;
    }

    // Clear on escape
    if (data === '\u001b') {
      this.hideCommandHelp();
      return;
    }

    // Handle enter
    if (data === '\r') {
      this.hideCommandHelp();
      this.commandTracker.executeCommand(this.currentInput);
      this.currentInput = '';
      this.cursorPosition = 0;
      this.websocketService.sendInput(data);
      return;
    }

    // Handle backspace
    if (data === '\u007F') {
      if (this.currentInput.length > 0) {
        this.currentInput = this.currentInput.slice(0, -1);
        this.cursorPosition = Math.max(0, this.cursorPosition - 1);
        console.log('After backspace:', this.currentInput); // Debug log
        this.commandTracker.updateCurrentInput(this.currentInput); // Direct update
        this.websocketService.sendInput(data);
        this.updateCommandHelp();
      }
      return;
    }

    // Handle printable characters
    if (data >= ' ') {
      this.currentInput += data;
      this.cursorPosition++;
      console.log('Current input:', this.currentInput); // Debug log
      this.commandTracker.updateCurrentInput(this.currentInput); // Direct update
      this.websocketService.sendInput(data);
      this.updateCommandHelp();
      return;
    }

    // For other control characters, just pass through
    this.websocketService.sendInput(data);
  }

  applySuggestion(suggestion: string) {
    // Clear current input from terminal
    if (this.currentInput) {
      const clearLength = this.currentInput.length;
      // Move cursor to beginning of current input and clear it
      this.terminal.write('\r\u001b[K');
      // Restore prompt if needed
      // Note: This might need adjustment based on your shell prompt
    }

    // Handle different types of suggestions
    const parts = this.currentInput.trim().split(/\s+/);
    const isFirstWord = parts.length <= 1;
    
    if (isFirstWord) {
      // Complete command
      this.currentInput = suggestion + ' ';
      this.websocketService.sendInput(suggestion + ' ');
    } else if (suggestion.startsWith('-')) {
      // Add option/flag
      this.currentInput += suggestion + ' ';
      this.websocketService.sendInput(suggestion + ' ');
    } else {
      // Replace last word with suggestion
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
    }, 300); // Reduced delay to 300ms for faster help display
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
      // Initialize terminal when switching to terminal mode
      setTimeout(() => {
        this.initializeTerminal();
        this.setupWebSocketListeners();
      }, 100);
    }
  }

  executeNaturalCommand(command: string) {
    console.log('Executing natural command:', command);
    
    // Show the command being executed
    this.displayCommandExecution(command);
    
    // Execute the command through WebSocket
    this.websocketService.sendInput(command + '\r');
  }

  private displayCommandExecution(command: string) {
    if (this.terminalOutput) {
      const timestamp = new Date().toLocaleTimeString();
      const commandElement = document.createElement('div');
      commandElement.innerHTML = `
        <div style="color: #7cc7ff; font-family: monospace; margin: 10px 0; padding: 10px; background: #2a2a2a; border-radius: 4px; border-left: 3px solid #7cc7ff;">
          <div style="color: #888; font-size: 12px;">${timestamp}</div>
          <div style="color: #98d982; margin-top: 4px;">$ ${command}</div>
        </div>
      `;
      this.terminalOutput.nativeElement.appendChild(commandElement);
      
      // Auto-scroll to bottom
      this.terminalOutput.nativeElement.scrollTop = this.terminalOutput.nativeElement.scrollHeight;
    }
  }

  private displayCommandOutput(data: string) {
    if (this.terminalOutput) {
      // Create output element
      const outputElement = document.createElement('div');
      outputElement.style.cssText = `
        color: #e0e0e0;
        font-family: monospace;
        white-space: pre-wrap;
        margin: 5px 0;
        padding: 8px;
        background: #1a1a1a;
        border-radius: 4px;
        font-size: 13px;
        line-height: 1.4;
      `;
      
      // Clean and format the output
      const cleanData = data.replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI codes
      outputElement.textContent = cleanData;
      
      this.terminalOutput.nativeElement.appendChild(outputElement);
      
      // Auto-scroll to bottom
      this.terminalOutput.nativeElement.scrollTop = this.terminalOutput.nativeElement.scrollHeight;
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