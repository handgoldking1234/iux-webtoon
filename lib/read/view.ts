import 'server-only';
import { img } from './store';
import { avg, type Art, type Series } from './types';

/** 화면에 넘기는 작품 정보 (클라이언트 컴포넌트에도 넘길 수 있게 가볍게) */
export type SV = { id: string; title: string; author: string; genre: string; age: Series['age']; ai: boolean; kind: Series['kind']; days: string[]; episodes: number; follows: number; rating: number; thumb: string | null; art: Art | null; isNew: boolean; up: boolean; description: string };

export function sv(s: Series): SV {
  const last = Date.parse(s.last_episode_at || s.created_at), now = Date.now();
  return {
    id: s.id, title: s.title, author: s.author_name, genre: s.genre, age: s.age, ai: s.ai, kind: s.kind, days: s.days, episodes: s.episodes, follows: s.follows,
    rating: avg(s), thumb: img(s.thumb_path), art: s.art || null, description: s.description,
    isNew: now - Date.parse(s.created_at) < 14 * 86400e3,
    up: now - last < 36 * 3600e3,
  };
}
