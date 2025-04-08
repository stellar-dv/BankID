// ANSI color codes for fancy logs
export const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  // Background colors
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m"
};

// Map HTTP status codes to colors
export const statusColors = {
  2: colors.green,   // 2xx - Success
  3: colors.cyan,    // 3xx - Redirection
  4: colors.yellow,  // 4xx - Client Error
  5: colors.red      // 5xx - Server Error
};

// Map sources to colors
export const sourceColors: Record<string, string> = {
  "express": colors.cyan,
  "bankid": colors.magenta,
  "webhook": colors.green,
  "auth": colors.yellow,
  "storage": colors.blue,
  "error": colors.red
};

// Get original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

// Create a nice time formatted timestamp
export const getFormattedTime = () => {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

// Format API logs with colorful status and timing
export const formatApiLog = (message: string): string => {
  const apiLogRegex = /(GET|POST|PUT|DELETE|PATCH)\s+(\S+)\s+(\d{3})\s+in\s+(\d+)ms/;
  const matches = message.match(apiLogRegex);
  
  if (matches) {
    const [_, method, path, statusCode, time] = matches;
    const timeNum = parseInt(time);
    
    // Choose color based on status code
    const statusColor = statusColors[statusCode.charAt(0) as unknown as keyof typeof statusColors] || colors.white;
    
    // Choose color based on response time
    let timeColor = colors.green;
    if (timeNum > 1000) {
      timeColor = colors.red;
    } else if (timeNum > 300) {
      timeColor = colors.yellow;
    }
    
    // Format with colors
    return message.replace(
      apiLogRegex, 
      `${colors.bright}${method}${colors.reset} ${colors.cyan}${path}${colors.reset} ${statusColor}${statusCode}${colors.reset} in ${timeColor}${time}ms${colors.reset}`
    );
  }
  
  return message;
};

// Format BankID logs
export const formatBankIdLog = (message: string): string => {
  // Color BankID operations
  if (message.includes('BankID API auth response')) {
    return `${colors.green}${colors.bright}[BankID Auth]${colors.reset} ${message}`;
  }
  if (message.includes('BankID API sign response')) {
    return `${colors.cyan}${colors.bright}[BankID Sign]${colors.reset} ${message}`;
  }
  if (message.includes('BankID API collect response')) {
    return `${colors.yellow}${colors.bright}[BankID Collect]${colors.reset} ${message}`;
  }
  if (message.includes('BankID API cancel')) {
    return `${colors.red}${colors.bright}[BankID Cancel]${colors.reset} ${message}`;
  }
  // Error logs
  if (message.includes('Error') || message.includes('error') || message.includes('Failed')) {
    return `${colors.red}${colors.bright}[Error]${colors.reset} ${message}`;
  }
  
  return message;
};

// Enhanced console logging
export const fancyLog = (message: string, source = "server") => {
  const formattedTime = getFormattedTime();
  const sourceColor = sourceColors[source] || colors.white;
  
  // Format message based on content
  let formattedMessage = message;
  formattedMessage = formatApiLog(formattedMessage);
  formattedMessage = formatBankIdLog(formattedMessage);
  
  originalConsoleLog(`${colors.dim}${formattedTime}${colors.reset} ${sourceColor}[${source}]${colors.reset} ${formattedMessage}`);
};

// Enhanced error logging
export const fancyError = (message: string, source = "error") => {
  const formattedTime = getFormattedTime();
  originalConsoleError(`${colors.dim}${formattedTime}${colors.reset} ${colors.red}[${source}]${colors.reset} ${colors.red}${message}${colors.reset}`);
};

// Enhanced warning logging
export const fancyWarn = (message: string, source = "warning") => {
  const formattedTime = getFormattedTime();
  originalConsoleWarn(`${colors.dim}${formattedTime}${colors.reset} ${colors.yellow}[${source}]${colors.reset} ${colors.yellow}${message}${colors.reset}`);
};

// Override console methods
export const enableFancyLogs = () => {
  console.log = (message: any, ...args: any[]) => {
    if (typeof message === 'string') {
      fancyLog(message, args[0] || "server");
    } else {
      originalConsoleLog(message, ...args);
    }
  };
  
  console.error = (message: any, ...args: any[]) => {
    if (typeof message === 'string') {
      fancyError(message, args[0] || "error");
    } else {
      originalConsoleError(message, ...args);
    }
  };
  
  console.warn = (message: any, ...args: any[]) => {
    if (typeof message === 'string') {
      fancyWarn(message, args[0] || "warning");
    } else {
      originalConsoleWarn(message, ...args);
    }
  };
};

// Restore original console methods
export const disableFancyLogs = () => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
};

// Helper for event-specific formatted logs
export const logBankIdEvent = (event: string, data: any) => {
  let prefix = '';
  let color = colors.white;
  
  switch(event) {
    case 'auth':
      prefix = '🔐 Auth';
      color = colors.green;
      break;
    case 'sign':
      prefix = '✍️ Sign';
      color = colors.blue;
      break;
    case 'collect':
      prefix = '📋 Collect';
      color = colors.yellow;
      break;
    case 'cancel':
      prefix = '❌ Cancel';
      color = colors.red;
      break;
    case 'webhook':
      prefix = '🔄 Webhook';
      color = colors.magenta;
      break;
    default:
      prefix = '🏦 BankID';
  }
  
  console.log(`${color}${colors.bright}[${prefix}]${colors.reset} ${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}`, 'bankid');
};

// Export a singleton instance
export default {
  log: fancyLog,
  error: fancyError,
  warn: fancyWarn,
  enableFancyLogs,
  disableFancyLogs,
  logBankIdEvent
};