/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, FactoryFact, FollowUpReminder, UserIndustryProfile } from './types';
import {
  getSavedMessages,
  saveMessages,
  getFactoryMemory,
  addFactoryFacts,
  saveFactoryMemory,
  getReminders,
  saveReminders,
  addReminder,
  updateReminderStatus,
  deleteReminder,
  archiveCurrentSession,
  getUserProfile,
  saveUserProfile,
  getGuestSubmissionCount,
  incrementGuestSubmissionCount,
} from './utils/storage';
import {
  saveReminderToCloud,
  deleteReminderFromCloud,
  fetchUserRemindersFromCloud,
  fetchFactoryFactsFromCloud,
  saveFactoryFactToCloud,
  deleteFactoryFactFromCloud,
  archiveSessionToCloud,
} from './services/firestoreSync';
import { useAuth } from './context/AuthContext';
import { playChimeSound } from './utils/audio';
import { OpeningPanel } from './components/OpeningPanel';
import { DiscussionView } from './components/DiscussionView';
import { ReminderDrawer } from './components/ReminderDrawer';
import { MemoryDrawer } from './components/MemoryDrawer';
import { IndustrySelectorModal } from './components/IndustrySelectorModal';
import { MandatoryLoginModal } from './components/MandatoryLoginModal';
import { AdminUserTrackerModal } from './components/AdminUserTrackerModal';
import { Bell, CheckCircle2, X } from 'lucide-react';

export default function App() {
  const { user, saveCloudProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(() => getSavedMessages());
  const [factoryFacts, setFactoryFacts] = useState<FactoryFact[]>(() => getFactoryMemory());
  const [reminders, setReminders] = useState<FollowUpReminder[]>(() => getReminders());
  const [userProfile, setUserProfile] = useState<UserIndustryProfile | null>(() => getUserProfile());
  const [isIndustryModalOpen, setIsIndustryModalOpen] = useState<boolean>(() => !getUserProfile());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Mandatory Google Login modal state for second input attempt
  const [isMandatoryLoginModalOpen, setIsMandatoryLoginModalOpen] = useState(false);
  const [loginModalReason, setLoginModalReason] = useState<'audio_input' | 'text_input' | 'new_discussion' | 'general'>('general');

  // Check if unauthenticated guest has already used their free 1st problem session
  const isGuestExhausted = !user && (getGuestSubmissionCount() >= 1 || messages.filter((m) => m.role === 'user').length >= 1);

  // Auto-close mandatory login modal upon successful Google sign in
  useEffect(() => {
    if (user) {
      setIsMandatoryLoginModalOpen(false);
    }
  }, [user]);

  const triggerRequireLogin = (reason: 'audio_input' | 'text_input' | 'new_discussion' | 'general' = 'general') => {
    setLoginModalReason(reason);
    setIsMandatoryLoginModalOpen(true);
  };

  // Drawers
  const [isReminderDrawerOpen, setIsReminderDrawerOpen] = useState(false);
  const [isMemoryDrawerOpen, setIsMemoryDrawerOpen] = useState(false);

  // Active Alert Toast when a reminder is due
  const [dueAlert, setDueAlert] = useState<FollowUpReminder | null>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Save messages whenever they change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Request browser notification permission once user interacts
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Sync with Firestore whenever user logs in
  useEffect(() => {
    if (!user) return;

    // Fetch and merge cloud reminders
    fetchUserRemindersFromCloud(user.uid)
      .then((cloudReminders) => {
        if (cloudReminders && cloudReminders.length > 0) {
          const local = getReminders();
          const mergedMap = new Map<string, FollowUpReminder>();
          local.forEach((r) => mergedMap.set(r.id, r));
          cloudReminders.forEach((r) => mergedMap.set(r.id, r));
          const merged = Array.from(mergedMap.values());
          saveReminders(merged);
          setReminders(merged);
        } else {
          const local = getReminders();
          local.forEach((r) => saveReminderToCloud(user.uid, r));
        }
      })
      .catch((err) => console.warn('Reminders cloud sync notice:', err));

    // Fetch and merge cloud factory facts
    fetchFactoryFactsFromCloud(user.uid)
      .then((cloudFacts) => {
        if (cloudFacts && cloudFacts.length > 0) {
          const local = getFactoryMemory();
          const mergedMap = new Map<string, FactoryFact>();
          local.forEach((f) => mergedMap.set(f.id, f));
          cloudFacts.forEach((f) => mergedMap.set(f.id, f));
          const merged = Array.from(mergedMap.values());
          saveFactoryMemory(merged);
          setFactoryFacts(merged);
        } else {
          const local = getFactoryMemory();
          local.forEach((f) => saveFactoryFactToCloud(user.uid, f));
        }
      })
      .catch((err) => console.warn('Factory facts cloud sync notice:', err));
  }, [user]);

  // Reminder due checker interval
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date().getTime();
      const pending = getReminders().filter((r) => r.status === 'pending');

      for (const rem of pending) {
        const due = new Date(rem.dueTime).getTime();
        // If due within the last 15 minutes and not notified yet
        if (now >= due && now - due < 900000 && !notifiedIdsRef.current.has(rem.id)) {
          notifiedIdsRef.current.add(rem.id);
          setDueAlert(rem);
          playChimeSound('reminder');

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`⏰ Reminder Pabrik: ${rem.title}`, {
              body: rem.detail || 'Jadwal tindak lanjut Anda telah tiba.',
              icon: '/favicon.ico',
            });
          }
          break;
        }
      }
    };

    const interval = setInterval(checkReminders, 10000);
    checkReminders();
    return () => clearInterval(interval);
  }, []);

  const handleSelectIndustry = (profile: UserIndustryProfile) => {
    setUserProfile(profile);
    saveUserProfile(profile);
    if (user) {
      saveCloudProfile(profile);
    }
    setIsIndustryModalOpen(false);

    // Persist as factory memory fact
    const updated = addFactoryFacts([
      {
        category: 'Profil Sektor Industri',
        fact: `Pabrik beroperasi di sektor: ${profile.industry} (Peran Pengguna: ${profile.role || 'Operasional Pabrik'})`,
      },
    ]);
    setFactoryFacts([...updated]);
    if (user && updated[0]) {
      saveFactoryFactToCloud(user.uid, updated[0]);
    }
    playChimeSound('success');
  };

  const handleAudioSubmit = async (
    audioBase64: string,
    durationSeconds: number,
    mimeType: string,
    interimText?: string
  ) => {
    // Intercept if guest has already submitted their 1st problem
    if (isGuestExhausted) {
      triggerRequireLogin('audio_input');
      return;
    }

    setIsProcessing(true);

    // Optimistically add user turn with audio indicator
    const tempUserMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: tempUserMsgId,
      role: 'user',
      text: interimText || 'Memproses suara...',
      transcription: interimText || 'Rekaman suara sedang ditranskripsikan...',
      audioDurationSeconds: durationSeconds,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);

    let data: any = null;
    let lastError: any = null;

    // Resilient 3-attempt retry loop to withstand mobile network handovers or cold starts
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: interimText && interimText.trim().length > 3 ? undefined : audioBase64,
            audioMimeType: mimeType,
            userInputText: interimText,
            userIndustry: userProfile?.industry || 'Manufaktur & Supply Chain Umum',
            userRole: userProfile?.role || 'Operasional Pabrik',
            history: messages.slice(-10).map((m) => ({ role: m.role, text: m.text })),
            factoryMemory: factoryFacts,
            activeReminders: reminders.filter((r) => r.status === 'pending'),
            clientCurrentTime: new Date().toISOString(),
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`SERVER_HTTP_${res.status}`);
        }

        const text = await res.text();
        data = JSON.parse(text);
        if (data) {
          break; // Succeeded!
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Audio Chat Attempt ${attempt}] Notice:`, err?.message || err);
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
        }
      }
    }

    try {
      if (!data) {
        throw lastError || new Error('NETWORK_CONNECTION_LOST');
      }

      // Update user message with verified transcription
      const updatedUserMsg: ChatMessage = {
        ...userMsg,
        text: data?.transcription || interimText || 'Diskusi Audio',
        transcription: data?.transcription || interimText,
      };

      // Check if auto-reminder detected & created
      let newReminderObj: FollowUpReminder | null = null;
      if (data?.detectedReminder && data.detectedReminder.title) {
        newReminderObj = addReminder({
          title: data.detectedReminder.title,
          detail: data.detectedReminder.detail || '',
          dueTime: data.detectedReminder.dueTime || new Date(Date.now() + 86400000).toISOString(),
          category: data.detectedReminder.category || 'general',
          priority: data.detectedReminder.priority || 'medium',
        });
        setReminders(getReminders());
        if (user && newReminderObj) {
          saveReminderToCloud(user.uid, newReminderObj);
        }
        playChimeSound('success');
      }

      // Check if new factory memory facts extracted
      if (data?.newExtractedFacts && Array.isArray(data.newExtractedFacts) && data.newExtractedFacts.length > 0) {
        const updatedFacts = addFactoryFacts(data.newExtractedFacts);
        setFactoryFacts([...updatedFacts]);
        if (user) {
          updatedFacts.slice(0, data.newExtractedFacts.length).forEach((f) => {
            saveFactoryFactToCloud(user.uid, f);
          });
        }
      }

      // Add model response turn
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: data?.response || 'Terima kasih, situasi telah tercatat.',
        detailedExplanation: data?.detailedExplanation,
        glossary: data?.glossary,
        whatsappReportDraft: data?.whatsappReportDraft,
        detectedReminder: newReminderObj,
        timestamp: new Date().toISOString(),
      };

      setMessages([...nextMessages.slice(0, -1), updatedUserMsg, botMsg]);

      // If user is guest, count the completed submission so next input requires login
      if (!user) {
        incrementGuestSubmissionCount();
      }
    } catch (error: any) {
      console.warn('Chat interaction notice:', error);
      const errorMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        isError: true,
        originalUserInput: interimText,
        text: `Koneksi jaringan sempat terputus saat menghubungi server. Pertanyaan Anda ("${(interimText || 'Pertanyaan Anda').slice(0, 60)}") telah tersimpan secara aman.`,
        timestamp: new Date().toISOString(),
      };
      setMessages([...nextMessages, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async (text: string) => {
    // Intercept if guest has already submitted their 1st problem
    if (isGuestExhausted) {
      triggerRequireLogin('text_input');
      return;
    }

    setIsProcessing(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);

    let data: any = null;
    let lastError: any = null;

    // Resilient 3-attempt retry loop for text queries
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userInputText: text,
            userIndustry: userProfile?.industry || 'Manufaktur & Supply Chain Umum',
            userRole: userProfile?.role || 'Operasional Pabrik',
            history: messages.slice(-10).map((m) => ({ role: m.role, text: m.text })),
            factoryMemory: factoryFacts,
            activeReminders: reminders.filter((r) => r.status === 'pending'),
            clientCurrentTime: new Date().toISOString(),
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`SERVER_HTTP_${res.status}`);
        }

        const resText = await res.text();
        data = JSON.parse(resText);
        if (data) {
          break; // Succeeded!
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Text Chat Attempt ${attempt}] Notice:`, err?.message || err);
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
        }
      }
    }

    try {
      if (!data) {
        throw lastError || new Error('NETWORK_CONNECTION_LOST');
      }

      let newReminderObj: FollowUpReminder | null = null;
      if (data?.detectedReminder && data.detectedReminder.title) {
        newReminderObj = addReminder({
          title: data.detectedReminder.title,
          detail: data.detectedReminder.detail || '',
          dueTime: data.detectedReminder.dueTime || new Date(Date.now() + 86400000).toISOString(),
          category: data.detectedReminder.category || 'general',
          priority: data.detectedReminder.priority || 'medium',
        });
        setReminders(getReminders());
        if (user && newReminderObj) {
          saveReminderToCloud(user.uid, newReminderObj);
        }
        playChimeSound('success');
      }

      if (data?.newExtractedFacts && Array.isArray(data.newExtractedFacts) && data.newExtractedFacts.length > 0) {
        const updatedFacts = addFactoryFacts(data.newExtractedFacts);
        setFactoryFacts([...updatedFacts]);
        if (user) {
          updatedFacts.slice(0, data.newExtractedFacts.length).forEach((f) => {
            saveFactoryFactToCloud(user.uid, f);
          });
        }
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: data?.response || 'Situasi telah dicatat ke dalam memori pabrik.',
        detailedExplanation: data?.detailedExplanation,
        glossary: data?.glossary,
        whatsappReportDraft: data?.whatsappReportDraft,
        detectedReminder: newReminderObj,
        timestamp: new Date().toISOString(),
      };

      setMessages([...nextMessages, botMsg]);

      // If user is guest, count the completed submission so next input requires login
      if (!user) {
        incrementGuestSubmissionCount();
      }
    } catch (error: any) {
      console.warn('Text interaction notice:', error);
      const errorMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        isError: true,
        originalUserInput: text,
        text: `Koneksi jaringan sempat terputus saat menghubungi server. Pesan Anda ("${text.slice(0, 60)}") telah tersimpan secara aman.`,
        timestamp: new Date().toISOString(),
      };
      setMessages([...nextMessages, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryMessage = async (messageId: string, originalText: string) => {
    // Remove the error message from the conversation feed
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    if (originalText && originalText.trim()) {
      await handleTextSubmit(originalText.trim());
    }
  };

  const handleNewDiscussion = () => {
    // If guest already used their free consultation, prompt login before starting new problem
    if (isGuestExhausted) {
      triggerRequireLogin('new_discussion');
      return;
    }

    if (messages.length > 0) {
      archiveCurrentSession();
      if (user) {
        const firstUserMsg = messages.find((m) => m.role === 'user');
        const sessionTitle = firstUserMsg ? firstUserMsg.text.slice(0, 40) + '...' : 'Diskusi Pabrik';
        archiveSessionToCloud(user.uid, {
          id: `session-${Date.now()}`,
          title: sessionTitle,
          createdAt: messages[0]?.timestamp || new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          messages,
        });
      }
      setMessages([]);
    }
  };

  const handleToggleReminderStatus = (id: string, newStatus: 'pending' | 'completed') => {
    const updated = updateReminderStatus(id, newStatus);
    setReminders([...updated]);
    if (newStatus === 'completed' && dueAlert?.id === id) {
      setDueAlert(null);
    }
    if (user) {
      const target = updated.find((r) => r.id === id);
      if (target) {
        saveReminderToCloud(user.uid, target);
      }
    }
  };

  const handleDeleteReminder = (id: string) => {
    const updated = deleteReminder(id);
    setReminders([...updated]);
    if (user) {
      deleteReminderFromCloud(user.uid, id);
    }
  };

  const handleAddFact = (category: string, fact: string) => {
    const updated = addFactoryFacts([{ category, fact }]);
    setFactoryFacts([...updated]);
    if (user && updated[0]) {
      saveFactoryFactToCloud(user.uid, updated[0]);
    }
  };

  const handleDeleteFact = (id: string) => {
    const updated = factoryFacts.filter((f) => f.id !== id);
    saveFactoryMemory(updated);
    setFactoryFacts(updated);
    if (user) {
      deleteFactoryFactFromCloud(user.uid, id);
    }
  };

  const handleDiscussFact = (fact: FactoryFact) => {
    setIsMemoryDrawerOpen(false);
    // Submit discussion query to Q regarding this factory memory
    handleTextSubmit(`Bahas & analisis ulang data memori pabrik ini: "${fact.fact}" (Kategori: ${fact.category}). Berikan evaluasi kondisi terkini dan langkah tindak lanjut terarah.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white antialiased">
      {/* 
        Condition:
        "buat tampilan simple cukup panel pembuka dengan salam pembuka, 
        'hi, apa yang bisa kita diskusikan kali ini' tidak ada tombol lain"
      */}
      {messages.length === 0 ? (
        <OpeningPanel
          onAudioSubmit={handleAudioSubmit}
          onTextSubmit={handleTextSubmit}
          isProcessing={isProcessing}
          userProfile={userProfile}
          onChangeIndustry={() => setIsIndustryModalOpen(true)}
          isGuestExhausted={isGuestExhausted}
          onRequireLogin={triggerRequireLogin}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
        />
      ) : (
        <DiscussionView
          messages={messages}
          reminders={reminders}
          factoryFacts={factoryFacts}
          isProcessing={isProcessing}
          userProfile={userProfile}
          onChangeIndustry={() => setIsIndustryModalOpen(true)}
          onAudioSubmit={handleAudioSubmit}
          onTextSubmit={handleTextSubmit}
          onNewDiscussion={handleNewDiscussion}
          onOpenReminders={() => setIsReminderDrawerOpen(true)}
          onOpenMemory={() => setIsMemoryDrawerOpen(true)}
          onToggleReminderStatus={handleToggleReminderStatus}
          onRetryMessage={handleRetryMessage}
          isGuestExhausted={isGuestExhausted}
          onRequireLogin={triggerRequireLogin}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
        />
      )}

      {/* Admin User Tracker Modal (strictly for scannota.support@gmail.com) */}
      <AdminUserTrackerModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      {/* Mandatory Google Login Modal for second problem submission */}
      <MandatoryLoginModal
        isOpen={isMandatoryLoginModalOpen}
        onClose={() => setIsMandatoryLoginModalOpen(false)}
        reason={loginModalReason}
      />

      {/* Industry Profile Setup / Switcher Modal */}
      <IndustrySelectorModal
        isOpen={isIndustryModalOpen}
        currentProfile={userProfile}
        onSelect={handleSelectIndustry}
        onClose={() => {
          if (userProfile) setIsIndustryModalOpen(false);
        }}
        isInitialRequired={!userProfile}
      />

      {/* Reminder Drawer */}
      <ReminderDrawer
        isOpen={isReminderDrawerOpen}
        onClose={() => setIsReminderDrawerOpen(false)}
        reminders={reminders}
        onToggleStatus={handleToggleReminderStatus}
        onDelete={handleDeleteReminder}
      />

      {/* Factory Memory Drawer */}
      <MemoryDrawer
        isOpen={isMemoryDrawerOpen}
        onClose={() => setIsMemoryDrawerOpen(false)}
        facts={factoryFacts}
        onAddFact={handleAddFact}
        onDeleteFact={handleDeleteFact}
        onDiscussFact={handleDiscussFact}
      />

      {/* Real-time Due Reminder Alert Toast */}
      {dueAlert && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full p-4 rounded-2xl bg-gradient-to-r from-amber-600 to-indigo-700 text-white shadow-2xl border border-white/20 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded">
                  Reminder Tindak Lanjut Tiba!
                </span>
                <h4 className="text-sm font-bold mt-1">{dueAlert.title}</h4>
                {dueAlert.detail && (
                  <p className="text-xs text-white/90 mt-0.5 line-clamp-2">{dueAlert.detail}</p>
                )}
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleReminderStatus(dueAlert.id, 'completed')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-slate-900 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tandai Selesai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueAlert(null)}
                    className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 text-xs transition cursor-pointer"
                  >
                    Nanti
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDueAlert(null)}
              className="text-white/70 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
