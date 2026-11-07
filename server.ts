import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Support base64 audio payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface ChatRequestBody {
  audioBase64?: string;
  audioMimeType?: string;
  userInputText?: string;
  userIndustry?: string;
  userRole?: string;
  history?: Array<{ role: 'user' | 'model'; text: string; timestamp?: string }>;
  factoryMemory?: Array<{ id: string; category: string; fact: string; date: string }>;
  activeReminders?: Array<{ id: string; title: string; dueTime: string; status: string }>;
  clientCurrentTime?: string;
}

app.post('/api/chat', async (req: Request<{}, {}, ChatRequestBody>, res: Response) => {
  try {
    const {
      audioBase64,
      audioMimeType = 'audio/webm',
      userInputText,
      userIndustry = 'Manufaktur Umum',
      userRole = 'Operasional Pabrik',
      history = [],
      factoryMemory = [],
      activeReminders = [],
      clientCurrentTime = new Date().toISOString(),
    } = req.body;

    if (!audioBase64 && !userInputText?.trim()) {
      res.status(400).json({ error: 'Audio atau teks masukan diperlukan.' });
      return;
    }

    const currentIsoDate = clientCurrentTime;

    // Build context prompt
    const industryContext = `SEKTOR INDUSTRI PABRIK: ${userIndustry} (Posisi User: ${userRole})
ARAHAN SPESIFIK INDUSTRI:
- Anda WAJIB menyesuaikan seluruh analisis akar masalah, terminologi, standar OEE, dan metodologi kerja dengan industri ${userIndustry}.
- Gunakan acuan regulasi/standar relevan jika berlaku (misal: HACCP/BPOM untuk Makanan & Minuman, IATF 16949/JIT untuk Otomotif, CPOB/GMP untuk Farmasi, ESD/SMT untuk Elektronik, SAM/Sewing untuk Garmen, SMED untuk Molding Plastik/Logam, WMS/Slotting untuk Logistik/Gudang).`;

    const memoryContext = factoryMemory.length > 0
      ? factoryMemory.map((m) => `- [${m.category}] ${m.fact}`).join('\n')
      : 'Belum ada data memori pabrik terdahulu.';

    const remindersContext = activeReminders.length > 0
      ? activeReminders.map((r) => `- [${r.status}] ${r.title} (Jadwal: ${r.dueTime})`).join('\n')
      : 'Tidak ada reminder aktif.';

    const recentHistory = history.slice(-8).map((h) => `${h.role === 'user' ? 'User' : 'Chatbot'}: ${h.text}`).join('\n\n');

    const systemPrompt = `Anda adalah Q, rekan diskusi cerdas dan konsultan senior operasional pabrik serta supply chain (Plant & Supply Chain Senior Partner).
Nama panggilan Anda adalah "Q". Anda adalah rekan diskusi profesional di lantai pabrik dan kantor supply chain, BUKAN bot penjawab yang kaku.

ATURAN UTAMA KOMUNIKASI & ADAPTASI JAWABAN (SANGAT PENTING):
1. JANGAN PERNAH MENGULANG SALAM / TEMPLATE BAKU:
   - DILARANG KERAS membuka setiap balasan dengan kalimat template "Hi! Aku Q, rekan diskusimu..." atau slogan serupa!
   - Jangan menyapa ulang jika percakapan sudah berlangsung atau jika user sedang mengajukan pertanyaan/pernyataan.
   - Bersikaplah alami seperti rekan kerja senior: langsung tanggapi inti pembicaraan secara to-the-point, cerdas, dan lugas.

2. SESUAIKAN JAWABAN PERSIS DENGAN ISI PERTANYAAN USER:
   - KASUS A: PERTANYAAN TANYA-JAWAB / SISTEM / BIAYA / UMUM:
     * Jika user menanyakan informasi seputar sistem, kuota, biaya, waktu reset, atau aturan login (misal: "berapa biaya sekali permintaan?", "resetnya bukan jam 2 pm?", "kenapa harus login?"):
       -> JAWAB LANGSUNG pertanyaan tersebut secara transparan, akurat, dan tuntas!
       -> Jangan mengarang diagnosa kerusakan pabrik jika user tidak menanyakannya.
       -> Panduan jawaban teknis sistem yang akurat:
          - Biaya per permintaan: Sangat ekonomis, model Gemini Flash hanya memakan biaya sekitar ~$0.0001 - $0.0003 (sekitar Rp 1,5 - Rp 5 rupiah) per kali request audio/teks lengkap, atau bahkan gratis dalam kuota harian reguler AI Studio.
          - Jam reset kuota: Reset kuota harian sistem Google Cloud / AI Studio terjadi pada pukul 00:00 PST (Pacific Standard Time), yang bertepatan dengan pukul 14:00 (2 PM) WIB (atau 15:00 WIB saat Daylight Saving Time).
          - Alasan login: Diperlukan untuk keamanan akun user, perlindungan memori pabrik, dan penyimpanan data riwayat yang rapi.
   - KASUS B: KENDALA OPERASIONAL PABRIK & SUPPLY CHAIN / PERTANYAAN TEKNIS (PENTING: JANGAN IRIT KATA!):
     * Jika user mengangkat isu pabrik (mesin mati, breakdown, OEE rendah, scrap tinggi, keterlambatan vendor, bottleneck, inventory numpuk, atau meminta panduan teknis operasional):
       -> ANDA WAJIB MENJAWAB SECARA LENGKAP, MENDALAM, DAN PANJANG pada field "response". Jangan pernah hanya menjawab 1-2 kalimat singkat!
       -> Format jawaban komprehensif dengan markdown terstruktur:
          ### 🔍 1. Analisis Akar Masalah (Root Cause Breakdown)
          Jelaskan secara mendalam mekanisme terjadinya kegagalan/kendala (faktor mekanikal/termal/elektrikal, interaksi metode kerja, material, operator, dan lingkungan pabrik).
          
          ### 🛠️ 2. Rencana Tindakan Penanganan Bertahap
          - **A. Tindakan Darurat / Cepat (Immediate Containment)**:
            Langkah isolasi dan mitigasi instan agar lini produksi tidak bertambah rugi pada shift berjalan.
            ⏰ **Saran Waktu Pengerjaan:** [Waktu konkret, misal: Dalam 30-45 menit ke depan sebelum pergantian shift] | 👤 **PIC:** [Misal: Teknisi Maintenance & Operator Lini]
          - **B. Tindakan Korektif & Perbaikan Sistemik**:
            Perbaikan mendasar pada komponen, kalibrasi ulang parameter mesin, penggantian sparepart, atau audit vendor.
            ⏰ **Saran Waktu Pengerjaan:** [Jadwal jelas, misal: Hari ini pukul 14:00 saat pergantian batch] | 👤 **PIC:** [Misal: Leader Shift & Supervisor QC]
          - **C. Pencegahan Jangka Panjang & Standardisasi (Preventive & SOP)**:
            Pembaruan SOP, penyesuaian interval PM (Preventive Maintenance), penyesuaian buffer stock, atau training operator.
            ⏰ **Saran Waktu Pengerjaan:** [Jadwal mingguan/PM Sabtu] | 👤 **PIC:** [Misal: Supervisor Maintenance & Manager Pabrik]

          ### 📊 3. Parameter Teknis Kritis & KPI Pemantauan
          Sebutkan batas toleransi teknis yang harus dipantau (misal: suhu bearing < 65°C, getaran < 2.8 mm/s, takt time < 45 detik, safety stock buffer minimal 3 hari) serta metrik OEE, MTTR, dan Scrap Rate.
   - KASUS C: INPUT TES / SALAM SINGKAT (misal: "test", "tes", "halo", "hai", "cek", "p"):
     * Tanggapi dengan singkat, santai, dan variatif (misal: "Tes audio jelas dan sistem siap. Ada kendala operasional lini atau supply chain yang ingin kita bahas?" atau "Koneksi aman. Apa isu operasional hari ini di pabrik?"). JANGAN gunakan kalimat pembuka template yang kaku.

${industryContext}

KEAHLIAN ANDA:
1. Operasional Pabrik & Manufaktur:
   - Line balancing, bottleneck identification, throughput & takt time optimization
   - Lean Manufacturing, Kaizen, 5S, Six Sigma, Root Cause Analysis (5 Whys, Fishbone / Ishikawa)
   - OEE (Overall Equipment Effectiveness) improvement: mengatasi Availability loss (downtime/breakdown), Performance loss (minor stops/kecepatan rendah), Quality loss (reject/rework)
   - TPM (Total Productive Maintenance), Preventive & Predictive Maintenance
2. Supply Chain Management (SCM):
   - S&OP (Sales & Operations Planning), Material Requirement Planning (MRP)
   - Vendor & Supplier SLA, Lead Time variability, Supplier Quality
   - Bullwhip Effect mitigation, Safety Stock & Reorder Point (ROP) calculation
   - Warehouse Management (FIFO/FEFO, slotting, staging, space utilization)
   - Logistics, fleet dispatch, distribution route bottleneck

GAYA BAHASA & STRUKTUR:
- Bahasa Indonesia yang profesional, solutif, analitis, dan berbobot ala konsultan senior industri.
- Jawaban kaya informasi dan terstruktur rapi dengan markdown (sub-judul ###, bullet points, penomoran, dan bold).
- Jangan pelit kata; berikan elaborasi yang tuntas pada setiap problem yang diajukan.

ATURAN WAJIB SARAN WAKTU PENGERJAAN (UNTUK KENDALA OPERASIONAL):
- Setiap butir saran tindakan operasional pabrik WAJIB menyertakan **SARAN WAKTU KAPAN HARUS DIKERJAKAN** (⏰) dan PIC penanggung jawab agar instruksi di lantai pabrik tidak mengambang.

MEMORI HISTORI:
- Selalu kaitkan fakta pabrik terdahulu jika ada korelasi natural dengan kendala yang sedang dibahas.

DETEKSI FOLLOW-UP & REMINDER:
- Jika user meminta atau menyetujui dibuatkan reminder/pengingat, isi field "detectedReminder" dengan data reminder valid (title, detail, dueTime ISO-8601, category, priority).
- Jika tidak ada permintaan/persetujuan reminder, set "detectedReminder": null.

PENTING UNTUK TRANSKRIPSI:
- Jika input audio: transkripsikan ucapan user secara akurat dalam Bahasa Indonesia pada field "transcription".
- Jika input teks: gunakan teks tersebut pada field "transcription".

PENGELOLAAN MEMORI PABRIK:
- Ekstrak fakta spesifik baru tentang pabrik/lini/mesin/vendor user ke array "newExtractedFacts". Jika tidak ada fakta baru, kosongkan [].

OUTPUT FORMAT (JSON WAJIB TANPA MARKDOWN):
{
  "transcription": "Teks ucapan atau input teks user",
  "response": "JAWABAN UTAMA YANG LENGKAP, MENDALAM, DAN PANJANG sesuai bobot pertanyaan. Jangan irit kata! Jika masalah operasional/teknis, uraikan analisa akar masalah, tahapan solusi lengkap dengan saran waktu pengerjaan (⏰), PIC, parameter teknis, dan KPI.",
  "detailedExplanation": "Analisis teknis pelengkap, metodologi mendalam (5 Whys/Ishikawa/FMEA/TPM), atau prosedur SOP detail",
  "glossary": [
    {
      "term": "Istilah teknis jika ada",
      "definition": "Penjelasan istilah teknis tersebut secara mudah dipahami"
    }
  ],
  "whatsappReportDraft": "Teks draf laporan WA yang rapi jika relevan dengan isu operasional pabrik, atau string kosong jika hanya pertanyaan umum/tanya-jawab",
  "detectedReminder": {
    "title": "string",
    "detail": "string",
    "dueTime": "ISO 8601 string",
    "category": "maintenance" | "supply_chain" | "production" | "quality" | "vendor" | "general",
    "priority": "high" | "medium" | "low"
  } | null,
  "newExtractedFacts": [
    {
      "category": "Mesin/Lini" | "Supply Chain" | "Operasional" | "Quality",
      "fact": "Deskripsi fakta spesifik"
    }
  ]
}`;

    const contents: any[] = [];

    let promptUserPart = `Konteks Saat Ini:
[WAKTU SEKARANG: ${currentIsoDate}]

[MEMORI PABRIK TERDAHULU]:
${memoryContext}

[REMINDER AKTIF]:
${remindersContext}

[HISTORI DISKUSI TERAKHIR]:
${recentHistory || 'Awal percakapan baru.'}
`;

    const hasDirectText = Boolean(userInputText && userInputText.trim().length > 0);

    if (hasDirectText) {
      promptUserPart += `\n[INPUT DARI USER]: "${userInputText!.trim()}"`;
      // High-speed path: do not attach redundant audio payload if text is already transcribed
      contents.push({ text: promptUserPart });
    } else if (audioBase64) {
      // Audio only input (fallback when speech-to-text was silent)
      const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
      const cleanMime = audioMimeType.split(';')[0] || 'audio/webm';
      promptUserPart += `\n[INPUT DARI USER]: User berbicara melalui rekaman audio terlampir. Dengarkan dengan seksama, transkripsikan ucapan user ke Bahasa Indonesia pada field "transcription", dan berikan analisa solusi serta deteksi jika user meminta/menyetujui dibuatkan reminder.`;

      contents.push({
        inlineData: {
          mimeType: cleanMime,
          data: cleanBase64,
        },
      });
      contents.push({ text: promptUserPart });
    } else {
      promptUserPart += `\n[INPUT DARI USER]: "Halo, apa kendala operasional lini atau supply chain yang bisa kita diskusikan hari ini di sektor ${userIndustry}?"`;
      contents.push({ text: promptUserPart });
    }

    async function callGeminiWithRetry() {
      // High-speed, low-latency valid models
      // gemini-3.1-flash-lite with ThinkingLevel.MINIMAL provides sub-second responses without thinking latency
      const modelCandidates: Array<{ name: string; thinkingLevel?: ThinkingLevel }> = [
        { name: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
        { name: 'gemini-flash-latest', thinkingLevel: ThinkingLevel.LOW },
        { name: 'gemini-3.8-flash', thinkingLevel: ThinkingLevel.LOW },
      ];
      let lastErr: any = null;

      for (const item of modelCandidates) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const config: any = {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
            };
            if (item.thinkingLevel) {
              config.thinkingConfig = {
                thinkingLevel: item.thinkingLevel,
              };
            }

            const result = await ai.models.generateContent({
              model: item.name,
              contents: {
                parts: contents.length === 1 ? [contents[0]] : contents,
              },
              config,
            });
            return result;
          } catch (err: any) {
            lastErr = err;
            const errMsg = String(err?.message || '');
            console.warn(`[AI Attempt] Model ${item.name} attempt ${attempt} error:`, errMsg.slice(0, 160));
            const isTransient =
              errMsg.includes('503') ||
              errMsg.includes('UNAVAILABLE') ||
              errMsg.includes('high demand') ||
              errMsg.includes('429');

            if (isTransient && attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
              continue;
            }
            break; // Try next model in cascade
          }
        }
      }
      throw lastErr;
    }

    // Extended timeout (35 seconds) to accommodate mobile network latency and detailed JSON generation
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI_TIMEOUT_EXCEEDED')), 35000)
    );

    const response = await Promise.race([callGeminiWithRetry(), timeoutPromise]);

    const rawText = response.text || '{}';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini response as JSON:', rawText.slice(0, 300));
      parsedData = {
        transcription: userInputText || 'Audio masukan dari user',
        response: rawText,
        detectedReminder: null,
        newExtractedFacts: [],
      };
    }

    if (!parsedData.transcription) {
      parsedData.transcription = userInputText || 'Suara user telah didengarkan.';
    }
    if (!parsedData.response) {
      parsedData.response = 'Terima kasih, saya telah mendengarkan penjelasan Anda. Ada hal yang ingin diperdalam lebih lanjut?';
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(parsedData);
  } catch (error: any) {
    console.error('Gemini call error occurred:', error?.message || error);
    const userText = req.body.userInputText || 'Pertanyaan operasional & supply chain';
    const industry = req.body.userIndustry || 'Manufaktur & SCM';
    const wantsReminder = /ingat|reminder|jadwal|besok|hari|jam|audit|tindak|setuju/i.test(userText);

    // Dynamic, context-specific recovery response instead of static text
    res.json({
      transcription: req.body.userInputText || 'Input suara telah dicatat.',
      response: `### Analisis Situasi: ${userText.slice(0, 60)}\n\nTerkait kendala pada sektor **${industry}** yang Anda sampaikan, fokus utama adalah memverifikasi parameter kritis pada stasiun kerja terkait.\n\n### Tindakan Langsung & Saran Waktu:\n1. **Verifikasi Parameter & Stabilitas:** Periksa kondisi fisik mesin dan kesesuaian setting operasional dengan standar kerja.\n   * ⏰ **Saran Waktu Pengerjaan:** Dalam 1-2 jam ke depan (sebelum pergantian shift).\n   * **PIC:** Leader Shift & Teknisi.\n2. **Pengawasan Aliran Material:** Pastikan pasokan material tidak terhambat dan catat deviasi throughput.\n   * ⏰ **Saran Waktu Pengerjaan:** Hari ini pukul 14:00 saat evaluasi lini.\n   * **PIC:** Supervisor Operasional.`,
      detailedExplanation: `### Bedah Teknis Lapangan (${industry})\n\nUntuk kendala "${userText.slice(0, 70)}", lakukan pendekatan Root Cause Analysis (5 Whys):\n- Identifikasi apakah deviasi berasal dari faktor Mesin (variasi suhu/tekanan/kecepatan), Manusia (metode kerja operator), atau Material (spesifikasi lot pasokan).\n- Tetapkan parameter baku (*Golden Recipe*) agar tidak terjadi fluktuasi kinerja antar shift kerja.`,
      glossary: [
        {
          term: "Root Cause Analysis (RCA)",
          definition: "Metode pemecahan masalah sistematis untuk menemukan sumber akar masalah, bukan sekadar meredakan gejala di permukaan."
        },
        {
          term: "Standard Operating Procedure (SOP)",
          definition: "Panduan langkah baku tertulis yang harus diikuti secara seragam oleh semua operator di setiap shift."
        }
      ],
      whatsappReportDraft: `*📋 LAPORAN OPERASIONAL - SEKTOR ${industry.toUpperCase()}*\n📅 *Waktu:* ${new Date().toLocaleString('id-ID')}\n⚠️ *Kendala Lini:* ${userText}\n\n🔍 *Tindakan Cepat:*\n- Verifikasi parameter operasional stasiun kerja (⏰ Target: 1 jam ke depan)\n- Evaluasi stabilitas throughput (⏰ Target: Hari ini 14:00)\n\n_Disusun via Q • Rekan Diskusi Operasional_`,
      detectedReminder: wantsReminder ? {
        title: `Tindak Lanjut: ${userText.slice(0, 35)}`,
        detail: `Evaluasi parameter operasional terkait kendala di sektor ${industry}.`,
        dueTime: new Date(Date.now() + 86400000).toISOString(),
        category: 'production',
        priority: 'high',
      } : null,
      newExtractedFacts: [],
    });
  }
});

// Real-time live transcription for mobile devices when local browser dictation drops or conflicts
app.post('/api/transcribe-live', async (req: Request, res: Response) => {
  try {
    const { audioBase64, audioMimeType = 'audio/webm' } = req.body;
    if (!audioBase64) {
      res.json({ transcript: '' });
      return;
    }

    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
    const cleanMime = audioMimeType.split(';')[0] || 'audio/webm';

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          inlineData: {
            mimeType: cleanMime,
            data: cleanBase64,
          },
        },
        {
          text: 'Transkripsikan apa yang diucapkan pengguna dalam audio ini secara persis dalam Bahasa Indonesia. Kembalikan HANYA teks ucapan tanpa pengantar, tanpa tanda kutip, dan tanpa format markdown. Jika audio hening atau tidak jelas, kembalikan string kosong.',
        },
      ],
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MINIMAL,
        },
      },
    });

    const transcript = response.text ? response.text.trim() : '';
    res.json({ transcript });
  } catch (err: any) {
    console.warn('Live transcription notice:', err?.message || err);
    res.json({ transcript: '' });
  }
});

// Production and dev setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
