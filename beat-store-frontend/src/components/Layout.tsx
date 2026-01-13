import React, {
  useState,
  useEffect,
  useRef,
  isValidElement,
  cloneElement,
  type ReactElement,
} from 'react';
import { Box } from '@mui/material';
import Navbar from '@/components/Navbar';

import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import AuthModal from '@/components/AuthModal';

import desktopBackground from '@/assets/Desktop - 5.jpg';

type Route = 'music-icon' | 'library' | null;

interface LayoutProps {
  children: React.ReactNode;
  currentRoute?: Route;
  onNavigate?: (route: Route) => void;
}

type AuthMode = 'login' | 'forgot' | 'signup';

const Layout = ({ children, currentRoute, onNavigate }: LayoutProps) => {
  const { logout, login, requestPasswordReset, signup } = useAuthStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');
  const [scrollY, setScrollY] = useState(0);
  const layoutRef = useRef<HTMLDivElement>(null);

  const { show } = useToastStore();

  useEffect(() => {
    let scrollableElement: HTMLElement | null = null;
    let isWindowListener = false;

    const handleScroll = () => {
      if (scrollableElement) {
        setScrollY(scrollableElement.scrollTop);
      } else {
        setScrollY(window.scrollY || document.documentElement.scrollTop);
      }
    };

    const setupListener = () => {
      const element = document.querySelector('.beats-container') as HTMLElement;
      if (element && !scrollableElement) {
        scrollableElement = element;
        scrollableElement.addEventListener('scroll', handleScroll, { passive: true });
        return true;
      } else if (!element && !isWindowListener) {
        isWindowListener = true;
        window.addEventListener('scroll', handleScroll, { passive: true });
        return true;
      }
      return false;
    };

    // Initial setup with delay to ensure element exists
    const timeoutId = setTimeout(() => {
      setupListener();
    }, 100);

    // Also check periodically and on route changes
    const intervalId = setInterval(() => {
      if (!scrollableElement && !isWindowListener) {
        setupListener();
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      if (scrollableElement) {
        scrollableElement.removeEventListener('scroll', handleScroll);
      }
      if (isWindowListener) {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, [currentRoute]);

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
    ? cloneElement(children as ReactElement<any>, {
        onRequestAuth: openAuth,
        currentRoute,
        onNavigate,
      })
    : children;

  return (
    <Box
      ref={layoutRef}
      className="layout"
      sx={{
        display: 'flex',
        flexDirection: 'row',
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Parallax Background */}
      <Box
        sx={{
          position: 'fixed',
          top: '0%',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '120%',
          backgroundImage: `url(${desktopBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          transform: `translateY(${50 - scrollY * 0.05}px) scale(1.3)`,
          transition: 'transform 0.1s ease-out',
          zIndex: 0,
          '@media (max-width: 768px)': {
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            transform: `translateY(${50 - scrollY * 0.05}px) scale(1.2)`,
          },
        }}
      />
      {/* Black Radial Overlay */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          background:
            'radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.46) 50%, rgba(0, 0, 0, 0.4) 100%)',
          zIndex: 0.5,
          pointerEvents: 'none',
        }}
      />
      {/* Content Layer */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          minHeight: '100vh',
        }}
      >
        <Box
          sx={{
            display: { xs: 'none' },
            '@media (min-width: 769px)': {
              display: 'block',
            },
          }}
        >
          <Navbar
            onLogout={handleLogout}
            onSignin={handleSignin}
            currentRoute={currentRoute}
            onNavigate={onNavigate}
          />
        </Box>
        <Box
          component="main"
          sx={{
            flex: 1,
            width: '100%',
            overflow: 'hidden',
            ml: { xs: 0 },
            '@media (min-width: 769px)': {
              marginLeft: '80px',
            },
            transition: 'margin-left 0.3s ease-in-out',
          }}
        >
          {injectedChild}
        </Box>
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
