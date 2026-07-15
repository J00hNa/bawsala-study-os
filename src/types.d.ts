export type Id = string;
export type ISODate = `${number}-${number}-${number}`;
export type ClockTime = `${number}:${number}`;
export type Priority = 'high' | 'medium' | 'low';
export type Theme = 'dark' | 'light' | 'system';
export type InterfaceLanguage = 'en' | 'ar';
export type AccentColor = 'purple' | 'blue' | 'green';

export interface Subject { id: Id; name: string; symbol: string; description: string; progress: number; color: AccentColor; }
export interface QuestStep { id: Id; text: string; done: boolean; }
export interface Quest { id: Id; title: string; description: string; subjectId: Id | ''; subject: string; priority: Priority; duration: number; xp: number; dueDate: ISODate; steps: QuestStep[]; completed: boolean; rewarded: boolean; createdAt: number; completedAt: number | null; }
export interface PlannedSession { id: Id; title: string; subjectId: Id | ''; subject: string; questId: Id | ''; color: AccentColor; date: ISODate; time: ClockTime; duration: number; }
export interface Note { id: Id; title: string; subjectId: Id | ''; subject: string; body: string; updatedAt: number; }
export interface Flashcard { id: Id; front: string; back: string; subjectId: Id | ''; subject: string; ease: number; interval: number; reps: number; lapses: number; dueDate: ISODate; dueAt: number; }
export interface BawsalaSettings { reducedMotion: boolean; sound: boolean; compact: boolean; highContrast: boolean; theme: Theme; language: InterfaceLanguage; timeZone: string; onboardingDone: boolean; }
export interface BawsalaStateV4 {
  schemaVersion: 4;
  meta: { createdAt: number; updatedAt: number };
  profile: { name: string; avatar: string; totalXp: number; credits: number; dailyGoal: number };
  quests: Quest[]; subjects: Subject[]; sessions: PlannedSession[]; focusLog: unknown[]; notes: Note[];
  resources: unknown[]; cards: Flashcard[]; reviewLog: unknown[]; questions: unknown[]; arenaRuns: unknown[];
  challengeClaims: ISODate[]; settings: BawsalaSettings; notifications: unknown[];
}
