import type { Message, MessageSenderRole, SessionStatus } from '@/types/database';

// A chat message with client-only optimistic delivery flags.
export type ChatMessage = Message & {
  pending?: boolean;
  failed?: boolean;
};

// What a swipe-to-reply targets.
export type ReplyTarget = {
  id: string;
  preview: string;
  senderRole: MessageSenderRole;
};

export type EvidenceItem = {
  id: string;
  submitted_by: 'agent' | 'renter';
  type: 'photo' | 'video';
  url: string;
  uploaded_at: string;
};

export type DisputeInfo = {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  renter_evidence: EvidenceItem[];
  agent_evidence: EvidenceItem[];
};

// Conversation summary for the conversations list.
export type Conversation = {
  id: string; // inspection_session id
  renter_name: string;
  listing_id: string;
  listing_title: string | null;
  listing_cover_photo: string | null;
  status: SessionStatus;
  chat_unlocked: boolean;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};
