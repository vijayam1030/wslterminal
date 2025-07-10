import { Injectable } from '@angular/core';

export interface CommandHelp {
  command: string;
  description: string;
  usage: string;
  options: CommandOption[];
  examples: string[];
  alternatives: string[];
}

export interface CommandOption {
  flag: string;
  description: string;
  example?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommandHelpService {
  private commandHelp: { [key: string]: CommandHelp } = {
    'ls': {
      command: 'ls',
      description: 'List directory contents',
      usage: 'ls [options] [directory]',
      options: [
        { flag: '-l', description: 'Use long listing format', example: 'ls -l' },
        { flag: '-a', description: 'Show hidden files', example: 'ls -a' },
        { flag: '-h', description: 'Human readable file sizes', example: 'ls -lh' },
        { flag: '-t', description: 'Sort by modification time', example: 'ls -lt' },
        { flag: '-r', description: 'Reverse order', example: 'ls -lr' },
        { flag: '-S', description: 'Sort by file size', example: 'ls -lS' }
      ],
      examples: [
        'ls -la ~/Documents',
        'ls -lh /var/log',
        'ls -lt *.txt'
      ],
      alternatives: ['dir', 'find . -maxdepth 1', 'tree -L 1']
    },
    'cd': {
      command: 'cd',
      description: 'Change directory',
      usage: 'cd [directory]',
      options: [
        { flag: '-', description: 'Go to previous directory', example: 'cd -' },
        { flag: '~', description: 'Go to home directory', example: 'cd ~' },
        { flag: '..', description: 'Go to parent directory', example: 'cd ..' }
      ],
      examples: [
        'cd /home/user',
        'cd ~/Documents',
        'cd ..'
      ],
      alternatives: ['pushd', 'popd', 'dirs']
    },
    'grep': {
      command: 'grep',
      description: 'Search text patterns in files',
      usage: 'grep [options] pattern [files]',
      options: [
        { flag: '-i', description: 'Case insensitive search', example: 'grep -i error log.txt' },
        { flag: '-r', description: 'Recursive search', example: 'grep -r "TODO" src/' },
        { flag: '-n', description: 'Show line numbers', example: 'grep -n "function" *.js' },
        { flag: '-v', description: 'Invert match (exclude)', example: 'grep -v "#" config.txt' },
        { flag: '-c', description: 'Count matches', example: 'grep -c "error" log.txt' },
        { flag: '-l', description: 'List filenames only', example: 'grep -l "import" *.py' }
      ],
      examples: [
        'grep -i "error" /var/log/syslog',
        'grep -rn "TODO" src/',
        'ps aux | grep nginx'
      ],
      alternatives: ['ack', 'ag', 'rg', 'findstr']
    },
    'find': {
      command: 'find',
      description: 'Search for files and directories',
      usage: 'find [path] [options] [expression]',
      options: [
        { flag: '-name', description: 'Find by name pattern', example: 'find . -name "*.txt"' },
        { flag: '-type', description: 'Find by type (f=file, d=dir)', example: 'find . -type f' },
        { flag: '-size', description: 'Find by file size', example: 'find . -size +10M' },
        { flag: '-mtime', description: 'Find by modification time', example: 'find . -mtime -7' },
        { flag: '-exec', description: 'Execute command on results', example: 'find . -name "*.tmp" -exec rm {} \\;' },
        { flag: '-print0', description: 'Null-separated output', example: 'find . -name "*.jpg" -print0' }
      ],
      examples: [
        'find /home -name "*.pdf"',
        'find . -type f -size +100M',
        'find /tmp -mtime +30 -delete'
      ],
      alternatives: ['locate', 'which', 'whereis', 'fd']
    },
    'git': {
      command: 'git',
      description: 'Distributed version control system',
      usage: 'git [command] [options]',
      options: [
        { flag: 'status', description: 'Show working tree status', example: 'git status' },
        { flag: 'add', description: 'Add files to staging area', example: 'git add .' },
        { flag: 'commit', description: 'Record changes to repository', example: 'git commit -m "message"' },
        { flag: 'push', description: 'Upload changes to remote', example: 'git push origin main' },
        { flag: 'pull', description: 'Download changes from remote', example: 'git pull origin main' },
        { flag: 'log', description: 'Show commit history', example: 'git log --oneline' }
      ],
      examples: [
        'git clone https://github.com/user/repo.git',
        'git checkout -b feature-branch',
        'git merge develop'
      ],
      alternatives: ['svn', 'hg', 'bzr']
    },
    'npm': {
      command: 'npm',
      description: 'Node.js package manager',
      usage: 'npm [command] [options]',
      options: [
        { flag: 'install', description: 'Install packages', example: 'npm install express' },
        { flag: 'run', description: 'Run package scripts', example: 'npm run build' },
        { flag: 'start', description: 'Start application', example: 'npm start' },
        { flag: 'test', description: 'Run tests', example: 'npm test' },
        { flag: 'update', description: 'Update packages', example: 'npm update' },
        { flag: 'audit', description: 'Check for vulnerabilities', example: 'npm audit' }
      ],
      examples: [
        'npm install -g @angular/cli',
        'npm run dev',
        'npm audit fix'
      ],
      alternatives: ['yarn', 'pnpm', 'bun']
    },
    'docker': {
      command: 'docker',
      description: 'Container platform',
      usage: 'docker [command] [options]',
      options: [
        { flag: 'run', description: 'Run a container', example: 'docker run -it ubuntu bash' },
        { flag: 'build', description: 'Build an image', example: 'docker build -t myapp .' },
        { flag: 'ps', description: 'List running containers', example: 'docker ps' },
        { flag: 'images', description: 'List images', example: 'docker images' },
        { flag: 'logs', description: 'View container logs', example: 'docker logs container-name' },
        { flag: 'exec', description: 'Execute command in container', example: 'docker exec -it container bash' }
      ],
      examples: [
        'docker run -p 3000:3000 node:16',
        'docker-compose up -d',
        'docker system prune'
      ],
      alternatives: ['podman', 'containerd', 'lxc']
    },
    'cat': {
      command: 'cat',
      description: 'Display file contents',
      usage: 'cat [options] [files]',
      options: [
        { flag: '-n', description: 'Number all lines', example: 'cat -n file.txt' },
        { flag: '-b', description: 'Number non-blank lines', example: 'cat -b file.txt' },
        { flag: '-s', description: 'Suppress repeated blank lines', example: 'cat -s file.txt' },
        { flag: '-A', description: 'Show all characters', example: 'cat -A file.txt' }
      ],
      examples: [
        'cat /etc/passwd',
        'cat file1.txt file2.txt > combined.txt',
        'cat << EOF > newfile.txt'
      ],
      alternatives: ['less', 'more', 'head', 'tail', 'bat']
    }
  };

  constructor() {}

  getCommandHelp(command: string): CommandHelp | null {
    // Handle subcommands (e.g., "git status" -> "git")
    const baseCommand = command.split(' ')[0];
    return this.commandHelp[baseCommand] || null;
  }

  getCommandSummary(command: string): string {
    const help = this.getCommandHelp(command);
    if (!help) return '';
    
    return `${help.command}: ${help.description}`;
  }

  getQuickOptions(command: string, limit: number = 3): CommandOption[] {
    const help = this.getCommandHelp(command);
    if (!help) return [];
    
    return help.options.slice(0, limit);
  }

  getAllOptions(command: string): CommandOption[] {
    const help = this.getCommandHelp(command);
    if (!help) return [];
    
    return help.options;
  }

  getExamples(command: string, limit: number = 2): string[] {
    const help = this.getCommandHelp(command);
    if (!help) return [];
    
    return help.examples.slice(0, limit);
  }

  getAlternatives(command: string): string[] {
    const help = this.getCommandHelp(command);
    if (!help) return [];
    
    return help.alternatives;
  }

  searchCommands(query: string): string[] {
    const results: string[] = [];
    
    for (const [command, help] of Object.entries(this.commandHelp)) {
      if (command.includes(query.toLowerCase()) || 
          help.description.toLowerCase().includes(query.toLowerCase())) {
        results.push(command);
      }
    }
    
    return results.slice(0, 10);
  }
}