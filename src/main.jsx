import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AuthScreen from './components/AuthScreen';
import { ToastProvider } from './components/Toast';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabase';
import './index.css';

/** Only signed-in portal users get the vault. Remounts App per user so nothing leaks between accounts. */
function AuthGate() {
  const auth = useAuth();
  if (auth.status === 'signedIn') return <App key={auth.profile.user_id} auth={auth} />;
  return <AuthScreen auth={auth} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>{supabase ? <AuthGate /> : <App />}</ToastProvider>
  </React.StrictMode>,
);
