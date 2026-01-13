import { jsPDF } from 'jspdf';

interface LicenseAgreementPDFOptions {
  beatName: string;
  downloadType: 'mp3' | 'wav' | 'stems';
  signatureName: string;
  date: string;
}

/**
 * Generates a PDF document for the License Agreement
 */
export const generateLicenseAgreementPDF = ({
  beatName,
  downloadType,
  signatureName,
  date,
}: LicenseAgreementPDFOptions): Blob => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, fontSize: number, isBold = false) => {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }

    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (yPos > pageHeight - margin - 10) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += fontSize * 0.5 + 2;
    });
  };

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Non-Exclusive License Agreement', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Beat Purchase Agreement', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Draw a line under header
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Introduction
  addWrappedText(
    `This License Agreement ("Agreement") governs your use of the selected beat ("Beat") made available through this platform. By continuing, you ("Licensee") acknowledge and agree to the following terms:`,
    11,
  );
  yPos += 5;

  // Terms
  const terms = [
    {
      title: 'License Type:',
      content:
        'You are granted a limited, non-exclusive, non-transferable license to use the Beat strictly for personal, non-commercial purposes.',
    },
    {
      title: 'Permitted Uses:',
      content:
        'You may use the Beat for:\n• Listening for inspiration or practice\n• Non-monetized social content (Instagram, TikTok, etc.)\n• Demo recordings that are not distributed for profit',
    },
    {
      title: 'Prohibited Uses:',
      content:
        'You may not:\n• Use the Beat in monetized content (e.g. YouTube, Spotify, Apple Music, etc.)\n• Use the Beat in commercial products (advertising, film, games, podcasts, etc.)\n• Sell, sublicense, remix, or distribute the Beat as-is or altered\n• Claim ownership of the Beat',
    },
    {
      title: 'Ownership:',
      content:
        'The Beat remains the sole property of the creator. This license does not transfer any copyright, publishing, or master ownership rights.',
    },
    {
      title: 'Term:',
      content: 'This license is perpetual, provided the terms are not violated.',
    },
    {
      title: 'Termination:',
      content:
        'This license is automatically terminated if you breach any of the above terms. Upon termination, all usage must cease and any distributed content must be removed.',
    },
    {
      title: 'Liability:',
      content:
        'Unauthorized or commercial use of the Beat may result in legal action, takedown notices, and claims for damages.',
    },
  ];

  terms.forEach((term, index) => {
    if (yPos > pageHeight - margin - 20) {
      doc.addPage();
      yPos = margin;
    }

    // Term number and title
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${term.title}`, margin, yPos);
    yPos += 6;

    // Term content
    doc.setFont('helvetica', 'normal');
    const contentLines = term.content.split('\n');
    contentLines.forEach((line: string) => {
      if (line.startsWith('•')) {
        doc.text(`  ${line}`, margin + 5, yPos);
      } else {
        addWrappedText(line, 10);
        yPos -= 4; // Adjust since addWrappedText already increments yPos
      }
      yPos += 4;
    });
    yPos += 3;
  });

  yPos += 5;

  // Final statement
  if (yPos > pageHeight - margin - 30) {
    doc.addPage();
    yPos = margin;
  }

  addWrappedText(
    'By continuing, you confirm that you have read, understood, and agreed to the terms of this license.',
    11,
  );
  yPos += 10;

  // Signature section
  if (yPos > pageHeight - margin - 40) {
    doc.addPage();
    yPos = margin;
  }

  // Draw a line above signature
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Signature
  doc.setFontSize(11);
  doc.setFont('helvetica', 'italic');
  const signatureY = yPos;
  doc.text(signatureName, margin, signatureY);
  doc.setLineWidth(0.5);
  doc.line(margin, signatureY + 2, margin + 60, signatureY + 2);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature', margin, signatureY + 6);

  // Date
  const dateY = yPos;
  doc.setFontSize(11);
  doc.text(date, pageWidth - margin - 40, dateY);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - margin - 40, dateY + 2, pageWidth - margin, dateY + 2);
  doc.setFontSize(8);
  doc.text('Date', pageWidth - margin - 40, dateY + 6);

  // Beat information footer
  yPos = pageHeight - margin - 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Beat: ${beatName}`, margin, yPos);
  doc.text(`Download Type: ${downloadType.toUpperCase()}`, margin, yPos + 4);

  // Generate PDF blob
  return doc.output('blob');
};
