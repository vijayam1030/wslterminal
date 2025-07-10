import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommandHelpService, CommandOption } from '../services/command-help';

@Component({
  selector: 'app-command-help-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './command-help-panel.html',
  styleUrl: './command-help-panel.scss'
})
export class CommandHelpPanelComponent implements OnChanges {
  @Input() command: string = '';
  @Input() showHelp: boolean = false;
  @Input() panelPosition: { top: number; left: number } = { top: 0, left: 0 };
  @Output() hideHelpEvent = new EventEmitter<void>();

  commandSummary: string = '';
  quickOptions: CommandOption[] = [];
  allOptions: CommandOption[] = [];
  examples: string[] = [];
  alternatives: string[] = [];
  hasMoreOptions: boolean = false;
  remainingOptionsCount: number = 0;
  showingAllOptions: boolean = false;

  constructor(private commandHelpService: CommandHelpService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['command'] && this.command) {
      this.updateHelpContent();
    }
    
    if (changes['showHelp'] && !this.showHelp) {
      this.showingAllOptions = false;
    }
  }

  private updateHelpContent() {
    this.commandSummary = this.commandHelpService.getCommandSummary(this.command);
    this.quickOptions = this.commandHelpService.getQuickOptions(this.command, 3);
    this.allOptions = this.commandHelpService.getAllOptions(this.command);
    this.examples = this.commandHelpService.getExamples(this.command, 2);
    this.alternatives = this.commandHelpService.getAlternatives(this.command);
    
    this.hasMoreOptions = this.allOptions.length > this.quickOptions.length;
    this.remainingOptionsCount = this.allOptions.length - this.quickOptions.length;
  }

  hideHelp() {
    this.hideHelpEvent.emit();
  }

  showAllOptions() {
    this.showingAllOptions = true;
  }
}