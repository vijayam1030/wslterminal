import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
}

export interface OllamaResponse {
  response: string;
  done: boolean;
}

export interface CommandSuggestion {
  explanation: string;
  options: string[];
  alternatives: string[];
}

@Injectable({
  providedIn: 'root'
})
export class OllamaService {
  private readonly OLLAMA_URL = 'http://localhost:11434';
  private readonly MODEL = 'codellama';

  constructor(private http: HttpClient) {}

  explainCommand(command: string): Observable<OllamaResponse> {
    const prompt = `Explain this Linux/bash command in detail: ${command}

Please provide:
1. What this command does
2. Each parameter/flag explained
3. Example usage
4. Important notes or warnings

Command: ${command}`;

    return this.generateResponse(prompt);
  }

  getCommandOptions(command: string): Observable<OllamaResponse> {
    const prompt = `List all important command-line options and flags for the following command: ${command}

Please provide:
1. Most commonly used flags/options
2. Brief explanation of each flag
3. Example usage for each

Command: ${command}`;

    return this.generateResponse(prompt);
  }

  suggestAlternatives(command: string): Observable<OllamaResponse> {
    const prompt = `Suggest safer, more efficient, or better alternatives to this command: ${command}

Please provide:
1. Modern alternatives if the command is outdated
2. Safer versions if the command could be dangerous
3. More efficient approaches
4. Best practices

Command: ${command}`;

    return this.generateResponse(prompt);
  }

  getAutoComplete(partialCommand: string): Observable<OllamaResponse> {
    const prompt = `Complete this Linux command and suggest common continuations: ${partialCommand}

Please provide:
1. Most likely completions
2. Common flags that follow
3. Typical usage patterns

Partial command: ${partialCommand}`;

    return this.generateResponse(prompt);
  }

  generateCommand(prompt: string): Observable<OllamaResponse> {
    const request: OllamaRequest = {
      model: this.MODEL,
      prompt,
      stream: false
    };

    return this.http.post<OllamaResponse>(`${this.OLLAMA_URL}/api/generate`, request);
  }

  private generateResponse(prompt: string): Observable<OllamaResponse> {
    const request: OllamaRequest = {
      model: this.MODEL,
      prompt,
      stream: false
    };

    return this.http.post<OllamaResponse>(`${this.OLLAMA_URL}/api/generate`, request);
  }

  checkModelAvailability(): Observable<any> {
    return this.http.get(`${this.OLLAMA_URL}/api/tags`);
  }
}
