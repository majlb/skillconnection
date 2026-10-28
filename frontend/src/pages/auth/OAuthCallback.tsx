import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui';

/** Receives tokens from the backend OAuth2 success handler via the URL fragment. */
export default function OAuthCallback() {
  const { completeOAuth } = useAuth();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    // Strip tokens from the address bar / history immediately.
    window.history.replaceState(null, '', window.location.pathname);
    const access = params.get('access');
    const refresh = params.get('refresh');
    if (!access || !refresh) {
      setFailed(true);
      return;
    }
    completeOAuth(access, refresh)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => setFailed(true));
  }, [completeOAuth, navigate]);

  return failed ? <div className="container-page text-center">Sign-in failed. Please try again.</div> : <Spinner />;
}
