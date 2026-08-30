import http from 'http';
import { buildExpressApp } from '../server';

let testServer: http.Server | null = null;
let testPort: number = 0;

export async function startTestServer(): Promise<string> {
  if (testServer) {
    return `http://127.0.0.1:${testPort}`;
  }

  const app = buildExpressApp();
  return new Promise((resolve) => {
    testServer = app.listen(0, '127.0.0.1', () => {
      const address = testServer!.address() as any;
      testPort = address.port;
      resolve(`http://127.0.0.1:${testPort}`);
    });
  });
}

export async function stopTestServer(): Promise<void> {
  if (testServer) {
    await new Promise<void>((resolve) => testServer!.close(() => resolve()));
    testServer = null;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  token?: string;
  body?: any;
  headers?: Record<string, string>;
  formData?: FormData;
}

export async function apiRequest(
  path: string,
  options: RequestOptions = {}
): Promise<{ status: number; body: any; headers: Headers }> {
  const baseUrl = await startTestServer();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  let body: any = undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
  });

  let responseBody: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }
  } else {
    responseBody = await response.text();
  }

  return {
    status: response.status,
    body: responseBody,
    headers: response.headers,
  };
}

export class TestRunner {
  private results: Array<{
    suite: string;
    name: string;
    passed: boolean;
    durationMs: number;
    error?: string;
  }> = [];

  private currentSuite = 'General';

  setSuite(name: string) {
    this.currentSuite = name;
  }

  async test(name: string, fn: () => Promise<void> | void) {
    const start = performance.now();
    try {
      await fn();
      const durationMs = Math.round(performance.now() - start);
      this.results.push({
        suite: this.currentSuite,
        name,
        passed: true,
        durationMs,
      });
      console.log(`  ✓ ${name} (${durationMs}ms)`);
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      this.results.push({
        suite: this.currentSuite,
        name,
        passed: false,
        durationMs,
        error: err.message || String(err),
      });
      console.error(`  ✗ ${name} (${durationMs}ms):`, err.message || err);
    }
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;
    return {
      total,
      passed,
      failed,
      results: this.results,
    };
  }
}
