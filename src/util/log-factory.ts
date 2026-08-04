import { Logger } from "@sonisoft/now-sdk-ext-core";


export class LogFactory {
    /**
     * The level is NOT a parameter any more. Core builds one logger for the process,
     * so a per-logger level would only ever have applied to the two loggers created
     * here and never to the ~43 inside core. Set it with `configureLogging({level})`,
     * which AuthenticatedCommand.init does before calling this.
     */
    public static createLogger(name: string): Logger {
        return new Logger(name);
    }
}
