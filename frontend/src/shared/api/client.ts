const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "http://localhost:3001/api";

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  token?: string | null;
  body?: unknown;
  isMultipart?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (!options.isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const requestBody = options.body
    ? options.isMultipart
      ? (options.body as BodyInit)
      : JSON.stringify(options.body)
    : undefined;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: requestBody
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data?.message === "string" ? data.message : "Request failed";
    throw new Error(msg);
  }
  return data as T;
}

export { API_BASE_URL };
