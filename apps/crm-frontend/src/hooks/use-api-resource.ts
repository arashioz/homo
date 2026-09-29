import { useCallback, useEffect, useState } from "react";
import { ApiError, apiRequest } from "../lib/api";

interface ApiResource<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
  reload: () => Promise<void>;
}

export function useApiResource<T>(path: string, token: string | undefined): ApiResource<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(undefined);
    try {
      setData(await apiRequest<T>(path, { token }));
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : "دریافت اطلاعات ممکن نشد.");
    } finally {
      setLoading(false);
    }
  }, [path, token]);

  useEffect(() => {
    // Fetching an external resource intentionally starts after the component mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  return { data, loading, error, setData, reload };
}
