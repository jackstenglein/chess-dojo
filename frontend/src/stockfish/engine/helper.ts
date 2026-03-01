/* eslint-disable no-console */
import { logger } from '@/logging/logger';

export const isWasmSupported = () => 
    typeof WebAssembly === 'object' &&
    WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

export const isMultiThreadSupported = () => {
    try {
        return SharedArrayBuffer !== undefined && !isIosDevice();
    } catch {
        return false;
    }
};

export const isIosDevice = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

export const isMobileDevice = () =>
    isIosDevice() || /Android|Opera Mini/i.test(navigator.userAgent);

/**
 * Passes the given message and params to console.debug if this._debug is true.
 * @param message The message to pass to console.debug.
 * @param optionalParams The optionalParams to pass to console.debug.
 */
export function debug(message?: unknown, ...optionalParams: unknown[]) {
    console.log(message, optionalParams);
    logger.debug?.(message, optionalParams);
}
