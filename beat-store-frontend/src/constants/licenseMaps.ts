export const downloadTypes = ['mp3', 'wav', 'stems'] as const;
export type DownloadType = (typeof downloadTypes)[number];

export const iconTypeMap: Record<DownloadType, string[]> = {
  mp3: ['mp3'],
  wav: ['mp3', 'wav'],
  stems: ['mp3', 'wav', 'stems'],
};

export const levelColorMap: Record<DownloadType, string> = {
  mp3: '#DAA12F',
  wav: '#3B85CA',
  stems: '#7851A9',
};

export const levelLabelMap: Record<DownloadType, string> = {
  mp3: 'Starter',
  wav: 'Pro',
  stems: 'Elite',
};
