import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpeechRecognitionService } from '../services/speech-recognition';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-voice-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="voice-input-container">
      <!-- Voice Input Button -->
      <button 
        class="voice-btn"
        [class.recording]="isRecording"
        [class.processing]="isProcessing"
        [class.ready]="!isRecording && !isProcessing && !error && isSupported"
        [class.disabled]="!isSupported"
        [disabled]="!isSupported || isProcessing"
        (click)="handleButtonClick($event)"
        [title]="getButtonTitle()"
        type="button">
        
        <div class="voice-icon">
          <!-- Microphone icon when ready to record -->
          <svg *ngIf="!isRecording && !isProcessing && isSupported && !error" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
          </svg>
          
          <!-- Processing/Loading icon -->
          <svg *ngIf="isProcessing" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="loading-icon">
            <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
          </svg>
          
          <!-- Stop icon when recording -->
          <svg *ngIf="isRecording && !isProcessing" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h12v12H6z"/>
          </svg>
          
          <!-- Error icon when there's an error -->
          <svg *ngIf="error && !isRecording && !isProcessing" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          
          <!-- Warning icon when not supported -->
          <svg *ngIf="!isSupported" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        </div>
        
        <div class="voice-content">
          <span class="voice-text">
            {{ getButtonText() }}
          </span>
          <span class="voice-status">
            {{ getStatusText() }}
          </span>
        </div>
        
        <!-- Recording indicator -->
        <div *ngIf="isRecording" class="recording-indicator">
          <div class="pulse-ring"></div>
          <div class="pulse-dot"></div>
        </div>
      </button>
      
      <!-- Transcript Display -->
      <div *ngIf="currentTranscript" class="transcript-container">
        <div class="transcript-header">
          <span class="transcript-label">🎙️ Transcribed:</span>
          <button class="clear-btn" (click)="clearTranscript()" title="Clear transcript">
            ✕
          </button>
        </div>
        <div class="transcript-text">{{ currentTranscript }}</div>
        
        <!-- Action Buttons -->
        <div class="transcript-actions">
          <button class="action-btn use-btn" (click)="useTranscript()" [disabled]="!currentTranscript.trim()">
            📝 Use as Input
          </button>
          <button class="action-btn execute-btn" (click)="executeTranscript()" [disabled]="!currentTranscript.trim()">
            ⚡ Execute Now
          </button>
          <button class="action-btn test-btn" (click)="testMicrophone()" [disabled]="isRecording">
            🎤 Test Mic
          </button>
        </div>
      </div>
      
      <!-- Error Display -->
      <div *ngIf="error" class="error-container">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ error }}</span>
        <button class="retry-btn" (click)="retryRecording()">Retry</button>
      </div>
      
      <!-- Not Supported Message -->
      <div *ngIf="!isSupported" class="not-supported">
        <span class="warning-icon">🚫</span>
        <span>Speech recognition is not supported in this browser</span>
      </div>
    </div>
  `,
  styles: [`
    .voice-input-container {
      margin: 10px 0;
    }
    
    .voice-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      border: 2px solid transparent;
      border-radius: 12px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
      min-width: 180px;
      text-align: left;
      outline: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      
      &.ready {
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        color: white;
        border-color: #4CAF50;
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
          background: linear-gradient(135deg, #45a049 0%, #3e8e41 100%);
        }
      }
      
      &.recording {
        background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
        color: white;
        border-color: #f44336;
        animation: recordingPulse 1.5s infinite;
        
        &:hover {
          background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
        }
      }
      
      &.processing {
        background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
        color: white;
        border-color: #ff9800;
        
        &:hover {
          background: linear-gradient(135deg, #f57c00 0%, #ef6c00 100%);
        }
      }
      
      &.disabled {
        background: #424242;
        color: #bdbdbd;
        cursor: not-allowed;
        border-color: #424242;
        pointer-events: none;
        
        &:hover {
          transform: none;
          box-shadow: none;
        }
      }
      
      &:active {
        transform: scale(0.98);
      }
      
      &:focus {
        outline: 2px solid #7cc7ff;
        outline-offset: 2px;
      }
    }
    
    @keyframes recordingPulse {
      0%, 100% { 
        box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.8), 0 0 0 0 rgba(244, 67, 54, 0.6); 
      }
      50% { 
        box-shadow: 0 0 0 15px rgba(244, 67, 54, 0), 0 0 0 25px rgba(244, 67, 54, 0); 
      }
    }
    
    .voice-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      
      .loading-icon {
        animation: spin 1s linear infinite;
      }
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .voice-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      
      .voice-text {
        font-size: 14px;
        font-weight: 600;
        line-height: 1.2;
      }
      
      .voice-status {
        font-size: 11px;
        opacity: 0.8;
        font-weight: 400;
        margin-top: 2px;
      }
    }
    
    .recording-indicator {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      
      .pulse-ring {
        position: absolute;
        border: 2px solid rgba(255, 255, 255, 0.8);
        border-radius: 50%;
        height: 20px;
        width: 20px;
        animation: pulseRing 1.25s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
      }
      
      .pulse-dot {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        height: 8px;
        width: 8px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        animation: pulseDot 1.25s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
      }
    }
    
    @keyframes pulseRing {
      0% { transform: scale(0.33); }
      80%, 100% { opacity: 0; }
    }
    
    @keyframes pulseDot {
      0% { transform: translate(-50%, -50%) scale(0.8); }
      50% { transform: translate(-50%, -50%) scale(1.2); }
      100% { transform: translate(-50%, -50%) scale(0.8); }
    }
    
    .transcript-container {
      margin-top: 15px;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 12px;
      padding: 16px;
      border-left: 4px solid #667eea;
    }
    
    .transcript-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      
      .transcript-label {
        color: #667eea;
        font-weight: 500;
        font-size: 12px;
      }
      
      .clear-btn {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        
        &:hover {
          background: #444;
          color: #fff;
        }
      }
    }
    
    .transcript-text {
      color: #e0e0e0;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 15px;
      padding: 10px;
      background: #1a1a1a;
      border-radius: 8px;
      font-style: italic;
    }
    
    .transcript-actions {
      display: flex;
      gap: 10px;
      
      .action-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 20px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s ease;
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        &.use-btn {
          background: #4CAF50;
          color: white;
          
          &:hover:not(:disabled) {
            background: #45a049;
            transform: translateY(-1px);
          }
        }
        
        &.execute-btn {
          background: #ff9800;
          color: white;
          
          &:hover:not(:disabled) {
            background: #f57c00;
            transform: translateY(-1px);
          }
        }
        
        &.test-btn {
          background: #9c27b0;
          color: white;
          
          &:hover:not(:disabled) {
            background: #7b1fa2;
            transform: translateY(-1px);
          }
        }
      }
    }
    
    .error-container {
      margin-top: 10px;
      padding: 12px;
      background: #2a1a1a;
      border: 1px solid #ff4757;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      
      .error-icon {
        font-size: 16px;
      }
      
      .error-text {
        color: #ff4757;
        font-size: 13px;
        flex: 1;
      }
      
      .retry-btn {
        padding: 4px 12px;
        background: #ff4757;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        
        &:hover {
          background: #ff3742;
        }
      }
    }
    
    .not-supported {
      margin-top: 10px;
      padding: 12px;
      background: #2a2a1a;
      border: 1px solid #ffa502;
      border-radius: 8px;
      color: #ffa502;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      
      .warning-icon {
        font-size: 16px;
      }
    }
  `]
})
export class VoiceInputComponent implements OnInit, OnDestroy {
  @Output() transcriptReady = new EventEmitter<string>();
  @Output() executeTranscriptEvent = new EventEmitter<string>();

  isRecording = false;
  isSupported = false;
  currentTranscript = '';
  error: string | null = null;
  isProcessing = false; // New state for immediate feedback

  private subscriptions: Subscription[] = [];

  constructor(private speechService: SpeechRecognitionService) {}

  ngOnInit() {
    console.log('VoiceInputComponent initialized');
    console.log('Speech service:', this.speechService);
    
    // Subscribe to speech recognition observables
    this.subscriptions.push(
      this.speechService.getIsRecording().subscribe(recording => {
        console.log('Recording state changed:', recording);
        this.isRecording = recording;
        // Clear processing state when recording actually starts/stops
        if (this.isProcessing) {
          this.isProcessing = false;
          console.log('Cleared processing state due to recording state change');
        }
      }),

      this.speechService.getIsSupported().subscribe(supported => {
        console.log('Support state changed:', supported);
        this.isSupported = supported;
      }),

      this.speechService.getTranscript().subscribe(transcript => {
        console.log('Transcript updated:', transcript);
        this.currentTranscript = transcript;
      }),

      this.speechService.getError().subscribe(error => {
        console.log('Error state changed:', error);
        this.error = error;
        // Clear processing state when an error occurs
        if (error && this.isProcessing) {
          this.isProcessing = false;
          console.log('Cleared processing state due to error');
        }
      })
    );
    
    // Log initial states
    console.log('Initial states:', {
      isRecording: this.isRecording,
      isSupported: this.isSupported,
      error: this.error
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  handleButtonClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Voice button clicked! Current state:', {
      isRecording: this.isRecording,
      isSupported: this.isSupported,
      error: this.error,
      isProcessing: this.isProcessing
    });

    if (!this.isSupported) {
      console.log('Speech recognition not supported');
      return;
    }

    if (this.isProcessing) {
      console.log('Already processing, ignoring click');
      return;
    }

    // Immediate visual feedback
    if (!this.isRecording) {
      console.log('Setting processing state...');
      this.isProcessing = true;
      this.error = null;
    }

    this.toggleRecording();
  }

  toggleRecording() {
    console.log('Toggling recording state...');
    this.speechService.toggleRecording();
  }

  clearTranscript() {
    this.speechService.clearTranscript();
    this.currentTranscript = '';
  }

  useTranscript() {
    if (this.currentTranscript.trim()) {
      this.transcriptReady.emit(this.currentTranscript.trim());
    }
  }

  executeTranscript() {
    if (this.currentTranscript.trim()) {
      this.executeTranscriptEvent.emit(this.currentTranscript.trim());
    }
  }

  retryRecording() {
    this.error = null;
    this.speechService.clearTranscript();
    this.speechService.startRecording();
  }

  async testMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      // Show success message
      this.error = null;
      alert('Microphone test successful! You can now use voice input.');
    } catch (error) {
      console.error('Microphone test failed:', error);
      this.error = 'Microphone access denied. Please check browser permissions.';
    }
  }

  getButtonText(): string {
    if (!this.isSupported) {
      return 'Not Supported';
    }
    if (this.error) {
      return 'Error Occurred';
    }
    if (this.isProcessing) {
      return 'Starting...';
    }
    if (this.isRecording) {
      return 'Stop Recording';
    }
    return 'Start Recording';
  }

  getStatusText(): string {
    if (!this.isSupported) {
      return 'Speech recognition unavailable';
    }
    if (this.error) {
      return 'Click Test Mic or Retry';
    }
    if (this.isProcessing) {
      return 'Initializing microphone...';
    }
    if (this.isRecording) {
      return 'Listening... Speak now';
    }
    return 'Click to start voice input';
  }

  getButtonTitle(): string {
    if (!this.isSupported) {
      return 'Speech recognition not supported in this browser';
    }
    if (this.error) {
      return `Error: ${this.error}`;
    }
    return this.isRecording ? 'Click to stop recording' : 'Click to start voice input';
  }
}