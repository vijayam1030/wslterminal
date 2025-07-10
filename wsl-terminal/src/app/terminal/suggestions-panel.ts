import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutocompleteService, AutocompleteMatch } from '../services/autocomplete';
import { CommandHelpService, CommandOption } from '../services/command-help';

@Component({
  selector: 'app-suggestions-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './suggestions-panel.html',
  styleUrl: './suggestions-panel.scss'
})
export class SuggestionsPanelComponent implements OnChanges {
  @Input() currentInput: string = '';
  @Input() showSuggestions: boolean = true;
  @Output() suggestionSelected = new EventEmitter<string>();

  commandSuggestions: (AutocompleteMatch & { description?: string })[] = [];
  optionSuggestions: CommandOption[] = [];
  examples: string[] = [];
  selectedIndex: number = 0;
  hasSuggestions: boolean = false;

  constructor(
    private autocompleteService: AutocompleteService,
    private commandHelpService: CommandHelpService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentInput']) {
      this.updateSuggestions();
    }
  }

  private updateSuggestions() {
    this.commandSuggestions = [];
    this.optionSuggestions = [];
    this.examples = [];
    this.selectedIndex = 0;

    if (!this.currentInput.trim()) {
      this.hasSuggestions = false;
      return;
    }

    const input = this.currentInput.trim();
    const parts = input.split(/\s+/);
    const isFirstWord = parts.length === 1;
    const firstCommand = parts[0];

    // Get command suggestions
    const matches = this.autocompleteService.getMatches(input);
    this.commandSuggestions = matches.map(match => ({
      ...match,
      description: this.getCommandDescription(match.completion)
    }));

    // Get options for current command
    if (!isFirstWord && firstCommand) {
      this.optionSuggestions = this.commandHelpService.getQuickOptions(firstCommand, 6);
    }

    // Get examples for current command
    if (firstCommand) {
      this.examples = this.commandHelpService.getExamples(firstCommand, 3);
    }

    this.hasSuggestions = this.commandSuggestions.length > 0 || 
                         this.optionSuggestions.length > 0 || 
                         this.examples.length > 0;
  }

  private getCommandDescription(command: string): string {
    return this.commandHelpService.getCommandSummary(command).split(':')[1]?.trim() || '';
  }

  selectSuggestion(suggestion: string) {
    this.suggestionSelected.emit(suggestion);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (!this.showSuggestions || !this.hasSuggestions) {
      return;
    }

    const totalSuggestions = this.commandSuggestions.length + this.optionSuggestions.length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % totalSuggestions;
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = this.selectedIndex === 0 ? 
          totalSuggestions - 1 : 
          this.selectedIndex - 1;
        break;
      
      case 'Enter':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.selectCurrentSuggestion();
        }
        break;
    }
  }

  private selectCurrentSuggestion() {
    const commandCount = this.commandSuggestions.length;
    
    if (this.selectedIndex < commandCount) {
      const suggestion = this.commandSuggestions[this.selectedIndex];
      this.selectSuggestion(suggestion.completion);
    } else {
      const optionIndex = this.selectedIndex - commandCount;
      if (optionIndex < this.optionSuggestions.length) {
        const option = this.optionSuggestions[optionIndex];
        this.selectSuggestion(option.flag);
      }
    }
  }
}