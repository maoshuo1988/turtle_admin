import type { PageParams } from '@/types/http';

export type AdminPkTopicStatus = 'enabled' | 'disabled';
export type AdminPkSeasonStatus = 'active' | 'finished';
export type AdminPkRoundPhase = 'betting' | 'locked' | 'cooldown' | 'settled';
export type AdminPkWinner = 'A' | 'B' | 'draw';

export interface AdminPkTopic {
  id: number;
  slug: string;
  title: string;
  sideAName: string;
  sideBName: string;
  status: AdminPkTopicStatus;
  sort?: number;
  cover?: string;
  raw: Record<string, unknown>;
}

export interface AdminPkRound {
  id: number;
  topicId: number;
  seasonId?: number;
  phase?: AdminPkRoundPhase;
  roundNo?: number;
  heatA?: number;
  heatB?: number;
  poolA?: number;
  poolB?: number;
  userCountA?: number;
  userCountB?: number;
  winner?: AdminPkWinner;
  startTime?: string;
  endTime?: string;
  settledAt?: string;
  raw: Record<string, unknown>;
}

export interface AdminPkSeason {
  id: number;
  topicId: number;
  seasonNo?: number;
  status?: AdminPkSeasonStatus;
  startTime?: string;
  endTime?: string;
  raw: Record<string, unknown>;
}

export interface AdminPkStats {
  totalRounds: number;
  winsA: number;
  winsB: number;
}

export interface AdminPkTopicRow {
  topic: AdminPkTopic;
  round?: AdminPkRound;
  season?: AdminPkSeason;
  stats: AdminPkStats;
}

export interface AdminPkRoundRow {
  round: AdminPkRound;
  topic?: AdminPkTopic;
}

export interface AdminPkSeasonRow {
  season: AdminPkSeason;
  topic?: AdminPkTopic;
}

export interface AdminPkTopicListParams extends PageParams {
  status?: AdminPkTopicStatus;
  q?: string;
}

export interface AdminPkRoundListParams extends PageParams {
  topicId?: number;
  phase?: AdminPkRoundPhase;
  winner?: AdminPkWinner;
  startTime?: number;
  endTime?: number;
}

export interface AdminPkSeasonListParams extends PageParams {
  topicId?: number;
  status?: AdminPkSeasonStatus;
}

export interface AdminPkTopicSavePayload {
  id?: number;
  slug: string;
  title: string;
  sideAName: string;
  sideBName: string;
  status: AdminPkTopicStatus;
  sort?: number;
  cover?: string;
}

export interface AdminPkTopicStatusPayload {
  topicId: number;
  status: AdminPkTopicStatus;
}

export interface AdminPkRecalcHeatPayload {
  topicId: number;
  roundId: number;
  reason?: string;
}
