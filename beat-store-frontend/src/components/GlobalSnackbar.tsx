// /components/GlobalSnackbar.tsx
import * as React from 'react';
import { Snackbar, Alert, useMediaQuery, useTheme } from '@mui/material';
import { useToastStore } from '@/store/toastStore';

const GlobalSnackbar: React.FC = () => {
  const { open, message, severity, autoHideDuration, close } = useToastStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Snackbar
      open={open}
      onClose={close}
      autoHideDuration={autoHideDuration}
      anchorOrigin={
        isMobile
          ? { vertical: 'bottom', horizontal: 'center' } // Centered on mobile
          : { vertical: 'bottom', horizontal: 'left' } // bottom-left on desktop
      }
      sx={{
        // Responsive positioning and spacing
        bottom: isMobile ? 16 : 24,
        left: isMobile ? 'auto' : 24,
        right: isMobile ? 'auto' : 'auto',
        // Full width on mobile with padding
        width: isMobile ? 'calc(100% - 32px)' : 'auto',
        maxWidth: isMobile ? 'none' : '400px',
      }}
    >
      <Alert
        onClose={close}
        severity={severity}
        variant="filled"
        sx={{
          width: '100%',
          // Responsive typography
          fontSize: isMobile ? '0.875rem' : '1rem',
          // Responsive padding
          padding: isMobile ? '12px 16px' : '16px 20px',
          // Ensure text doesn't overflow
          wordBreak: 'break-word',
          // Better touch targets on mobile
          minHeight: isMobile ? '48px' : 'auto',
          '& .MuiAlert-message': {
            padding: 0,
            display: 'flex',
            alignItems: 'center',
          },
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default GlobalSnackbar;
