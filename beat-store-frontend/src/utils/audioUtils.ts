/**
 * Creates a 30-second snippet from an MP3 file URL
 * @param mp3Url - The URL of the full MP3 file
 * @returns A Promise that resolves to a Blob URL of the 30-second snippet
 */
export async function create30SecondSnippet(mp3Url: string): Promise<string> {
  try {
    // Fetch the audio file
    const response = await fetch(mp3Url);
    const arrayBuffer = await response.arrayBuffer();

    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Calculate the number of samples for 30 seconds
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const snippetDuration = Math.min(30, duration); // Use 30 seconds or full duration if shorter
    const numberOfSamples = Math.floor(snippetDuration * sampleRate);

    // Create a new audio buffer with only the first 30 seconds
    const snippetBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      numberOfSamples,
      sampleRate,
    );

    // Copy the first 30 seconds of each channel
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = snippetBuffer.getChannelData(channel);
      for (let i = 0; i < numberOfSamples; i++) {
        outputData[i] = inputData[i];
      }
    }

    // Convert the audio buffer back to a WAV blob
    const wavBlob = audioBufferToWav(snippetBuffer);
    const blobUrl = URL.createObjectURL(wavBlob);

    return blobUrl;
  } catch (error) {
    console.error('Error creating 30-second snippet:', error);
    throw error;
  }
}

/**
 * Converts an AudioBuffer to a WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * numChannels * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);

  // Convert audio data
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Creates a cached 30-second snippet URL from mp3_file
 * Blob URLs are cached and should not be revoked while in use
 */
const snippetCache = new Map<string, string>();
const blobUrlRefCount = new Map<string, number>();

/**
 * Revoke a blob URL only if it's no longer referenced
 */
function revokeBlobUrlIfUnused(blobUrl: string) {
  const refCount = blobUrlRefCount.get(blobUrl) || 0;
  if (refCount <= 0) {
    URL.revokeObjectURL(blobUrl);
    blobUrlRefCount.delete(blobUrl);
    // Remove from cache
    for (const [key, value] of snippetCache.entries()) {
      if (value === blobUrl) {
        snippetCache.delete(key);
        break;
      }
    }
  }
}

/**
 * Increment reference count for a blob URL
 */
function addBlobUrlRef(blobUrl: string) {
  blobUrlRefCount.set(blobUrl, (blobUrlRefCount.get(blobUrl) || 0) + 1);
}

/**
 * Decrement reference count for a blob URL
 */
export function releaseBlobUrl(blobUrl: string) {
  const refCount = blobUrlRefCount.get(blobUrl) || 0;
  if (refCount > 0) {
    blobUrlRefCount.set(blobUrl, refCount - 1);
    revokeBlobUrlIfUnused(blobUrl);
  }
}

export async function get30SecondSnippetUrl(mp3Url: string | null): Promise<string | null> {
  if (!mp3Url) return null;

  // Check cache first
  if (snippetCache.has(mp3Url)) {
    const cachedUrl = snippetCache.get(mp3Url)!;
    addBlobUrlRef(cachedUrl);
    return cachedUrl;
  }

  try {
    const snippetUrl = await create30SecondSnippet(mp3Url);
    snippetCache.set(mp3Url, snippetUrl);
    addBlobUrlRef(snippetUrl);
    return snippetUrl;
  } catch (error) {
    console.error('Failed to create snippet:', error);
    return null;
  }
}
