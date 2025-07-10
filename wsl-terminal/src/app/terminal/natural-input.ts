import { Component, OnInit, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NaturalLanguageService, CommandTranslation } from '../services/natural-language';

@Component({
  selector: 'app-natural-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './natural-input.html',
  styleUrl: './natural-input.scss'
})
export class NaturalInputComponent implements OnInit {
  @ViewChild('naturalInput') naturalInputRef!: ElementRef<HTMLTextAreaElement>;
  @Output() commandExecuted = new EventEmitter<string>();

  currentInput: string = '';
  suggestions: string[] = [];
  examples: string[] = [];
  isProcessing: boolean = false;
  lastTranslation: CommandTranslation | null = null;
  executedTranslation: boolean = false;
  lastError: string | null = null;

  constructor(private nlService: NaturalLanguageService) {}

  ngOnInit() {
    this.examples = this.nlService.getCommonExamples().slice(0, 6);
    this.updateSuggestions();
  }

  onInputChange() {
    this.updateSuggestions();
    this.clearError();
    
    // Clear previous translation when input changes significantly
    if (this.lastTranslation && 
        this.currentInput.toLowerCase() !== this.lastTranslation.naturalLanguage.toLowerCase()) {
      this.clearTranslation();
    }
  }

  updateSuggestions() {
    this.suggestions = this.nlService.getSuggestions(this.currentInput);
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.translateAndExecute();
    } else if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      this.translateOnly();
    }
  }

  applySuggestion(suggestion: string) {
    this.currentInput = suggestion;
    this.updateSuggestions();
    this.focusInput();
  }

  translateOnly() {
    if (!this.currentInput.trim() || this.isProcessing) return;
    
    this.isProcessing = true;
    this.lastError = null;
    this.executedTranslation = false;
    
    this.nlService.translateToCommand(this.currentInput.trim()).subscribe({
      next: (translation) => {
        this.lastTranslation = translation;
        this.isProcessing = false;
        console.log('Translation result:', translation);
      },
      error: (error) => {
        this.lastError = error;
        this.isProcessing = false;
        console.error('Translation error:', error);
      }
    });
  }

  translateAndExecute() {
    if (!this.currentInput.trim() || this.isProcessing) return;
    
    this.isProcessing = true;
    this.lastError = null;
    this.executedTranslation = false;
    
    this.nlService.translateToCommand(this.currentInput.trim()).subscribe({
      next: (translation) => {
        this.lastTranslation = translation;
        this.isProcessing = false;
        
        // Auto-execute if confidence is high
        if (translation.confidence > 0.8) {
          this.executeCommand(translation.command);
        }
      },
      error: (error) => {
        this.lastError = error;
        this.isProcessing = false;
        console.error('Translation error:', error);
      }
    });
  }

  executeCommand(command: string) {
    console.log('Natural Input: Executing command:', command);
    this.commandExecuted.emit(command);
    this.executedTranslation = true;
    
    // Show execution feedback
    if (this.lastTranslation) {
      this.lastTranslation.explanation = 'Executing command... check output below.';
    }
    
    // Clear input and reset for next command
    setTimeout(() => {
      this.currentInput = '';
      this.clearTranslation();
      this.updateSuggestions();
      this.focusInput();
    }, 2000); // Increased delay to see execution status
  }

  executeAlternative(alternative: string) {
    this.executeCommand(alternative);
  }

  copyCommand() {
    if (this.lastTranslation) {
      navigator.clipboard.writeText(this.lastTranslation.command).then(() => {
        console.log('Command copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy command:', err);
      });
    }
  }

  clearTranslation() {
    this.lastTranslation = null;
    this.executedTranslation = false;
  }

  clearError() {
    this.lastError = null;
  }

  retryTranslation() {
    this.clearError();
    this.translateOnly();
  }

  private focusInput() {
    setTimeout(() => {
      if (this.naturalInputRef) {
        this.naturalInputRef.nativeElement.focus();
      }
    }, 100);
  }
}