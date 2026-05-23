export interface TelegramChat {
  id: string;
  chatId: string;
  title: string;
  type: 'private' | 'group' | 'channel';
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profilePhoto?: string;
  isBotUser?: boolean;
  blocked?: boolean;
  lastMessageAt?: Date;
}

export interface TelegramMessage {
  id: string;
  messageId: number;
  chatId: string;
  fromId?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  timestamp: Date;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  scheduledAt?: Date;
  published: boolean;
  publishedAt?: Date;
  userId: string;
}

export interface Settings {
  id: string;
  botToken: string;
  autoReplyEnabled: boolean;
}

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};