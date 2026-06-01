import { EventType, trackEvent } from '@/analytics/events';
import { getConfig } from '@/config';
import { logger } from '@/logging/logger';
import { fetchAuthSession } from 'aws-amplify/auth';
import axios, { AxiosError } from 'axios';

const config = getConfig();

export const axiosService = axios.create({
    baseURL: config.api.baseUrl,
});

axiosService.interceptors.request.use(async (request) => {
    request.startTime = new Date().getTime();
    if (!request.url || !request.url.startsWith('/') || request.url.startsWith('/public/')) {
        return request;
    }

    const authTokens = await fetchAuthSession();
    const idToken = authTokens.tokens?.idToken?.toString();
    if (idToken) {
        request.headers.Authorization = `Bearer ${idToken}`;
    }

    return request;
});

axiosService.interceptors.request.use((request) => {
    logger.debug?.(`${request.functionName ?? request.url} request:`, request);
    return request;
});

axiosService.interceptors.response.use(
    (response) => {
        const endTime = new Date().getTime();
        const startTime = response.config.startTime ?? 0;
        response.latencyMillis = endTime - startTime;
        logger.debug?.(
            `${response.config.functionName ?? response.config.url} response:`,
            response,
        );
        trackEvent(EventType.ApiRequest, {
            result: 'success',
            statusCode: response.status,
            url: response.config.url,
            functionName: response.config.functionName,
            latencyMillis: response.latencyMillis,
        });
        return response;
    },
    (err: AxiosError) => {
        const endTime = new Date().getTime();
        const startTime = err.config?.startTime ?? 0;
        err.latencyMillis = endTime - startTime;
        logger.error?.(
            `${err.config?.functionName ?? err.config?.url} error:`,
            err,
            JSON.stringify(err, null, 2),
        );
        trackEvent(EventType.ApiRequest, {
            result: 'failure',
            statusCode: err.status,
            url: err.config?.url,
            functionName: err.config?.functionName,
            latencyMillis: err.latencyMillis,
        });
        return Promise.reject(err);
    },
);
