import fs from 'fs';
import util from 'util';

let logFile = null;
try {
    logFile = fs.createWriteStream('./broker.log', {flags: 'w'});
} catch (e) {
    console.error('Cant create log file');
}

function formatArguments(a: IArguments): string {
    let result = [];
    for (let i = 0; i < a.length; i++) {
        result.push(util.format(a[i]));
    }
    const now = new Date();
    return '[' + now.toLocaleDateString() + ' ' + now.toLocaleTimeString() + '] ' + result.join(', ') + '\n';
}

class Log {
    writer: (s: string) => void;

    constructor() {
    }

    log(...args) {
        if (this.writer) {
            this.writer(args.join(', '));
        }
        if (logFile) {
            logFile.write(formatArguments(arguments));
        }
    }

    debug(...args) {
        if (logFile) {
            logFile.write(formatArguments(arguments));
        }
    }

    error(...args) {
        if (this.writer) {
            this.writer('Error: ' + args.join(', '));
        }
        if (logFile) {
            logFile.write('Error: ' + formatArguments(arguments));
        }
    }
}

export const log = new Log();