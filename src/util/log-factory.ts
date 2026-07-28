import { Logger } from "@sonisoft/now-sdk-ext-core";


export class LogFactory {
    public static createLogger(name: string, level: string = 'info'): Logger {
        const logger = new Logger(name, level);
        return logger;
    }
}