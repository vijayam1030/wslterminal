import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CommandHistoryItem {
  id: string;
  timestamp: Date;
  naturalLanguage: string;
  command: string;
  output: string;
  executionTime?: number;
}

@Component({
  selector: 'app-command-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="history-container">
      <div class="history-header">
        <h3>Command History</h3>
        <button class="clear-btn" (click)="clearHistory()" *ngIf="history.length > 0">
          Clear All
        </button>
      </div>
      
      <div class="history-list" *ngIf="history.length > 0; else noHistory">
        <div class="history-item" *ngFor="let item of history; trackBy: trackByFn">
          <div class="history-header-item">
            <span class="timestamp">{{ formatTime(item.timestamp) }}</span>
            <span class="execution-time" *ngIf="item.executionTime">
              ({{ item.executionTime }}ms)
            </span>
          </div>
          
          <div class="natural-language">
            <span class="label">Natural Language:</span>
            <span class="text">{{ item.naturalLanguage }}</span>
          </div>
          
          <div class="command">
            <span class="label">Command:</span>
            <code class="command-text">{{ item.command }}</code>
            <button class="copy-btn" (click)="copyCommand(item.command)" title="Copy command">
              📋
            </button>
          </div>
          
          <div class="output" *ngIf="item.output">
            <span class="label">Output:</span>
            <pre class="output-text">{{ item.output }}</pre>
          </div>
        </div>
      </div>
      
      <ng-template #noHistory>
        <div class="no-history">
          <p>No command history yet.</p>
          <p>Execute some natural language commands to see them here!</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .history-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #1a1a1a;
      color: #e0e0e0;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 2px solid #333;
      background: #2a2a2a;
      
      h3 {
        margin: 0;
        color: #7cc7ff;
        font-size: 18px;
      }
      
      .clear-btn {
        padding: 8px 16px;
        background: #ff4757;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s;
        
        &:hover {
          background: #ff3742;
        }
      }
    }
    
    .history-list {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      gap: 20px;
      display: flex;
      flex-direction: column;
    }
    
    .history-item {
      background: #2a2a2a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 16px;
      border-left: 4px solid #7cc7ff;
      
      .history-header-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        font-size: 12px;
        color: #888;
        
        .timestamp {
          font-weight: 500;
        }
        
        .execution-time {
          color: #4CAF50;
        }
      }
      
      .natural-language, .command, .output {
        margin-bottom: 8px;
        
        .label {
          display: inline-block;
          width: 120px;
          color: #7cc7ff;
          font-weight: 500;
          font-size: 12px;
          vertical-align: top;
        }
        
        .text {
          color: #e0e0e0;
          font-style: italic;
        }
        
        .command-text {
          background: #0a0a0a;
          padding: 4px 8px;
          border-radius: 4px;
          color: #98d982;
          font-family: inherit;
        }
        
        .copy-btn {
          margin-left: 8px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
          opacity: 0.7;
          transition: opacity 0.2s;
          
          &:hover {
            opacity: 1;
          }
        }
        
        .output-text {
          background: #0a0a0a;
          padding: 8px;
          border-radius: 4px;
          color: #e0e0e0;
          font-size: 12px;
          white-space: pre-wrap;
          max-height: 200px;
          overflow-y: auto;
          margin-top: 4px;
        }
      }
    }
    
    .no-history {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #666;
      text-align: center;
      
      p {
        margin: 8px 0;
        font-size: 14px;
      }
    }
    
    /* Scrollbar styling */
    .history-list::-webkit-scrollbar {
      width: 6px;
    }
    
    .history-list::-webkit-scrollbar-track {
      background: #1a1a1a;
    }
    
    .history-list::-webkit-scrollbar-thumb {
      background: #555;
      border-radius: 3px;
      
      &:hover {
        background: #666;
      }
    }
  `]
})
export class CommandHistoryComponent {
  @Input() history: CommandHistoryItem[] = [];

  trackByFn(index: number, item: CommandHistoryItem): string {
    return item.id;
  }

  formatTime(timestamp: Date): string {
    return timestamp.toLocaleTimeString() + ' - ' + timestamp.toLocaleDateString();
  }

  copyCommand(command: string): void {
    navigator.clipboard.writeText(command).then(() => {
      console.log('Command copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy command:', err);
    });
  }

  clearHistory(): void {
    this.history.length = 0;
  }
}