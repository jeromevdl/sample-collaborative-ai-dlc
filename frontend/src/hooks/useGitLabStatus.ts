import { useState, useEffect } from 'react';
import { gitlabService, type GitLabStatus } from '../services/gitlab';
import { ApiError } from '../services/api';

export function useGitLabStatus() {
  const [status, setStatus] = useState<GitLabStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gitlabService.getStatus();
      setStatus(data);
    } catch (err) {
      setStatus({ connected: false });
      const serverMsg =
        err instanceof ApiError && typeof err.body?.error === 'string' ? err.body.error : null;
      setError(serverMsg ?? 'Could not check GitLab connection status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { status, loading, error, refresh };
}
