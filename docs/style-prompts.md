# 웹툰컷 그림체 예시 — 나노바나나 프롬프트

같은 장면을 그림체만 바꿔 6장 뽑으면, 프리셋 썸네일을 나란히 비교할 수 있어요.
- 비율: **3:4 세로** (썸네일은 4:3으로 잘려 보이니 인물을 화면 가운데에 두었어요)
- 모델: 나노바나나 2 (1K면 썸네일로 충분)
- 만든 이미지 주소를 `SB_PRESET_EX[n].img`에 넣으면 프리셋 버튼에 바로 보여요.

**공통 장면**: 비 오는 밤 좁은 골목, 투명 우산을 든 단발 여고생이 어깨 너머로 뒤를 돌아본다. 젖은 바닥에 간판 불빛이 비친다.

---

## 1. 웹툰 기본
```
Korean vertical-scroll webtoon panel, clean confident line art, soft cel shading, muted cinematic colours, dramatic lighting, subtle film grain. A Korean high-school girl with shoulder-length black hair and a navy school uniform, holding a clear umbrella, turning back over her shoulder in a narrow alley on a rainy night. Neon shop signs reflect on the wet pavement. Medium shot, eye level, 3:4 vertical. No text, no speech bubbles, no watermark.
```

## 2. 시네마틱 반실사
```
Semi-realistic cinematic Korean webtoon panel, painterly rendering, detailed realistic face and hair strands, film lighting with strong rim light, muted desaturated palette, shallow depth of field. A Korean high-school girl with shoulder-length black hair and a navy school uniform, holding a clear umbrella, turning back over her shoulder in a narrow alley on a rainy night, raindrops caught in the light, neon reflections on wet asphalt. Medium close-up, slightly low angle, 3:4 vertical. No text, no speech bubbles, no watermark.
```

## 3. 다크 세피아
```
Dark mysterious Korean webtoon panel, sepia and charcoal palette with deep red accents, heavy black shadows, fine ink hatching texture, aged paper grain, horror-thriller mood. A Korean high-school girl with shoulder-length black hair and a school uniform, holding a clear umbrella, turning back over her shoulder in a narrow alley on a rainy night; a single red neon sign glows behind her and her face is half in shadow. Medium shot, slight dutch angle, 3:4 vertical. No text, no speech bubbles, no watermark.
```

## 4. 로맨스 파스텔
```
Soft romance webtoon panel, pastel colours (pink, lavender, baby blue), clean thin lines, gentle bloom lighting, sparkles in the rain, airy simplified background, big expressive eyes. A Korean high-school girl with shoulder-length black hair and a school uniform, holding a clear umbrella, turning back over her shoulder with a surprised blush in a narrow alley on a rainy evening; shop lights glow softly. Medium shot, eye level, 3:4 vertical. No text, no speech bubbles, no watermark.
```

## 5. 흑백 만화
```
Black and white manga panel, screentone dot shading, bold G-pen ink lines, speed-line rain strokes, high contrast, no colour. A Korean high-school girl with shoulder-length black hair and a school uniform, holding a clear umbrella, turning back over her shoulder in a narrow alley on a rainy night; signboards and puddle reflections drawn in screentone. Medium shot, eye level, 3:4 vertical. No text, no speech bubbles, no sound effects, no watermark.
```

## 6. 수채 일러스트
```
Watercolour illustration webtoon panel, soft edges, light transparent washes, visible cold-press paper texture, colour bleeding into the rain, delicate pencil underdrawing. A Korean high-school girl with shoulder-length black hair and a school uniform, holding a clear umbrella, turning back over her shoulder in a narrow alley on a rainy night; shop lights bloom into soft watercolour blots on the wet street. Medium shot, eye level, 3:4 vertical. No text, no speech bubbles, no watermark.
```

---

### 장면을 바꿔 더 만들 때
장면 문장(두 번째 문장)만 바꾸고 앞의 그림체 문장과 끝의 `No text, no speech bubbles, no watermark.`는 그대로 두세요. 그림체끼리 비교가 유지돼요.
- 예) 남자 주인공 클로즈업: `A Korean man in his late twenties with messy dark hair and a grey coat, close-up, looking straight at the viewer with a cold expression, office window light behind him.`
- 예) 배경만: `An empty old photo studio interior in 1940s Seoul, wooden cameras and glass plates, red darkroom light, no people.`
