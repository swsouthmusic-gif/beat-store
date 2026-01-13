import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Typography, Button, Chip, Divider, Alert } from '@mui/material';
import { ArrowBackRounded, Download } from '@mui/icons-material';
import { genreColors } from '@/constants/genreColors';
import { levelLabelMap, levelColorMap, iconTypeMap } from '@/constants/licenseMaps';
import { useDownloadBeatMutation, useCheckPurchaseQuery } from '@/store/beatApi';
import { useAuthStore } from '@/store/authStore';
import type { BeatType } from '@/store/beatApi';
import StripeProvider from './StripeProvider';
import StripePaymentForm from './StripePaymentForm';
import DownloadLoading from './DownloadLoading';
import AlreadyPurchasedModal from './AlreadyPurchasedModal';
import JSZip from 'jszip';
import { generateLicenseAgreementPDF } from '@/utils/pdfUtils';

type LicenseInfo = {
  type: 'mp3' | 'wav' | 'stems';
  label: string; // Starter/Pro/Elite
  color: string; // hex
  includes: string[];
  price: number | string | null | undefined;
};

interface CheckoutStepProps {
  onBack: () => void;
  onComplete: () => void;
  beat?: BeatType | null;
  selectedDownloadType?: 'mp3' | 'wav' | 'stems' | null;
  selectedLicense?: LicenseInfo | null;
  playButton?: React.ReactNode;
  onRequestAuth?: (mode: 'login' | 'forgot' | 'signup') => void;
  onDownloadStateChange?: (isDownloading: boolean) => void;
}

const CheckoutStep = ({
  onBack,
  beat,
  selectedDownloadType,
  selectedLicense,
  playButton,
  onRequestAuth,
  onDownloadStateChange,
}: CheckoutStepProps) => {
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showAlreadyPurchasedModal, setShowAlreadyPurchasedModal] = useState(false);

  // Auth and API hooks
  const { isLoggedIn, userProfile } = useAuthStore();
  const [downloadBeat, { isLoading: isDownloading }] = useDownloadBeatMutation();

  // Ref to track previous render state to prevent unnecessary logging
  const prevRenderStateRef = useRef<{
    shouldRenderForm: boolean;
    isCheckingPurchase: boolean;
    hasPurchase: boolean;
    purchaseCheckComplete: boolean;
  } | null>(null);

  // Check if beat was already purchased
  const {
    data: purchaseCheck,
    isLoading: isCheckingPurchase,
    error: purchaseCheckError,
  } = useCheckPurchaseQuery(
    {
      beatId: beat?.id ?? 0,
      downloadType: selectedDownloadType ?? 'mp3',
    },
    {
      skip: !beat || !selectedDownloadType || !isLoggedIn,
    },
  );

  // Debug logging for purchase check
  useEffect(() => {
    if (beat && selectedDownloadType && isLoggedIn) {
      console.log('🔍 CheckoutStep: Purchase check params:', {
        beatId: beat.id,
        downloadType: selectedDownloadType,
        isLoggedIn,
        isCheckingPurchase,
        purchaseCheck,
        purchaseCheckError,
      });
    } else {
      console.log('⏸️ CheckoutStep: Purchase check skipped:', {
        hasBeat: !!beat,
        hasDownloadType: !!selectedDownloadType,
        isLoggedIn,
      });
    }
  }, [
    beat?.id,
    selectedDownloadType,
    isLoggedIn,
    isCheckingPurchase,
    purchaseCheck,
    purchaseCheckError,
  ]);

  // Show modal if purchase exists
  useEffect(() => {
    if (purchaseCheck?.has_purchase === true && !purchaseSuccess) {
      setShowAlreadyPurchasedModal(true);
      setError(null); // Clear any errors when showing the modal
    }
  }, [purchaseCheck?.has_purchase, purchaseSuccess]);

  // Format full name with middle initial for signature
  const fullName = useMemo(() => {
    if (!userProfile) return '';
    const parts = [
      userProfile.first_name,
      userProfile.middle_initial ? `${userProfile.middle_initial}.` : null,
      userProfile.last_name,
    ].filter(Boolean);
    return parts.join(' ');
  }, [userProfile]);

  const handleDownload = React.useCallback(async () => {
    if (!beat || !selectedDownloadType) return;

    try {
      // Notify parent component that download is starting
      onDownloadStateChange?.(true);

      // Use RTK Query mutation for download
      const beatBlob = await downloadBeat({
        beatId: beat.id,
        downloadType: selectedDownloadType,
      }).unwrap();

      // Generate License Agreement PDF
      const pdfBlob = generateLicenseAgreementPDF({
        beatName: beat.name,
        downloadType: selectedDownloadType,
        signatureName: fullName || 'User',
        date: new Date().toLocaleDateString(),
      });

      // Create zip file
      const zip = new JSZip();

      // Add beat file to zip
      const fileExtension = selectedDownloadType === 'stems' ? 'zip' : selectedDownloadType;
      const beatFileName = `${beat.name}_${selectedDownloadType}.${fileExtension}`;
      zip.file(beatFileName, beatBlob);

      // Add PDF to zip
      zip.file('License_Agreement.pdf', pdfBlob);

      // Generate zip blob
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Create blob URL and trigger download
      const blobUrl = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${beat.name}_${selectedDownloadType}_with_license.zip`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Download failed. Please try again.');
    } finally {
      // Notify parent component that download is finished
      onDownloadStateChange?.(false);
    }
  }, [beat, selectedDownloadType, downloadBeat, onDownloadStateChange, fullName]);

  const handlePaymentSuccess = React.useCallback(
    (downloadUrl: string) => {
      setPurchaseSuccess(true);
      setDownloadUrl(downloadUrl);
      setError(null);

      // Trigger download
      handleDownload();
    },
    [handleDownload],
  );

  const handlePaymentError = React.useCallback((errorMessage: string) => {
    // If error is about already purchased, show the modal instead
    if (
      errorMessage.toLowerCase().includes('already purchased') ||
      errorMessage.toLowerCase().includes('already have this purchase') ||
      errorMessage === 'already_purchased'
    ) {
      setShowAlreadyPurchasedModal(true);
      setError(null);
      return;
    }
    setError(errorMessage);
  }, []);

  const handleClientSecretChange = React.useCallback((secret: string | null) => {
    setClientSecret(secret);
  }, []);

  const imgRef = useRef<HTMLImageElement>(null);

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

  return (
    <>
      {/* Already Purchased Modal */}
      <AlreadyPurchasedModal
        open={showAlreadyPurchasedModal}
        onClose={() => setShowAlreadyPurchasedModal(false)}
        beat={beat ?? null}
        downloadType={selectedDownloadType ?? null}
        onDownload={handleDownload}
        isDownloading={isDownloading}
      />

      {/* Download Loading Overlay */}
      <DownloadLoading
        isVisible={isDownloading}
        downloadType={selectedDownloadType || 'mp3'}
        beatName={beat?.name || 'Beat'}
      />

      <Box className="checkout-step" sx={{ paddingBottom: '8px', paddingTop: '8px' }}>
        {/* Summary Section */}
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
                    backgroundColor: levelColorMap[selectedDownloadType] + '20',
                    color: levelColorMap[selectedDownloadType],
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    border: `1px solid ${levelColorMap[selectedDownloadType]}40`,
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

        <Divider sx={{ my: 2 }} />

        {/* Authentication Check */}
        {!isLoggedIn && !purchaseSuccess && (
          <Box className="checkout-form">
            <Typography variant="h6" sx={{ paddingBottom: '16px' }}>
              Sign In Required
            </Typography>
            <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
              You need to sign in to complete your purchase.
            </Alert>
            <Button
              variant="contained"
              onClick={() => onRequestAuth?.('login')}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                background: 'linear-gradient(135deg, #1db954 0%, #1ed760 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1aa34a 0%, #1db954 100%)',
                },
              }}
            >
              Sign In
            </Button>
          </Box>
        )}

        {/* Loading state while checking purchase */}
        {isLoggedIn && isCheckingPurchase && beat && selectedDownloadType && (
          <Box className="checkout-form">
            <Typography variant="h6" sx={{ paddingBottom: '16px' }}>
              Checking purchase status...
            </Typography>
          </Box>
        )}

        {/* Stripe Payment Form - Only show if not already purchased and not checking */}
        {(() => {
          // CRITICAL: Don't render form until purchase check is complete
          const purchaseCheckComplete = purchaseCheck !== undefined;
          const hasPurchase = purchaseCheck?.has_purchase === true;
          const noPurchase = purchaseCheck?.has_purchase === false;

          const shouldRenderForm = Boolean(
            isLoggedIn &&
              !purchaseSuccess &&
              !showAlreadyPurchasedModal &&
              !isCheckingPurchase &&
              purchaseCheckComplete &&
              noPurchase &&
              !hasPurchase && // Double check
              beat &&
              selectedDownloadType &&
              selectedLicense,
          );

          // Debug logging - only log when state actually changes
          const currentState = {
            shouldRenderForm,
            isCheckingPurchase,
            hasPurchase,
            purchaseCheckComplete,
          };

          if (
            !prevRenderStateRef.current ||
            prevRenderStateRef.current.shouldRenderForm !== shouldRenderForm ||
            prevRenderStateRef.current.isCheckingPurchase !== isCheckingPurchase ||
            prevRenderStateRef.current.hasPurchase !== hasPurchase ||
            prevRenderStateRef.current.purchaseCheckComplete !== purchaseCheckComplete
          ) {
            if (shouldRenderForm) {
              console.log('✅ CheckoutStep: Rendering StripePaymentForm - No purchase found');
            } else if (isCheckingPurchase) {
              console.log('⏳ CheckoutStep: Waiting for purchase check to complete...');
            } else if (hasPurchase) {
              console.log('⛔ CheckoutStep: Purchase exists - NOT rendering payment form');
            } else if (!purchaseCheckComplete) {
              console.log('⏳ CheckoutStep: Purchase check result not available yet');
            }
            prevRenderStateRef.current = currentState;
          }

          if (!shouldRenderForm || !beat || !selectedDownloadType || !selectedLicense) {
            return null;
          }

          return (
            <Box className="checkout-form">
              <Typography variant="h6" sx={{ paddingBottom: '16px' }}>
                Complete Your Purchase
              </Typography>

              <StripeProvider
                clientSecret={clientSecret || undefined}
                amount={selectedLicense.price ? parseFloat(selectedLicense.price.toString()) : 0}
                currency="usd"
              >
                <StripePaymentForm
                  key={`${beat.id}-${selectedDownloadType}-${selectedLicense.price}`}
                  beat={beat}
                  selectedDownloadType={selectedDownloadType}
                  selectedLicense={selectedLicense}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                  onClientSecretChange={handleClientSecretChange}
                  clientSecret={clientSecret}
                  shouldCreateIntent={true}
                />
              </StripeProvider>
            </Box>
          );
        })()}

        {/* Show message if already purchased but modal is closed */}
        {isLoggedIn &&
          purchaseCheck?.has_purchase === true &&
          !showAlreadyPurchasedModal &&
          !purchaseSuccess && (
            <Box className="checkout-form">
              <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
                You've already purchased this download. Click the button below to download again.
              </Alert>
              <Button
                variant="contained"
                onClick={() => setShowAlreadyPurchasedModal(true)}
                startIcon={<Download />}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #1db954 0%, #1ed760 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1aa34a 0%, #1db954 100%)',
                  },
                }}
              >
                Download Again
              </Button>
            </Box>
          )}

        {/* Success/Error Messages */}
        {purchaseSuccess && (
          <Box sx={{ mb: 3 }}>
            <Alert
              severity="success"
              sx={{
                mb: 2,
                borderRadius: '12px',
              }}
            >
              Payment successful! Your download should start automatically.
            </Alert>
            {downloadUrl && (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  onClick={() => handleDownload()}
                  startIcon={<Download />}
                  disabled={isDownloading}
                  sx={{
                    borderRadius: '12px',
                    textTransform: 'none',
                    color: '#fff',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #43a047 0%, #5cb85c 100%)',
                    },
                  }}
                >
                  {isDownloading ? 'Downloading...' : 'Download Again'}
                </Button>
              </Box>
            )}
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {/* Terms and Security */}
        <Box className="actions-footer">
          {/* Action Buttons */}
          <Box
            className="checkout-actions"
            sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}
          >
            {!purchaseSuccess && (
              <Button
                variant="outlined"
                onClick={onBack}
                startIcon={<ArrowBackRounded />}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 500,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'text.primary',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                Back
              </Button>
            )}
            {/* <Button
            variant="contained"
            onClick={onComplete}
            disabled={!purchaseSuccess}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              background: purchaseSuccess
                ? 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)'
                : 'rgba(255,255,255,0.2)',
              color: purchaseSuccess ? 'white' : 'rgba(255, 255, 255, .3)',
              '&:hover': {
                background: purchaseSuccess
                  ? 'linear-gradient(135deg, #43a047 0%, #5cb85c 100%)'
                  : 'rgba(0, 0, 0, 0.12)',
              },
              '&:disabled': {
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, .3)',
              },
            }}
          >
            Download
          </Button> */}
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default CheckoutStep;
