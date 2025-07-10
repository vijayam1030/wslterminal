import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { TerminalComponent } from './terminal/terminal';
import { SuggestionsPanelComponent } from './terminal/suggestions-panel';
import { CommandTrackerService, AISuggestion } from './services/command-tracker';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    CommonModule,
    TerminalComponent,
    SuggestionsPanelComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  @ViewChild(TerminalComponent) terminal!: TerminalComponent;
  
  title = 'WSL Terminal';
  currentInput: string = '';
  aiSuggestions: AISuggestion = {
    explanation: 'Select a command to get detailed explanations',
    options: 'Available flags and options will appear here',
    alternatives: 'Safer and more efficient alternatives will be suggested',
    loading: false
  };
  
  private subscriptions: Subscription[] = [];

  constructor(private commandTracker: CommandTrackerService) {}

  ngOnInit() {
    const suggestionsSub = this.commandTracker.getAISuggestions().subscribe(
      suggestions => {
        this.aiSuggestions = suggestions;
      }
    );
    
    // Subscribe to terminal input changes
    const inputSub = this.commandTracker.getCurrentInput().subscribe(
      input => {
        console.log('App received input update:', input); // Debug
        this.currentInput = input;
      }
    );
    
    this.subscriptions.push(suggestionsSub, inputSub);
  }

  applySuggestion(suggestion: string) {
    if (this.terminal) {
      this.terminal.applySuggestion(suggestion);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
