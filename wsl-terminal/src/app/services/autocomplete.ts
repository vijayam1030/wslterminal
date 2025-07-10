import { Injectable } from '@angular/core';

export interface AutocompleteMatch {
  completion: string;
  display: string;
  type: 'command' | 'file' | 'directory' | 'option';
}

@Injectable({
  providedIn: 'root'
})
export class AutocompleteService {
  private commands = [
    'ls', 'cd', 'pwd', 'mkdir', 'rmdir', 'rm', 'cp', 'mv', 'touch', 'cat',
    'less', 'more', 'head', 'tail', 'grep', 'find', 'which', 'whereis',
    'man', 'info', 'help', 'history', 'clear', 'exit', 'logout',
    'ps', 'top', 'htop', 'kill', 'killall', 'jobs', 'fg', 'bg', 'nohup',
    'chmod', 'chown', 'chgrp', 'umask', 'su', 'sudo', 'whoami', 'id',
    'df', 'du', 'free', 'uname', 'uptime', 'date', 'cal', 'bc',
    'tar', 'gzip', 'gunzip', 'zip', 'unzip', 'wget', 'curl', 'ssh', 'scp',
    'git', 'npm', 'node', 'python', 'python3', 'pip', 'pip3',
    'docker', 'docker-compose', 'kubectl', 'helm',
    'vim', 'nano', 'emacs', 'code', 'vi',
    'echo', 'printf', 'read', 'test', 'expr', 'seq', 'yes', 'true', 'false',
    'sort', 'uniq', 'cut', 'tr', 'sed', 'awk', 'xargs', 'wc', 'nl'
  ];

  private gitCommands = [
    'add', 'commit', 'push', 'pull', 'clone', 'fetch', 'merge', 'rebase',
    'checkout', 'branch', 'tag', 'status', 'log', 'diff', 'show',
    'reset', 'revert', 'stash', 'remote', 'config', 'init', 'blame'
  ];

  private npmCommands = [
    'install', 'uninstall', 'update', 'run', 'start', 'build', 'test',
    'publish', 'version', 'init', 'search', 'info', 'list', 'audit',
    'fund', 'outdated', 'doctor', 'cache', 'config', 'login', 'logout'
  ];

  private dockerCommands = [
    'run', 'build', 'pull', 'push', 'images', 'ps', 'stop', 'start',
    'restart', 'rm', 'rmi', 'exec', 'logs', 'inspect', 'commit',
    'tag', 'save', 'load', 'export', 'import', 'volume', 'network'
  ];

  private commonOptions = [
    '-a', '-l', '-h', '--help', '-v', '--version', '-f', '--force',
    '-r', '--recursive', '-i', '--interactive', '-q', '--quiet',
    '-V', '--verbose', '-n', '--dry-run', '-y', '--yes', '-d', '--debug'
  ];

  constructor() {}

  getMatches(input: string): AutocompleteMatch[] {
    if (!input || input.trim() === '') {
      return [];
    }

    const parts = input.trim().split(/\s+/);
    const lastPart = parts[parts.length - 1];
    const isFirstWord = parts.length === 1;

    let matches: AutocompleteMatch[] = [];

    if (isFirstWord) {
      // Match commands
      matches = this.commands
        .filter(cmd => cmd.startsWith(lastPart))
        .map(cmd => ({
          completion: cmd,
          display: cmd,
          type: 'command' as const
        }));
    } else {
      const firstCommand = parts[0];
      
      // Match subcommands
      if (firstCommand === 'git') {
        matches = this.gitCommands
          .filter(cmd => cmd.startsWith(lastPart))
          .map(cmd => ({
            completion: cmd,
            display: `git ${cmd}`,
            type: 'command' as const
          }));
      } else if (firstCommand === 'npm') {
        matches = this.npmCommands
          .filter(cmd => cmd.startsWith(lastPart))
          .map(cmd => ({
            completion: cmd,
            display: `npm ${cmd}`,
            type: 'command' as const
          }));
      } else if (firstCommand === 'docker') {
        matches = this.dockerCommands
          .filter(cmd => cmd.startsWith(lastPart))
          .map(cmd => ({
            completion: cmd,
            display: `docker ${cmd}`,
            type: 'command' as const
          }));
      }

      // Match common options
      if (lastPart.startsWith('-')) {
        const optionMatches = this.commonOptions
          .filter(opt => opt.startsWith(lastPart))
          .map(opt => ({
            completion: opt,
            display: opt,
            type: 'option' as const
          }));
        matches = [...matches, ...optionMatches];
      }
    }

    return matches.slice(0, 10); // Limit to 10 suggestions
  }

  getBestMatch(input: string): string | null {
    const matches = this.getMatches(input);
    if (matches.length === 0) {
      return null;
    }

    const parts = input.trim().split(/\s+/);
    const lastPart = parts[parts.length - 1];
    const bestMatch = matches[0];

    // Return the completion for the last part
    return bestMatch.completion;
  }

  getCompletion(input: string, match: string): string {
    const parts = input.trim().split(/\s+/);
    const lastPart = parts[parts.length - 1];
    
    if (parts.length === 1) {
      return match;
    } else {
      parts[parts.length - 1] = match;
      return parts.join(' ');
    }
  }
}