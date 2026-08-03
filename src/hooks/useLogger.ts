import { useState, useCallback, useRef } from 'react';
import { LogEntry, LogLevel, LoggerContext } from '../types/debug';

export const useLogger = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const maxLogs = useRef(100); // Keep last 100 logs for performance

  const addLog = useCallback((message: string, level: LogLevel = 'info', context?: LoggerContext) => {
    const timestamp = new Date().toISOString();
    const newLog: LogEntry = {
      id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      message,
      level,
      context
    };

    setLogs(prevLogs => {
      const updatedLogs = [...prevLogs, newLog];
      // Keep only last N logs for performance
      return updatedLogs.slice(-maxLogs.current);
    });

    // Also log to console with appropriate styling
    const consoleMessage = `[${timestamp}] ${message}`;
    switch (level) {
      case 'error':
        console.error(`🔴 ${consoleMessage}`, context);
        break;
      case 'warn':
        console.warn(`🟡 ${consoleMessage}`, context);
        break;
      case 'success':
        console.log(`🟢 ${consoleMessage}`, context);
        break;
      case 'debug':
        console.log(`🔵 ${consoleMessage}`, context);
        break;
      default:
        console.log(`⚪ ${consoleMessage}`, context);
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const getLogsByLevel = useCallback((level: LogLevel) => {
    return logs.filter(log => log.level === level);
  }, [logs]);

  const getLatestLog = useCallback(() => {
    return logs[logs.length - 1];
  }, [logs]);

  return {
    logs,
    addLog,
    clearLogs,
    getLogsByLevel,
    getLatestLog,
    error: (msg: string, ctx?: LoggerContext) => addLog(msg, 'error', ctx),
    warn: (msg: string, ctx?: LoggerContext) => addLog(msg, 'warn', ctx),
    success: (msg: string, ctx?: LoggerContext) => addLog(msg, 'success', ctx),
    debug: (msg: string, ctx?: LoggerContext) => addLog(msg, 'debug', ctx),
    info: (msg: string, ctx?: LoggerContext) => addLog(msg, 'info', ctx)
  };
};
