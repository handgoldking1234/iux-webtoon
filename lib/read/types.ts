export type Art = { pal: [string, string, string]; motif: string };

export type Series = {
  id: string;
  author_id: string;
  author_name: string;
  title: string;
  description: string;
  genre: string;
  age: 'all' | '12' | '15' | '19';
  ai: boolean;
  kind: 'free' | 'daily' | 'done';
  days: string[];
  review: 'none' | 'pending' | 'approved' | 'rejected';
  review_note?: string | null;
  hidden: boolean;
  thumb_path: string | null;
  episodes: number;
  follows: number;
  views: number;
  rating_sum: number;
  rating_count: number;
  last_episode_at: string | null;
  created_at: string;
  /** 예시 데이터만: 썸네일 대신 그려요 */
  art?: Art;
};

export type Cut = { path: string; w: number; h: number };

export type Episode = {
  id: number;
  series_id: string;
  no: number;
  title: string;
  author_note: string | null;
  cuts: Cut[];
  thumb_path: string | null;
  ai: boolean;
  status: 'public' | 'scheduled' | 'hidden';
  publish_at: string;
  views: number;
  rating_sum: number;
  rating_count: number;
  comments: number;
  created_at: string;
  /** 예시 데이터만: 컷 위 말풍선 */
  demoLines?: [string, string][][];
};

export type Comment = { id: number; episode_id: number; user_id: string; nickname: string; body: string; likes: number; hidden: boolean; created_at: string; best?: boolean; liked?: boolean; mine?: boolean };

export type Draft = {
  id: string;
  user_id: string;
  source: { project?: string; workTitle?: string; logline?: string; genre?: string; ep?: { num?: number; title?: string; syn?: string } };
  cuts: Cut[];
  ai: boolean;
  ready: boolean;
  used: boolean;
  created_at: string;
};

export type Report = { id: number; target_type: 'series' | 'episode' | 'comment'; target_id: string; user_id: string | null; reason: string; status: 'open' | 'done' | 'dismissed'; created_at: string; label?: string; href?: string };

export const avg = (x: { rating_sum: number; rating_count: number }) => (x.rating_count ? x.rating_sum / x.rating_count : 0);
