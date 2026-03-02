/* eslint-disable no-console */
import { getConfig } from '@/config';
import { LogLevel } from './logLevel';

const logLevel = getConfig().logLevel;

const noop = () => null;

export const logger = {
    debug: logLevel <= LogLevel.Debug ? console.debug : noop,
    log: logLevel <= LogLevel.Log ? console.log : noop,
    info: logLevel <= LogLevel.Info ? console.info : noop,
    warn: logLevel <= LogLevel.Warning ? console.warn : noop,
    error: logLevel <= LogLevel.Error ? console.error : noop,
} as const;
