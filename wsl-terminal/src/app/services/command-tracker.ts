import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { OllamaService } from './ollama';

export interface Command {
  text: string;
  timestamp: Date;
  executed: boolean;
}

export interface AISuggestion {
  explanation: string;
  options: string;
  alternatives: string;
  loading: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CommandTrackerService {
  private currentCommand$ = new BehaviorSubject<string>('');
  private currentInput$ = new BehaviorSubject<string>('');
  private commandHistory: Command[] = [];
  private aiSuggestions$ = new BehaviorSubject<AISuggestion>({
    explanation: '',
    options: '',
    alternatives: '',
    loading: false
  });

  constructor(private ollamaService: OllamaService) {}

  trackInput(input: string) {
    const currentLine = this.getCurrentCommandLine(input);
    console.log('Tracking input:', input, 'Extracted line:', currentLine); // Debug
    
    // Update current input for suggestions panel
    this.currentInput$.next(currentLine);
    
    if (currentLine !== this.currentCommand$.value) {
      this.currentCommand$.next(currentLine);
      this.analyzeCommand(currentLine);
    }
  }
  
  updateCurrentInput(input: string) {
    console.log('Direct input update:', input); // Debug
    this.currentInput$.next(input);
  }

  executeCommand(command: string) {
    this.commandHistory.push({
      text: command,
      timestamp: new Date(),
      executed: true
    });
    this.generateAISuggestions(command);
  }

  getCurrentCommand() {
    return this.currentCommand$.asObservable();
  }

  getCurrentInput() {
    return this.currentInput$.asObservable();
  }

  getAISuggestions() {
    return this.aiSuggestions$.asObservable();
  }

  getCommandHistory() {
    return this.commandHistory.slice();
  }

  private getCurrentCommandLine(input: string): string {
    const lines = input.split('\n');
    const lastLine = lines[lines.length - 1] || '';
    
    const promptMatch = lastLine.match(/\$ (.*)$/);
    return promptMatch ? promptMatch[1] : '';
  }

  private analyzeCommand(command: string) {
    if (command.trim().length > 2) {
      this.generateAISuggestions(command);
    }
  }

  private generateAISuggestions(command: string) {
    if (!command.trim()) return;

    this.aiSuggestions$.next({
      explanation: '',
      options: '',
      alternatives: '',
      loading: true
    });

    const baseCommand = command.split(' ')[0];

    this.ollamaService.explainCommand(command).subscribe({
      next: (response) => {
        const current = this.aiSuggestions$.value;
        this.aiSuggestions$.next({
          ...current,
          explanation: response.response,
          loading: false
        });
      },
      error: (error) => {
        console.error('Error getting explanation:', error);
        const current = this.aiSuggestions$.value;
        this.aiSuggestions$.next({
          ...current,
          explanation: 'Unable to get command explanation. Make sure Ollama is running.',
          loading: false
        });
      }
    });

    this.ollamaService.getCommandOptions(baseCommand).subscribe({
      next: (response) => {
        const current = this.aiSuggestions$.value;
        this.aiSuggestions$.next({
          ...current,
          options: response.response
        });
      },
      error: (error) => {
        console.error('Error getting options:', error);
      }
    });

    this.ollamaService.suggestAlternatives(command).subscribe({
      next: (response) => {
        const current = this.aiSuggestions$.value;
        this.aiSuggestions$.next({
          ...current,
          alternatives: response.response
        });
      },
      error: (error) => {
        console.error('Error getting alternatives:', error);
      }
    });
  }
}
