import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class SpeechRecognitionService {
  private recognition: any;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording$ = new BehaviorSubject<boolean>(false);
  private transcript$ = new BehaviorSubject<string>('');
  private isSupported$ = new BehaviorSubject<boolean>(false);
  private error$ = new BehaviorSubject<string | null>(null);
  private useWebSpeechAPI = true;

  constructor() {
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    // Check for Web Speech API support
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      this.isSupported$.next(true);
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      // Configure for local processing and better reliability
      this.recognition.continuous = false;  // Changed to false for better control
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;
      
      // Try to force local processing (browser dependent)
      if ('serviceURI' in this.recognition) {
        this.recognition.serviceURI = '';  // Empty to prefer local
      }

      // Set up event listeners
      this.recognition.onstart = () => {
        console.log('Speech recognition started');
        this.isRecording$.next(true);
        this.error$.next(null);
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('Raw speech event:', event);
        
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;
          
          console.log(`Result ${i}: "${transcript}" (confidence: ${confidence}, final: ${result.isFinal})`);
          
          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update transcript with final or interim results
        const currentTranscript = finalTranscript || interimTranscript;
        if (currentTranscript.trim()) {
          this.transcript$.next(currentTranscript.trim());
          console.log('Updated transcript:', currentTranscript.trim());
        }
      };

      this.recognition.onend = () => {
        console.log('Speech recognition ended');
        this.isRecording$.next(false);
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error, event.message);
        let errorMessage = '';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please speak clearly and try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone access denied or not available.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied. Please allow microphone access.';
            break;
          case 'network':
            errorMessage = 'Network error occurred. Check your internet connection.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        this.error$.next(errorMessage);
        this.isRecording$.next(false);
      };

      this.recognition.onnomatch = () => {
        console.log('No speech match found');
        this.error$.next('Could not understand speech. Please speak more clearly.');
        this.isRecording$.next(false);
      };

    } else {
      console.warn('Web Speech API not supported, checking for MediaRecorder fallback');
      this.checkMediaRecorderSupport();
    }
  }

  private checkMediaRecorderSupport() {
    if ('MediaRecorder' in window && navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices) {
      console.log('MediaRecorder API available for fallback');
      this.isSupported$.next(true);
      this.useWebSpeechAPI = false;
    } else {
      console.warn('No speech recognition support available');
      this.isSupported$.next(false);
    }
  }

  async startRecording(): Promise<void> {
    if (!this.isRecording$.value) {
      if (this.useWebSpeechAPI && this.recognition) {
        await this.startWebSpeechRecording();
      } else {
        await this.startMediaRecorderRecording();
      }
    } else {
      console.log('Already recording');
    }
  }

  private async startWebSpeechRecording(): Promise<void> {
    try {
      console.log('Starting Web Speech API recording...');
      await this.requestMicrophonePermission();
      
      this.transcript$.next('');
      this.error$.next(null);
      
      // Add a small delay to ensure microphone is ready
      setTimeout(() => {
        try {
          this.recognition.start();
          console.log('Web Speech recognition started');
        } catch (startError) {
          console.error('Error in recognition.start():', startError);
          this.error$.next('Failed to start speech recognition');
        }
      }, 100);
      
    } catch (error) {
      console.error('Error starting Web Speech recognition:', error);
      this.error$.next('Failed to start recording. Please check microphone permissions.');
    }
  }

  private async startMediaRecorderRecording(): Promise<void> {
    try {
      console.log('Starting MediaRecorder fallback...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.processAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        this.isRecording$.next(false);
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording$.next(true);
      this.error$.next(null);
      console.log('MediaRecorder started');

      // For demo purposes, show a placeholder transcript
      setTimeout(() => {
        this.transcript$.next('Voice recording completed. (Local processing not yet implemented)');
      }, 1000);

    } catch (error) {
      console.error('Error starting MediaRecorder:', error);
      this.error$.next('Failed to start audio recording');
    }
  }

  private processAudioBlob(audioBlob: Blob) {
    // Placeholder for local audio processing
    // In a real implementation, you could:
    // 1. Use a local speech-to-text library like Vosk.js
    // 2. Send to a local speech service
    // 3. Use WebAssembly-based speech recognition
    console.log('Audio blob created:', audioBlob.size, 'bytes');
    this.transcript$.next('Audio recorded successfully. Local processing would happen here.');
  }

  private async requestMicrophonePermission(): Promise<void> {
    try {
      console.log('Requesting getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('Microphone permission granted');
      
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.label);
      });
    } catch (error) {
      console.error('Microphone permission error:', error);
      throw new Error('Microphone permission denied');
    }
  }

  stopRecording(): void {
    if (this.isRecording$.value) {
      if (this.useWebSpeechAPI && this.recognition) {
        console.log('Stopping Web Speech recognition');
        this.recognition.stop();
      } else if (this.mediaRecorder) {
        console.log('Stopping MediaRecorder');
        this.mediaRecorder.stop();
      }
    }
  }

  toggleRecording(): void {
    console.log('SpeechRecognitionService.toggleRecording() called. Current recording state:', this.isRecording$.value);
    if (this.isRecording$.value) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  getIsRecording(): Observable<boolean> {
    return this.isRecording$.asObservable();
  }

  getTranscript(): Observable<string> {
    return this.transcript$.asObservable();
  }

  getIsSupported(): Observable<boolean> {
    return this.isSupported$.asObservable();
  }

  getError(): Observable<string | null> {
    return this.error$.asObservable();
  }

  getCurrentTranscript(): string {
    return this.transcript$.value;
  }

  clearTranscript(): void {
    this.transcript$.next('');
  }
}