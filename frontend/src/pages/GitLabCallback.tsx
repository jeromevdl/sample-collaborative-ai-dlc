import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OAuthCallbackShell } from '@/components/OAuthCallbackShell';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function GitLabCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      setStatus('error');
      setError('Missing authorization code');
      return;
    }

    fetch(`${API_BASE_URL}/gitlab/callback?code=${code}&state=${state}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success');
          setTimeout(() => navigate('/dashboard?reopenCreateProject=1'), 1500);
        } else {
          setStatus('error');
          setError(data.error || 'Failed to connect GitLab');
        }
      })
      .catch(() => {
        setStatus('error');
        setError('Failed to connect GitLab');
      });
  }, [searchParams, navigate]);

  return <OAuthCallbackShell status={status} providerLabel="GitLab" errorMessage={error} />;
}
