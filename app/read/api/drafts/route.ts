import { CUT_WIDTH, MAX_CUTS, MAX_EP_BYTES } from '@/lib/read/config';
import { createDraft, type DraftIn } from '@/lib/read/store';
import { body, err, ok, withMe } from '../_h';

/** 편집기 「연재하기」 1단계 — 컷 정보를 받아 초안을 만들고, 그림 올릴 주소를 돌려줘요 */
export async function POST(req: Request) {
  return withMe(async (me) => {
    const b = await body<Partial<DraftIn>>(req);
    const cuts = Array.isArray(b.cuts) ? b.cuts.slice(0, MAX_CUTS + 1) : [];
    if (!cuts.length) return err('bad_cuts', '올릴 컷이 없어요');
    if (cuts.length > MAX_CUTS) return err('bad_cuts', `한 회차는 컷 ${MAX_CUTS}개까지예요`);
    const bytes = cuts.reduce((a, c) => a + (Number(c.bytes) || 0), 0);
    if (bytes > MAX_EP_BYTES) return err('too_big', `한 회차는 ${Math.round(MAX_EP_BYTES / 1048576)}MB까지예요 (지금 ${(bytes / 1048576).toFixed(1)}MB)`);
    if (cuts.some((c) => !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(String(c.type)))) return err('bad_type', 'JPG · PNG · WEBP · GIF만 올릴 수 있어요');
    const src = (b.source || {}) as DraftIn['source'];
    const clean = (s: unknown, n: number) => String(s ?? '').slice(0, n);
    const out = await createDraft(me.profile.id, {
      ai: !!b.ai,
      source: { project: clean(src.project, 80), workTitle: clean(src.workTitle, 60), logline: clean(src.logline, 300), genre: clean(src.genre, 40), ep: { num: Number(src.ep?.num) || undefined, title: clean(src.ep?.title, 60), syn: clean(src.ep?.syn, 600) } },
      cuts: cuts.map((c) => ({ w: Number(c.w) || CUT_WIDTH, h: Number(c.h) || 0, type: String(c.type), bytes: Number(c.bytes) || 0 })),
    });
    return ok(out);
  });
}
