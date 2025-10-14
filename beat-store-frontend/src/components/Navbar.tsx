import { useState } from 'react';

import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  useColorScheme,
} from '@mui/material';
import { Logout, Login, Edit } from '@mui/icons-material';

import { useAuthStore } from '@/store/authStore';
import EditProfile from '@/components/EditProfile';

import '@/components/Style/navbar.scss';

interface NavbarProps {
  onLogout: () => void;
  onSignin: () => void;
}

const Navbar = ({ onLogout, onSignin }: NavbarProps) => {
  const { mode } = useColorScheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const { isLoggedIn, userProfile } = useAuthStore();

  console.log('modeee: ', mode);
  if (!mode) return null;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditProfile = () => {
    setEditProfileOpen(true);
    handleMenuClose();
  };

  return (
    <AppBar position="sticky" color="default" className="navbar">
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          Beat Store
        </Typography>

        <IconButton onClick={handleMenuOpen} className="profile-btn">
          <Avatar className="avatar" alt="User Avatar" src={userProfile?.avatar || undefined} />
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              className: 'avatar-menu',
            },
          }}
        >
          {/* <MenuItem
            className="avatar-menu-item"
            onClick={() => {
              setMode(mode === 'light' ? 'dark' : 'light');
              setAnchorEl(null);
            }}
          >
            {mode === 'dark' ? (
              <LightModeRounded className="icon" />
            ) : (
              <DarkModeRounded className="icon" />
            )}
            <Typography>{mode === 'dark' ? 'Light' : 'Dark'} theme</Typography>
          </MenuItem> */}

          {isLoggedIn && (
            <MenuItem className="avatar-menu-item" onClick={handleEditProfile}>
              <Edit className="icon" />
              <Typography>Edit profile</Typography>
            </MenuItem>
          )}

          {isLoggedIn ? (
            <MenuItem
              className="avatar-menu-item"
              onClick={() => {
                onLogout();
                handleMenuClose();
              }}
            >
              <Logout className="icon" />
              <Typography>Logout</Typography>
            </MenuItem>
          ) : (
            <MenuItem
              className="avatar-menu-item"
              onClick={() => {
                onSignin();
                handleMenuClose();
              }}
            >
              <Login className="icon" />
              <Typography>Sign in</Typography>
            </MenuItem>
          )}
        </Menu>
      </Toolbar>

      <EditProfile open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
    </AppBar>
  );
};

export default Navbar;
