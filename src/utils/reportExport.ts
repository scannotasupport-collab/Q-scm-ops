import { ChatMessage, UserIndustryProfile } from '../types';

/**
 * Downloads a structured text report containing Q's advice, user issue, timeline, KPIs, and follow-up reminders.
 */
export function downloadAdviceTextReport(
  message: ChatMessage,
  userProfile: UserIndustryProfile | null,
  previousUserMessage?: ChatMessage
) {
  const dateObj = new Date(message.timestamp);
  const dateFormatted = dateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatted = dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const industry = userProfile?.industry || 'Operasional Pabrik & Supply Chain';
  const role = userProfile?.role || 'Tim Operasional';
  const userProblem = previousUserMessage?.transcription || previousUserMessage?.text || 'Isu Operasional Pabrik';

  let content = `================================================================================
LAPORAN SARAN & REKOMENDASI OPERASIONAL PABRIK & SUPPLY CHAIN
Q • Rekan Diskusi Berbasis Suara & AI Operasional
================================================================================

TANGGAL & WAKTU : ${dateFormatted}, ${timeFormatted} WIB
SEKTOR INDUSTRI : ${industry}
PERAN PENGGUNA  : ${role}
STATUS          : Rekomendasi Solusi Siap Diterapkan

--------------------------------------------------------------------------------
1. PERTANYAAN / KENDALA OPERASIONAL (USER):
--------------------------------------------------------------------------------
"${userProblem}"

--------------------------------------------------------------------------------
2. REKOMENDASI & TINDAKAN OPERASIONAL (Q):
--------------------------------------------------------------------------------
${message.text.replace(/###/g, '').replace(/\*\*/g, '')}
`;

  if (message.detailedExplanation) {
    content += `
--------------------------------------------------------------------------------
3. BEDAH TEKNIS & METODOLOGI MENDALAM:
--------------------------------------------------------------------------------
${message.detailedExplanation.replace(/###/g, '').replace(/\*\*/g, '')}
`;
  }

  if (message.glossary && message.glossary.length > 0) {
    content += `
--------------------------------------------------------------------------------
4. GLOSARIUM & STANDAR ISTILAH PABRIK TERKAIT:
--------------------------------------------------------------------------------
`;
    message.glossary.forEach((item, idx) => {
      content += `${idx + 1}. ${item.term}:\n   ${item.definition}\n\n`;
    });
  }

  if (message.detectedReminder) {
    content += `
--------------------------------------------------------------------------------
5. TINDAK LANJUT & JADWAL FOLLOW-UP:
--------------------------------------------------------------------------------
Judul Tindak Lanjut : ${message.detectedReminder.title}
Instruksi Pengerjaan: ${message.detectedReminder.detail || '-'}
Target Jadwal       : ${new Date(message.detectedReminder.dueTime).toLocaleString('id-ID')}
Kategori / Prioritas: ${message.detectedReminder.category} (${message.detectedReminder.priority})
`;
  }

  if (message.whatsappReportDraft) {
    content += `
--------------------------------------------------------------------------------
6. DRAF FORMAT LAPORAN WHATSAPP:
--------------------------------------------------------------------------------
${message.whatsappReportDraft}
`;
  }

  content += `
================================================================================
Dibuat secara otomatis melalui Q • Rekan Diskusi Operasional Pabrik & SCM
================================================================================
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeDate = dateObj.toISOString().slice(0, 10);
  const safeTime = `${String(dateObj.getHours()).padStart(2, '0')}${String(dateObj.getMinutes()).padStart(2, '0')}`;
  link.href = url;
  link.download = `Saran_Operasional_Q_${safeDate}_${safeTime}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a Word-compatible (.doc) formatted report ready for printing or reporting to management.
 */
export function downloadAdviceDocReport(
  message: ChatMessage,
  userProfile: UserIndustryProfile | null,
  previousUserMessage?: ChatMessage
) {
  const dateObj = new Date(message.timestamp);
  const dateFormatted = dateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatted = dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const industry = userProfile?.industry || 'Operasional Pabrik & Supply Chain';
  const role = userProfile?.role || 'Tim Operasional';
  const userProblem = previousUserMessage?.transcription || previousUserMessage?.text || 'Isu Operasional Pabrik';

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Saran Operasional Q - ${dateFormatted}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; }
  h1 { color: #1e1b4b; border-bottom: 2px solid #4338ca; padding-bottom: 8px; font-size: 20pt; }
  h2 { color: #312e81; margin-top: 20px; font-size: 14pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .meta-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
  .problem-box { background: #eef2ff; border-left: 4px solid #4f46e5; padding: 12px 16px; margin-bottom: 20px; font-style: italic; }
  .solution-box { white-space: pre-wrap; margin-bottom: 20px; }
  .reminder-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px 16px; border-radius: 8px; }
  .footer { margin-top: 32px; font-size: 9pt; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px; }
</style>
</head>
<body>
  <h1>📋 LAPORAN REKOMENDASI OPERASIONAL PABRIK</h1>
  <div class="meta-box">
    <strong>Tanggal:</strong> ${dateFormatted}, ${timeFormatted} WIB<br>
    <strong>Sektor Industri:</strong> ${industry}<br>
    <strong>Peran:</strong> ${role}<br>
    <strong>Disusun Oleh:</strong> Q • Rekan Diskusi Operasional Pabrik & SCM
  </div>

  <h2>1. Kendala / Masalah yang Didiskusikan</h2>
  <div class="problem-box">"${userProblem}"</div>

  <h2>2. Rekomendasi Solusi & Rencana Tindakan</h2>
  <div class="solution-box">${message.text.replace(/\n/g, '<br>')}</div>

  ${message.detailedExplanation ? `
  <h2>3. Bedah Teknis & Prosedur SOP</h2>
  <div class="solution-box">${message.detailedExplanation.replace(/\n/g, '<br>')}</div>
  ` : ''}

  ${message.detectedReminder ? `
  <h2>4. Jadwal Tindak Lanjut & Reminder</h2>
  <div class="reminder-box">
    <strong>Judul:</strong> ${message.detectedReminder.title}<br>
    <strong>Waktu:</strong> ${new Date(message.detectedReminder.dueTime).toLocaleString('id-ID')}<br>
    <strong>Kategori:</strong> ${message.detectedReminder.category} (${message.detectedReminder.priority})<br>
    <strong>Detail:</strong> ${message.detectedReminder.detail || '-'}
  </div>
  ` : ''}

  <div class="footer">
    Dokumen ini digenerate secara otomatis via sistem Q • Ahli Operasional Pabrik & Supply Chain Berbasis Suara.
  </div>
</body>
</html>`;

  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeDate = dateObj.toISOString().slice(0, 10);
  link.href = url;
  link.download = `Saran_Operasional_Q_${safeDate}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
