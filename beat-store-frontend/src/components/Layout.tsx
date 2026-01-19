import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  isValidElement,
  cloneElement,
  type ReactElement,
} from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { keyframes } from '@mui/system';
import Navbar from '@/components/Navbar';

import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import { useGetBeatsQuery } from '@/store/beatApi';
import { useResponsive } from '@/hooks/useResponsive';
import AuthModal from '@/components/AuthModal';

import desktopBackground from '@/assets/Desktop - 5.jpg';

type Route = 'music-icon' | 'library' | null;

interface LayoutProps {
  children: React.ReactNode;
  currentRoute?: Route;
  onNavigate?: (route: Route) => void;
}

type AuthMode = 'login' | 'forgot' | 'signup';

// Animated music note loading component
const pulseAnimation = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
`;

const MusicNoteLoader = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: 120,
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Animated music note SVG */}
        <motion.svg
          width="120"
          height="120"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))',
          }}
        >
          {/* Music note - filled oval note head with stem */}
          <defs>
            <linearGradient id="noteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                stopColor="var(--beat-palette-primary-main, #ffc300)"
                stopOpacity="0.3"
              />
              <stop
                offset="100%"
                stopColor="var(--beat-palette-primary-main, #ffc300)"
                stopOpacity="1"
              />
            </linearGradient>
          </defs>

          {/* Note head (oval) - fills from center */}
          <motion.ellipse
            cx="50"
            cy="70"
            rx="15"
            ry="10"
            fill="var(--beat-palette-primary-main, #ffc300)"
            initial={{ fillOpacity: 0, scale: 0.3 }}
            animate={{
              fillOpacity: [0, 0.4, 0.8, 1, 0.8, 0.4, 0],
              scale: [0.3, 0.6, 0.9, 1, 1.1, 1, 0.9],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Stem - fills from top to bottom */}
          <motion.rect
            x="62"
            y="30"
            width="3"
            height="45"
            fill="var(--beat-palette-primary-main, #ffc300)"
            initial={{ fillOpacity: 0 }}
            animate={{
              fillOpacity: [0, 0, 0.3, 0.6, 1, 0.6, 0.3, 0],
              scaleY: [0, 0, 0.3, 0.6, 1, 0.6, 0.3, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.2,
            }}
            style={{ transformOrigin: 'top center' }}
          />

          {/* Flag - draws in */}
          <motion.path
            d="M65 30 Q75 25, 80 30 Q75 35, 65 30"
            fill="var(--beat-palette-primary-main, #ffc300)"
            stroke="none"
            initial={{ fillOpacity: 0, pathLength: 0 }}
            animate={{
              fillOpacity: [0, 0, 0, 0.4, 0.8, 1, 0.8, 0.4, 0],
              pathLength: [0, 0, 0, 0.3, 0.6, 1, 0.6, 0.3, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.4,
            }}
          />
        </motion.svg>

        {/* Pulsing ring */}
        <Box
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '2px solid',
            borderColor: 'primary.main',
            opacity: 0.3,
            animation: `${pulseAnimation} 2s ease-in-out infinite`,
          }}
        />
      </Box>
    </Box>
  );
};

const Layout = ({ children, currentRoute, onNavigate }: LayoutProps) => {
  const { logout, login, requestPasswordReset, signup } = useAuthStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');
  const [scrollY, setScrollY] = useState(0);
  const layoutRef = useRef<HTMLDivElement>(null);

  const { show } = useToastStore();
  const { isLoading } = useGetBeatsQuery();
  const { isSmallScreen } = useResponsive();

  // Minimum loading time state to ensure animation completes
  const [minLoadingTimeElapsed, setMinLoadingTimeElapsed] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);

  // Track when loading starts
  useEffect(() => {
    if (isLoading && loadingStartTime === null) {
      const startTime = Date.now();
      setLoadingStartTime(startTime);
      setMinLoadingTimeElapsed(false);
    }
  }, [isLoading, loadingStartTime]);

  // Ensure minimum 1.5 second loading time
  useEffect(() => {
    if (loadingStartTime !== null) {
      const elapsed = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, 1500 - elapsed);

      if (remainingTime > 0) {
        const timer = setTimeout(() => {
          setMinLoadingTimeElapsed(true);
        }, remainingTime);
        return () => clearTimeout(timer);
      } else {
        setMinLoadingTimeElapsed(true);
      }
    }
  }, [loadingStartTime]);

  // Reset loading state when both conditions are met
  useEffect(() => {
    if (!isLoading && minLoadingTimeElapsed && loadingStartTime !== null) {
      setLoadingStartTime(null);
      setMinLoadingTimeElapsed(false);
    }
  }, [isLoading, minLoadingTimeElapsed, loadingStartTime]);

  // Combined loading state: show loading if either actual loading or minimum time hasn't elapsed
  const showLoading = isLoading || (loadingStartTime !== null && !minLoadingTimeElapsed);

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

  const openAuth = useCallback((mode: AuthMode) => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  // Ensure onRequestAuth is always available to child components
  const injectedChild = isValidElement(children)
    ? cloneElement(children as ReactElement<any>, {
        onRequestAuth: openAuth,
        currentRoute,
        onNavigate,
      })
    : Array.isArray(children)
      ? children.map((child, index) =>
          isValidElement(child)
            ? cloneElement(child as ReactElement<any>, {
                key: child.key || index,
                onRequestAuth: openAuth,
                currentRoute,
                onNavigate,
              })
            : child,
        )
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
            'radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.1) 50%, rgba(0, 0, 0, 0.1) 100%)',
          zIndex: 0.5,
          pointerEvents: 'none',
        }}
      />
      {/* Content Layer */}
      {showLoading ? (
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: '100vh',
          }}
        >
          <MusicNoteLoader />
        </Box>
      ) : (
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minHeight: '100vh',
          }}
        >
          {isSmallScreen && (
            <Box
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1100,
                px: 2,
                pt: 2,
                pb: 1,
                backgroundColor: 'rgba(var(--beat-palette-background-defaultChannel) / 0.6)',
                backdropFilter: 'blur(16px)',
                borderRadius: '12px',
              }}
            >
              <Navbar
                onLogout={handleLogout}
                onSignin={handleSignin}
                currentRoute={currentRoute}
                onNavigate={onNavigate}
              />
            </Box>
          )}
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
      )}

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
