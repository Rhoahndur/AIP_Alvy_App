export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let details: unknown;
    try {
      const body = await res.json();
      message = body.error || message;
      details = body.details;
    } catch {
      // response wasn't JSON
    }
    throw new ApiError(message, res.status, details);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async get<T>(url: string): Promise<T> {
    const res = await fetch(url);
    return handleResponse<T>(res);
  },

  async post<T>(url: string, body?: unknown): Promise<T> {
    const isFormData = body instanceof FormData;
    const res = await fetch(url, {
      method: 'POST',
      headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async patch<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },
};
