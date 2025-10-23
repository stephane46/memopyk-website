import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // 🚨 CACHE BYPASS v1.0.111 - Use only the base URL, ignore version keys
    let url = queryKey[0] as string;
    
    // Only add actual parameters, not cache version keys
    if (queryKey.length > 1) {
      const params = new URLSearchParams();
      for (let i = 1; i < queryKey.length; i++) {
        const param = queryKey[i] as string;
        // Skip version keys like 'v1.0.110' - only add real query parameters
        if (param && !param.startsWith('v')) {
          if (param.length > 10) {
            params.set('lang', param);
          } else if (param.includes('-') && param.length === 10) {
            // Handle date parameters (YYYY-MM-DD format)
            if (i === 1) {
              params.set('dateFrom', param);
            } else if (i === 2) {
              params.set('dateTo', param);
            }
          }
        }
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0, // 🚨 FORCE FRESH DATA - No caching for immediate updates
      gcTime: 0, // 🚨 FORCE GARBAGE COLLECTION - Clear cache immediately
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
