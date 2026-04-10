import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const timeoutRaw = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000);
const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 15000;

const retryCountRaw = Number(import.meta.env.VITE_API_RETRY_COUNT ?? 2);
const maxRetries = Number.isFinite(retryCountRaw) && retryCountRaw >= 0 ? retryCountRaw : 2;

const retryDelayRaw = Number(import.meta.env.VITE_API_RETRY_DELAY_MS ?? 400);
const baseRetryDelayMs = Number.isFinite(retryDelayRaw) && retryDelayRaw > 0 ? retryDelayRaw : 400;

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

type RetryableConfig = AxiosRequestConfig & {
  __retryCount?: number;
};

const wait = (delayMs: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, delayMs);
});

const isIdempotentMethod = (method?: string) => {
  const normalized = (method ?? 'get').toLowerCase();
  return normalized === 'get' || normalized === 'head' || normalized === 'options';
};

const shouldRetry = (error: AxiosError, config: RetryableConfig) => {
  if (!isIdempotentMethod(config.method)) {
    return false;
  }

  if (!error.response) {
    // Network-level failures are safe to retry for idempotent requests.
    return true;
  }

  return RETRYABLE_STATUS_CODES.has(error.response.status);
};

const api = axios.create({
  // Empty baseURL means same-origin requests (works with Vite proxy in dev
  // and avoids hardcoding localhost for forwarded URLs).
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: timeoutMs,
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    if (!config) {
      return Promise.reject(error);
    }

    config.__retryCount = config.__retryCount ?? 0;
    if (config.__retryCount >= maxRetries || !shouldRetry(error, config)) {
      return Promise.reject(error);
    }

    config.__retryCount += 1;
    const exponentialBackoffMs = baseRetryDelayMs * (2 ** (config.__retryCount - 1));
    await wait(exponentialBackoffMs);
    return api.request(config);
  },
);

export default api;
