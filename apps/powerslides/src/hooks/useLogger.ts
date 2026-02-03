import { create } from "zustand";
import { nanoid } from "nanoid";

interface LoggerState {
    logLines: { id: string, message: string }[];
    log: (area: string, message: string) => void;
    info: (area: string, message: string) => void;
    error: (area: string, message: string) => void;
    warn: (area: string, message: string) => void;
    debug: (area: string, message: string) => void;
}

function formatLog(level: string, area: string, message: string) {
    return `[${level} | ${area}] ${message}`;
}

const MAX_LOG_LINES = 200;

function appendLogLine(lines: { id: string, message: string }[], line: string) {
    const next = [...lines, { id: nanoid(), message: line }];
    if (next.length <= MAX_LOG_LINES) {
        return next;
    }
    return next.slice(next.length - MAX_LOG_LINES);
}

export const useLogger = create<LoggerState>((set) => ({
    log: (area: string, message: string) => {
        const line = formatLog('log', area, message);
        console.log(line);
        set((state) => ({ logLines: appendLogLine(state.logLines, line) }));
    },
    info: (area: string, message: string) => {
        const line = formatLog('info', area, message);
        console.info(line);
        set((state) => ({ logLines: appendLogLine(state.logLines, line) }));
    },
    error: (area: string, message: string) => {
        const line = formatLog('error', area, message);
        console.error(line);
        set((state) => ({ logLines: appendLogLine(state.logLines, line) }));
    },
    warn: (area: string, message: string) => {
        const line = formatLog('warn', area, message);
        console.warn(line);
        set((state) => ({ logLines: appendLogLine(state.logLines, line) }));
    },
    debug: (area: string, message: string) => {
        const line = formatLog('debug', area, message);
        console.debug(line);
        set((state) => ({ logLines: appendLogLine(state.logLines, line) }));
    },
    logLines: [],
}));