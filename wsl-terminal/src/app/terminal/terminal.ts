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
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-terminal',
  imports: [CommandHelpPanelComponent],
  templateUrl: './terminal.html',
  styleUrl: './terminal.scss'
})
export class TerminalComponent implements OnInit, OnDestroy {
  @ViewChild('terminalContainer', { static: true }) terminalContainer!: ElementRef;
  
  private terminal!: Terminal;
  private fitAddon!: FitAddon;
  private webLinksAddon!: WebLinksAddon;
  private searchAddon!: SearchAddon;
  private subscriptions: Subscription[] = [];
  private currentInput: string = '';
  private currentSuggestion: string = '';
  private cursorPosition: number = 0;
  private suggestionStartCol: number = 0;
  private suggestionText: string = '';
  
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
    this.initializeTerminal();
    this.setupWebSocketListeners();
  }

  ngOnDestroy() {
    this.terminal?.dispose();
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.websocketService.disconnect();
  }

  private initializeTerminal() {
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
      this.terminal.write(data);
      this.commandTracker.trackInput(data);
    });

    const exitSub = this.websocketService.getTerminalExit().subscribe(({ code }) => {
      this.terminal.write(`\r\nTerminal exited with code ${code}\r\n`);
    });

    const connectionSub = this.websocketService.getConnectionStatus().subscribe(connected => {
      if (connected) {
        console.log('WebSocket connected');
      } else {
        this.terminal.write('\r\nConnection lost. Reconnecting...\r\n');
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

    // Handle tab completion
    if (data === '\t') {
      this.handleTabCompletion();
      return;
    }

    // Handle arrow keys for navigation
    if (data === '\u001b[A' || data === '\u001b[B') {
      this.websocketService.sendInput(data);
      return;
    }

    // Clear suggestion on escape
    if (data === '\u001b') {
      this.clearSuggestion();
      this.hideCommandHelp();
      return;
    }

    // Handle enter
    if (data === '\r') {
      this.clearSuggestion();
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
        this.clearSuggestion();
        this.websocketService.sendInput(data);
        // Show new suggestion and update help immediately
        this.showSuggestion();
        this.updateCommandHelp();
      }
      return;
    }

    // Handle printable characters
    if (data >= ' ') {
      this.currentInput += data;
      this.cursorPosition++;
      this.clearSuggestion();
      this.websocketService.sendInput(data);
      // Show suggestion and update help immediately
      this.showSuggestion();
      this.updateCommandHelp();
      return;
    }

    // For other control characters, just pass through
    this.websocketService.sendInput(data);
  }

  private handleTabCompletion() {
    const bestMatch = this.autocompleteService.getBestMatch(this.currentInput);
    if (bestMatch) {
      const completion = this.autocompleteService.getCompletion(this.currentInput, bestMatch);
      const toAdd = completion.substring(this.currentInput.length);
      
      if (toAdd) {
        this.currentInput = completion;
        this.cursorPosition = completion.length;
        this.clearSuggestion();
        
        // Send the completion to the terminal
        this.websocketService.sendInput(toAdd);
        
        // Add space after completion
        this.currentInput += ' ';
        this.cursorPosition++;
        this.websocketService.sendInput(' ');
      }
    }
  }

  private showSuggestion() {
    if (!this.currentInput.trim()) {
      return;
    }

    const bestMatch = this.autocompleteService.getBestMatch(this.currentInput);
    if (bestMatch && bestMatch !== this.currentInput.trim()) {
      const parts = this.currentInput.trim().split(/\s+/);
      const lastPart = parts[parts.length - 1];
      
      // Only show suggestion if the match is longer than current input
      if (bestMatch.startsWith(lastPart) && bestMatch.length > lastPart.length) {
        const suggestion = bestMatch.substring(lastPart.length);
        
        if (suggestion) {
          this.currentSuggestion = suggestion;
          this.suggestionStartCol = this.cursorPosition;
          this.suggestionText = suggestion;
          
          // Display suggestion in dim gray immediately
          this.terminal.write(`\u001b[90m${suggestion}\u001b[0m`);
          
          // Move cursor back to original position
          const moveBack = suggestion.length;
          if (moveBack > 0) {
            this.terminal.write(`\u001b[${moveBack}D`);
          }
        }
      }
    }
  }

  private clearSuggestion() {
    if (this.suggestionText) {
      // Clear the suggestion by overwriting with spaces
      const spaces = ' '.repeat(this.suggestionText.length);
      this.terminal.write(spaces);
      
      // Move cursor back
      const moveBack = this.suggestionText.length;
      if (moveBack > 0) {
        this.terminal.write(`\u001b[${moveBack}D`);
      }
      
      this.currentSuggestion = '';
      this.suggestionText = '';
      this.suggestionStartCol = 0;
    }
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
    const terminalRect = this.terminalContainer.nativeElement.getBoundingClientRect();
    this.helpPanelPosition = {
      top: terminalRect.top + 50,
      left: terminalRect.right + 10
    };
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

  @HostListener('window:resize', ['$event'])
  onWindowResize(event: any) {
    this.fitAddon.fit();
    if (this.showCommandHelp) {
      this.updateHelpPanelPosition();
    }
  }
}
