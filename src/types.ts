export type MessageRole = 'user' | 'model';

export interface FollowUpReminder {
  id: string;
  title: string;
  detail: string;
  dueTime: string; // ISO string
  category: 'maintenance' | 'supply_chain' | 'production' | 'quality' | 'vendor' | 'general';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
  createdAt: string;
}

export interface FactoryFact {
  id: string;
  category: string;
  fact: string;
  date: string;
}

export interface GlossaryItem {
  term: string;
  definition: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  transcription?: string;
  audioDurationSeconds?: number;
  detailedExplanation?: string;
  glossary?: GlossaryItem[];
  whatsappReportDraft?: string;
  detectedReminder?: FollowUpReminder | null;
  timestamp: string;
  isError?: boolean;
  originalUserInput?: string;
}

export interface UserIndustryProfile {
  industry: string;
  role?: string;
  plantScale?: string;
}

export interface IndustryOption {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  keywords: string[];
}

export interface DiscussionSession {
  id: string;
  title: string;
  createdAt: string;
  lastUpdated: string;
  messages: ChatMessage[];
}
