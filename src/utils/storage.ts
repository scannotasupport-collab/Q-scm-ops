import { ChatMessage, FactoryFact, FollowUpReminder, DiscussionSession, UserIndustryProfile, IndustryOption } from '../types';

const STORAGE_KEYS = {
  CURRENT_MESSAGES: 'plant_sc_current_messages',
  SESSIONS: 'plant_sc_sessions',
  FACTORY_MEMORY: 'plant_sc_factory_memory',
  REMINDERS: 'plant_sc_reminders',
  USER_PROFILE: 'plant_sc_user_profile',
  GUEST_SUBMISSIONS: 'plant_sc_guest_submission_count',
};

export const DEFAULT_INDUSTRIES: IndustryOption[] = [
  {
    id: 'fmcg_food',
    name: 'Makanan & Minuman (F&B / FMCG)',
    emoji: '🥫',
    tagline: 'Kemasan, BPOM/HACCP, sanitasi, batch cooking, shelf-life',
    keywords: ['FMCG', 'HACCP', 'Filling Line', 'Sealing', 'Cold Storage'],
  },
  {
    id: 'automotive',
    name: 'Otomotif & Komponen Mesin',
    emoji: '🚗',
    tagline: 'Stamping, welding, CNC, assembly line, IATF 16949, JIT',
    keywords: ['Stamping', 'Welding', 'Line Balancing', 'IATF', 'Takt Time'],
  },
  {
    id: 'pharma_chemical',
    name: 'Farmasi, Kosmetik & Kimia',
    emoji: '💊',
    tagline: 'Clean room, CPOB/GMP, validasi batch, filling steril, formula',
    keywords: ['CPOB', 'GMP', 'Mixing Tank', 'Sterilisasi', 'Batch Record'],
  },
  {
    id: 'textile_garment',
    name: 'Tekstil, Garmen & Alas Kaki',
    emoji: '🧵',
    tagline: 'Sewing line, cutting, spinning, SAM/SMV, reject jahitan',
    keywords: ['Sewing', 'SAM', 'Fabric Defect', 'Washing', 'Pattern'],
  },
  {
    id: 'electronics',
    name: 'Elektronik & Semikonduktor',
    emoji: '⚡',
    tagline: 'SMT line, PCB assembly, ESD control, soldering, testing visual',
    keywords: ['SMT', 'ESD', 'Soldering', 'AOI Inspection', 'Cleanroom'],
  },
  {
    id: 'warehouse_logistics',
    name: 'Logistik, Pergudangan & Distribusi',
    emoji: '📦',
    tagline: 'Slotting, picking speed, 3PL, fleet dispatch, FIFO/FEFO',
    keywords: ['WMS', 'Picking Rate', 'Buffer Stock', 'Fleet', 'Pallet'],
  },
  {
    id: 'metal_plastic',
    name: 'Plastik, Karet & Pengolahan Logam',
    emoji: '⚙️',
    tagline: 'Injection molding, mold changeover (SMED), scrap resin, casting',
    keywords: ['Injection', 'Molding', 'SMED', 'Extrusion', 'Scrap Rate'],
  },
  {
    id: 'heavy_material',
    name: 'Bahan Bangunan, Semen & Industri Berat',
    emoji: '🏗️',
    tagline: 'Continuous kiln/boiler, grinding, heavy equipment, K3/OHS',
    keywords: ['Kiln', 'Crusher', 'Conveyor', 'K3 OHS', 'Preventive Maintenance'],
  },
];

// Initial factory memory context if completely empty to provide realistic context
const INITIAL_FACTORY_MEMORY: FactoryFact[] = [
  {
    id: 'fact-1',
    category: 'Lini Produksi',
    fact: 'Pabrik memiliki 3 lini pengemasan utama (Line 1 sachet, Line 2 pouch, Line 3 botol)',
    date: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'fact-2',
    category: 'Supply Chain',
    fact: 'Lead time pengadaan bahan baku primer karton box dari vendor lokal rata-rata 10-14 hari kalender',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'fact-3',
    category: 'Operasional',
    fact: 'Target OEE perusahaan adalah 85%, saat ini berfluktuasi di kisaran 72-76%',
    date: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

export function getSavedMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_MESSAGES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading messages:', e);
    return [];
  }
}

export function saveMessages(messages: ChatMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_MESSAGES, JSON.stringify(messages));
  } catch (e) {
    console.error('Error saving messages:', e);
  }
}

export function getFactoryMemory(): FactoryFact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FACTORY_MEMORY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.FACTORY_MEMORY, JSON.stringify(INITIAL_FACTORY_MEMORY));
      return INITIAL_FACTORY_MEMORY;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading factory memory:', e);
    return INITIAL_FACTORY_MEMORY;
  }
}

export function saveFactoryMemory(facts: FactoryFact[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FACTORY_MEMORY, JSON.stringify(facts));
  } catch (e) {
    console.error('Error saving factory memory:', e);
  }
}

export function addFactoryFacts(newFacts: Array<{ category: string; fact: string }>): FactoryFact[] {
  const current = getFactoryMemory();
  const added: FactoryFact[] = [];

  for (const item of newFacts) {
    // Avoid exact duplicate
    const exists = current.some((c) => c.fact.toLowerCase().trim() === item.fact.toLowerCase().trim());
    if (!exists && item.fact.trim().length > 3) {
      const newFact: FactoryFact = {
        id: `fact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        category: item.category || 'Operasional Pabrik',
        fact: item.fact.trim(),
        date: new Date().toISOString(),
      };
      current.unshift(newFact);
      added.push(newFact);
    }
  }

  if (added.length > 0) {
    saveFactoryMemory(current);
  }
  return current;
}

export function getReminders(): FollowUpReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REMINDERS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading reminders:', e);
    return [];
  }
}

export function saveReminders(reminders: FollowUpReminder[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
  } catch (e) {
    console.error('Error saving reminders:', e);
  }
}

export function addReminder(reminder: Omit<FollowUpReminder, 'id' | 'createdAt' | 'status'>): FollowUpReminder {
  const current = getReminders();
  const newReminder: FollowUpReminder = {
    ...reminder,
    id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  current.unshift(newReminder);
  saveReminders(current);
  return newReminder;
}

export function updateReminderStatus(id: string, status: 'pending' | 'completed'): FollowUpReminder[] {
  const current = getReminders();
  const updated = current.map((r) => (r.id === id ? { ...r, status } : r));
  saveReminders(updated);
  return updated;
}

export function deleteReminder(id: string): FollowUpReminder[] {
  const current = getReminders();
  const filtered = current.filter((r) => r.id !== id);
  saveReminders(filtered);
  return filtered;
}

export function archiveCurrentSession(title?: string): void {
  const messages = getSavedMessages();
  if (messages.length === 0) return;

  try {
    const rawSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    const sessions: DiscussionSession[] = rawSessions ? JSON.parse(rawSessions) : [];

    const firstUserMsg = messages.find((m) => m.role === 'user');
    const sessionTitle = title || (firstUserMsg ? firstUserMsg.text.slice(0, 40) + '...' : 'Diskusi Pabrik');

    const newSession: DiscussionSession = {
      id: `session-${Date.now()}`,
      title: sessionTitle,
      createdAt: messages[0]?.timestamp || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      messages,
    };

    sessions.unshift(newSession);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    // Clear current
    localStorage.removeItem(STORAGE_KEYS.CURRENT_MESSAGES);
  } catch (e) {
    console.error('Error archiving session:', e);
  }
}

export function getArchivedSessions(): DiscussionSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function getUserProfile(): UserIndustryProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveUserProfile(profile: UserIndustryProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving user profile:', e);
  }
}

export function clearUserProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  } catch (e) {}
}

export function getGuestSubmissionCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GUEST_SUBMISSIONS);
    if (!raw) return 0;
    const num = parseInt(raw, 10);
    return isNaN(num) ? 0 : num;
  } catch {
    return 0;
  }
}

export function incrementGuestSubmissionCount(): number {
  try {
    const current = getGuestSubmissionCount();
    const updated = current + 1;
    localStorage.setItem(STORAGE_KEYS.GUEST_SUBMISSIONS, updated.toString());
    return updated;
  } catch {
    return 1;
  }
}

export function resetGuestSubmissionCount(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.GUEST_SUBMISSIONS);
  } catch {}
}

