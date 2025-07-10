import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { OllamaService } from './ollama';

export interface CommandTranslation {
  naturalLanguage: string;
  command: string;
  explanation: string;
  confidence: number;
  alternatives?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class NaturalLanguageService {
  private commandTranslations$ = new Subject<CommandTranslation>();

  constructor(private ollamaService: OllamaService) {}

  translateToCommand(naturalLanguage: string): Observable<CommandTranslation> {
    const prompt = this.createTranslationPrompt(naturalLanguage);
    
    return new Observable(observer => {
      this.ollamaService.generateCommand(prompt).subscribe({
        next: (response) => {
          try {
            const translation = this.parseCommandResponse(naturalLanguage, response.response);
            observer.next(translation);
            observer.complete();
          } catch (error) {
            observer.error(`Failed to parse command: ${error}`);
          }
        },
        error: (error) => {
          observer.error(`LLM request failed: ${error.message}`);
        }
      });
    });
  }

  private createTranslationPrompt(naturalLanguage: string): string {
    return `Convert this natural language request to a Linux/bash command. Respond ONLY with a JSON object in this exact format:

{
  "command": "the actual command to run",
  "explanation": "brief explanation of what the command does",
  "confidence": 0.95,
  "alternatives": ["alternative command 1", "alternative command 2"]
}

Natural language request: "${naturalLanguage}"

Examples:
- "list all files" → {"command": "ls -la", "explanation": "Lists all files including hidden ones with detailed information", "confidence": 0.98}
- "show current directory" → {"command": "pwd", "explanation": "Prints the current working directory path", "confidence": 0.99}
- "create a new folder called test" → {"command": "mkdir test", "explanation": "Creates a new directory named 'test'", "confidence": 0.97}
- "find all text files" → {"command": "find . -name '*.txt'", "explanation": "Searches for all files with .txt extension in current directory and subdirectories", "confidence": 0.95}
- "show running processes" → {"command": "ps aux", "explanation": "Shows all currently running processes with detailed information", "confidence": 0.98}
- "check disk usage" → {"command": "df -h", "explanation": "Shows disk space usage in human-readable format", "confidence": 0.97}

Remember:
- Only return the JSON object, no other text
- Use safe, commonly used commands
- Prefer commands that don't require sudo unless explicitly mentioned
- If the request is unclear, use confidence < 0.8`;
  }

  private parseCommandResponse(naturalLanguage: string, response: string): CommandTranslation {
    try {
      // Clean the response - remove any markdown code blocks or extra text
      let cleanResponse = response.trim();
      
      // Remove code block markers if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      // Try to extract JSON if there's other text
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      const parsed = JSON.parse(cleanResponse);
      
      // Validate required fields
      if (!parsed.command || !parsed.explanation) {
        throw new Error('Missing required fields: command and explanation');
      }

      return {
        naturalLanguage,
        command: parsed.command,
        explanation: parsed.explanation,
        confidence: parsed.confidence || 0.5,
        alternatives: parsed.alternatives || []
      };
    } catch (error) {
      // Fallback parsing for simple cases
      return this.fallbackParsing(naturalLanguage, response);
    }
  }

  private fallbackParsing(naturalLanguage: string, response: string): CommandTranslation {
    // Simple fallback for common commands
    const lower = naturalLanguage.toLowerCase();
    
    if (lower.includes('list') && lower.includes('file')) {
      return {
        naturalLanguage,
        command: 'ls -la',
        explanation: 'Lists all files with detailed information',
        confidence: 0.7
      };
    }
    
    if (lower.includes('current') && lower.includes('directory')) {
      return {
        naturalLanguage,
        command: 'pwd',
        explanation: 'Shows current directory path',
        confidence: 0.8
      };
    }
    
    if (lower.includes('create') && (lower.includes('folder') || lower.includes('directory'))) {
      const match = lower.match(/create.*(?:folder|directory).*?(\w+)/);
      const folderName = match ? match[1] : 'newfolder';
      return {
        naturalLanguage,
        command: `mkdir ${folderName}`,
        explanation: `Creates a directory named '${folderName}'`,
        confidence: 0.6
      };
    }

    // If no fallback matches, return a safe default
    return {
      naturalLanguage,
      command: 'echo "I did not understand that request"',
      explanation: 'Could not translate the natural language request to a command',
      confidence: 0.1
    };
  }

  getCommonExamples(): string[] {
    return [
      "list all files in this directory",
      "show me what's in the current folder",
      "create a new folder called documents",
      "find all text files",
      "show running processes",
      "check disk space",
      "show current directory",
      "copy file.txt to backup.txt",
      "delete the temp folder",
      "search for files containing 'error'",
      "show system information",
      "check network connections"
    ];
  }

  getSuggestions(partialInput: string): string[] {
    const examples = this.getCommonExamples();
    if (!partialInput.trim()) {
      return examples.slice(0, 5);
    }
    
    const lower = partialInput.toLowerCase();
    return examples
      .filter(example => example.toLowerCase().includes(lower))
      .slice(0, 5);
  }
}