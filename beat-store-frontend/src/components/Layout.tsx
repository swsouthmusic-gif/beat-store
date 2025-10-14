import React, { useState, isValidElement, cloneElement, type ReactElement } from 'react';
import { Box } from '@mui/material';
import Navbar from '@/components/Navbar';

import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import AuthModal from '@/components/AuthModal';

interface LayoutProps {
  children: React.ReactNode;
}

type AuthMode = 'login' | 'forgot' | 'signup';

const Layout = ({ children }: LayoutProps) => {
  const { logout, login, requestPasswordReset, signup } = useAuthStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');

  const { show } = useToastStore();

  const handleLogout = () => logout();
  const handleSignin = () => {
    setAuthModalMode('login');
    setAuthModalOpen(true);
  };

  const openAuth = (mode: AuthMode) => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const injectedChild = isValidElement(children)
    ? cloneElement(children as ReactElement<any>, { onRequestAuth: openAuth })
    : children;

  return (
    <Box
      className="layout"
      sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}
    >
      <Navbar onLogout={handleLogout} onSignin={handleSignin} />
      <Box component="main" sx={{ flex: 1, width: '100%', overflow: 'auto' }}>
        {injectedChild}
      </Box>

      <AuthModal
        open={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onLogin={async ({ username, password }) => {
          await login(username, password);
          show(`Welcome ${username}`, 'success');
          setAuthModalOpen(false);
        }}
        onForgotPassword={async ({ email }: { email: string }) => {
          await requestPasswordReset(email);
        }}
        onSignUp={async ({ email, username, password }) => {
          await signup({ email, username, password });
          setAuthModalOpen(false);
        }}
      />
    </Box>
  );
};

export default Layout;
