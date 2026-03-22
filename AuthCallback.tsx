import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { exchangeCodeForSessionToken } = useAuth();

  useEffect(() => {
    const code = searchParams.get('code');
    
    if (code) {
      exchangeCodeForSessionToken()
        .then(() => {
          navigate('/', { replace: true });
        })
        .catch((error) => {
          console.error('Auth error:', error);
          navigate('/', { replace: true });
        });
    } else {
      navigate('/', { replace: true });
    }
  }, [searchParams, exchangeCodeForSessionToken, navigate]);

  return (
    <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
        </div>
        <h2 className="font-gaming text-xl text-neon-cyan animate-pulse">
          Logging you in...
        </h2>
        <p className="text-muted-foreground mt-2">Please wait</p>
      </div>
    </div>
  );
}
