import { useRef, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Chip,
  Divider,
  IconButton,
  Modal,
} from '@mui/material';
import { UnfoldMore, Close } from '@mui/icons-material';
import { genreColors } from '@/constants/genreColors';
import { levelLabelMap, levelColorMap, iconTypeMap } from '@/constants/licenseMaps';
import type { BeatType } from '@/store/beatApi';
import { useAuthStore } from '@/store/authStore';

type LicenseInfo = {
  type: 'mp3' | 'wav' | 'stems';
  label: string; // Starter/Pro/Elite
  color: string; // hex
  includes: string[];
  price: number | string | null | undefined;
};

interface LegalAgreementStepProps {
  agreed: boolean;
  setAgreed: (value: boolean) => void;
  onCancel: () => void;
  beat?: BeatType | null;
  selectedDownloadType?: 'mp3' | 'wav' | 'stems' | null;
  selectedLicense?: LicenseInfo | null;
  playButton?: React.ReactNode;
  onEditProfile?: () => void;
}

const LegalAgreementStep = ({
  agreed,
  setAgreed,
  beat,
  selectedDownloadType,
  selectedLicense,
  playButton,
}: LegalAgreementStepProps) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const { userProfile } = useAuthStore();
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  // Generate consistent random background color for fallback
  const fallbackColor = useMemo(() => {
    if (!beat?.name) return 'hsl(0, 0%, 50%)';
    let hash = 0;
    for (let i = 0; i < beat.name.length; i++) {
      hash = beat.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    const saturation = 60 + (Math.abs(hash) % 20);
    const lightness = 45 + (Math.abs(hash) % 15);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }, [beat?.name]);

  // Format full name with middle initial
  const fullName = useMemo(() => {
    if (!userProfile) return '';
    const parts = [
      userProfile.first_name,
      userProfile.middle_initial ? `${userProfile.middle_initial}.` : null,
      userProfile.last_name,
    ].filter(Boolean);
    return parts.join(' ');
  }, [userProfile]);

  return (
    <Box className="legal-agreement" sx={{ paddingBottom: '8px', paddingTop: '8px' }}>
      {beat && (
        <Box className="beat-selected-container">
          <Box className="beat-selected">
            <Box className="beat-cover-container">
              {beat.cover_art ? (
                <img
                  ref={imgRef}
                  src={beat.cover_art ?? undefined}
                  alt={beat.name}
                  className="beat-cover-art"
                  crossOrigin="anonymous"
                />
              ) : (
                <Box
                  className="beat-cover-art"
                  sx={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: fallbackColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    textAlign: 'center',
                    padding: '16px',
                    fontSize: '18px',
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                ></Box>
              )}

              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, .36)',
                  borderRadius: '8px',
                  zIndex: 50,
                }}
              />

              {/* Play button */}
              {playButton && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 100,
                  }}
                >
                  {playButton}
                </Box>
              )}
            </Box>
            <Box>
              <Typography fontWeight={600} sx={{ paddingBottom: '4px' }}>
                {beat.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  size="small"
                  label={beat.genre}
                  sx={{
                    backgroundColor: genreColors[beat.genre],
                    color: '#fff',
                  }}
                />
                <Typography variant="body2" color="text.primary" sx={{ opacity: '.8' }}>
                  {beat.bpm} BPM • {beat.scale}
                </Typography>
              </Box>
            </Box>
          </Box>
          {selectedDownloadType && selectedLicense && (
            <Box className="summary">
              {/* License Package Chip */}
              <Chip
                label={levelLabelMap[selectedDownloadType]}
                sx={{
                  backgroundColor: levelColorMap[selectedDownloadType] + '20', // 20% opacity
                  color: levelColorMap[selectedDownloadType],
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: `1px solid ${levelColorMap[selectedDownloadType]}40`, // 40% opacity border
                }}
              />

              {/* Icon Types */}
              <Box
                className="icon-types"
                sx={{
                  display: 'flex',
                  gap: 0.5,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                {iconTypeMap[selectedDownloadType].map((iconType, index) => (
                  <Chip
                    key={index}
                    label={iconType.toUpperCase()}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  />
                ))}
              </Box>

              {/* Total Price */}
              <Box className="total-price-container">
                <Typography variant="body2" className="total-price-label">
                  Total:
                </Typography>
                <Typography
                  variant="h6"
                  className="total-price"
                  sx={{
                    color: levelColorMap[selectedDownloadType],
                  }}
                >
                  ${selectedLicense.price}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}
      <Divider sx={{ my: 1 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ paddingBottom: '8px' }}>
          License Agreement
        </Typography>
        <IconButton
          size="small"
          onClick={() => setShowAgreementModal(true)}
          sx={{ color: 'text.primary', opacity: 0.7, '&:hover': { opacity: 1 } }}
        >
          <UnfoldMore fontSize="small" sx={{ transform: 'rotate(45deg)' }} />
        </IconButton>
      </Box>
      <Box
        className="legal-agreement-box"
        sx={theme => ({
          maxHeight: 300,
          overflowY: 'auto',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          p: 3,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          lineHeight: 1.7,
          whiteSpace: 'pre-line',
        })}
      >
        <Typography variant="h6" gutterBottom>
          Non-Exclusive License Agreement
        </Typography>

        <Typography variant="body2" paragraph>
          This License Agreement ("Agreement") governs your use of the selected beat ("Beat") made
          available through this platform. By continuing, you ("Licensee") acknowledge and agree to
          the following terms:
        </Typography>

        <ol style={{ paddingLeft: 20 }}>
          <li>
            <strong>License Type:</strong> You are granted a limited, non-exclusive,
            non-transferable license to use the Beat strictly for personal, non-commercial purposes.
          </li>
          <li>
            <strong>Permitted Uses:</strong> You may use the Beat for:
            <ul>
              <li>Listening for inspiration or practice</li>
              <li>Non-monetized social content (Instagram, TikTok, etc.)</li>
              <li>Demo recordings that are not distributed for profit</li>
            </ul>
          </li>
          <li>
            <strong>Prohibited Uses:</strong> You may <u>not</u>:
            <ul>
              <li>Use the Beat in monetized content (e.g. YouTube, Spotify, Apple Music, etc.)</li>
              <li>
                Use the Beat in commercial products (advertising, film, games, podcasts, etc.)
              </li>
              <li>Sell, sublicense, remix, or distribute the Beat as-is or altered</li>
              <li>Claim ownership of the Beat</li>
            </ul>
          </li>
          <li>
            <strong>Ownership:</strong> The Beat remains the sole property of the creator. This
            license does not transfer any copyright, publishing, or master ownership rights.
          </li>
          <li>
            <strong>Term:</strong> This license is perpetual, provided the terms are not violated.
          </li>
          <li>
            <strong>Termination:</strong> This license is automatically terminated if you breach any
            of the above terms. Upon termination, all usage must cease and any distributed content
            must be removed.
          </li>
          <li>
            <strong>Liability:</strong> Unauthorized or commercial use of the Beat may result in
            legal action, takedown notices, and claims for damages.
          </li>
        </ol>

        <Typography variant="body2" paragraph>
          By continuing, you confirm that you have read, understood, and agreed to the terms of this
          license.
        </Typography>
      </Box>

      <FormControlLabel
        control={<Checkbox checked={agreed} onChange={e => setAgreed(e.target.checked)} />}
        label="I have read and agree to the terms above"
      />

      {/* License Agreement PDF Modal */}
      <Modal
        open={showAgreementModal}
        onClose={() => setShowAgreementModal(false)}
        aria-labelledby="license-agreement-pdf-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1400, // Higher than BeatDrawer modal
        }}
        slotProps={{
          backdrop: {
            style: {
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
            },
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '90%',
            maxWidth: '620px',
            maxHeight: '92vh',
            borderRadius: 2,
            boxShadow: 24,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'transparent',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              paddingBottom: 1,
            }}
          >
            <IconButton onClick={() => setShowAgreementModal(false)}>
              <Close />
            </IconButton>
          </Box>
          {/* PDF-like Content */}
          <Box
            sx={{
              p: 4,
              overflowY: 'auto',
              bgcolor: 'background.paper',
              height: '100%',
              color: 'text.primary',
              fontFamily: 'Georgia, serif',
              fontSize: '12px',
              lineHeight: 1.8,
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4, borderBottom: '2px solid #000', pb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Non-Exclusive License Agreement
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Beat Purchase Agreement
              </Typography>
            </Box>

            {/* Agreement Content */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="body2" paragraph sx={{ mb: 2 }}>
                This License Agreement ("Agreement") governs your use of the selected beat ("Beat")
                made available through this platform. By continuing, you ("Licensee") acknowledge
                and agree to the following terms:
              </Typography>

              <ol style={{ paddingLeft: 24, marginBottom: 16 }}>
                <li style={{ marginBottom: 12 }}>
                  <strong>License Type:</strong> You are granted a limited, non-exclusive,
                  non-transferable license to use the Beat strictly for personal, non-commercial
                  purposes.
                </li>
                <li style={{ marginBottom: 12 }}>
                  <strong>Permitted Uses:</strong> You may use the Beat for:
                  <ul style={{ paddingLeft: 20, marginTop: 8 }}>
                    <li>Listening for inspiration or practice</li>
                    <li>Non-monetized social content (Instagram, TikTok, etc.)</li>
                    <li>Demo recordings that are not distributed for profit</li>
                  </ul>
                </li>
                <li style={{ marginBottom: 12 }}>
                  <strong>Prohibited Uses:</strong> You may <u>not</u>:
                  <ul style={{ paddingLeft: 20, marginTop: 8 }}>
                    <li>
                      Use the Beat in monetized content (e.g. YouTube, Spotify, Apple Music, etc.)
                    </li>
                    <li>
                      Use the Beat in commercial products (advertising, film, games, podcasts, etc.)
                    </li>
                    <li>Sell, sublicense, remix, or distribute the Beat as-is or altered</li>
                    <li>Claim ownership of the Beat</li>
                  </ul>
                </li>
                <li style={{ marginBottom: 12 }}>
                  <strong>Ownership:</strong> The Beat remains the sole property of the creator.
                  This license does not transfer any copyright, publishing, or master ownership
                  rights.
                </li>
                <li style={{ marginBottom: 12 }}>
                  <strong>Term:</strong> This license is perpetual, provided the terms are not
                  violated.
                </li>
                <li style={{ marginBottom: 12 }}>
                  <strong>Termination:</strong> This license is automatically terminated if you
                  breach any of the above terms. Upon termination, all usage must cease and any
                  distributed content must be removed.
                </li>
                <li style={{ marginBottom: 12 }}>
                  <strong>Liability:</strong> Unauthorized or commercial use of the Beat may result
                  in legal action, takedown notices, and claims for damages.
                </li>
              </ol>

              <Typography variant="body2" paragraph sx={{ mt: 3 }}>
                By continuing, you confirm that you have read, understood, and agreed to the terms
                of this license.
              </Typography>
            </Box>

            {/* Signature Section */}
            {fullName && (
              <Box
                sx={{
                  mt: 6,
                  pt: 4,
                  borderTop: theme => `1px solid ${theme.palette.divider}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="body2"
                      sx={theme => ({
                        fontStyle: 'italic',
                        fontFamily: 'cursive',
                        borderBottom: `1px solid ${theme.palette.text.primary}`,
                        display: 'inline-block',
                        minWidth: '250px',
                        pb: 0.5,
                        mb: 1,
                      })}
                    >
                      {fullName}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: '#666', mt: 0.5 }}>
                      Signature
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        borderBottom: theme => `1px solid ${theme.palette.text.primary}`,
                        display: 'inline-block',
                        minWidth: '150px',
                        pb: 0.5,
                        mb: 1,
                      }}
                    >
                      {new Date().toLocaleDateString()}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}
                    >
                      Date
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default LegalAgreementStep;
