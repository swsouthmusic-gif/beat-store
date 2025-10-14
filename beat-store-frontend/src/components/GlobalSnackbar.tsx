// /components/GlobalSnackbar.tsx
import * as React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useToastStore } from '@/store/toastStore';

const GlobalSnackbar: React.FC = () => {
  const { open, message, severity, autoHideDuration, close } = useToastStore();

  return (
    <Snackbar
      open={open}
      onClose={close}
      autoHideDuration={autoHideDuration}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} // bottom-left
    >
      <Alert onClose={close} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default GlobalSnackbar;
