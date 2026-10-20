// Browser-side perceptual logo matching (dHash + aHash on a 16x16 grayscale thumbnail).
// Used for "does this avatar / app icon copy the official logo?". Both images are hashed
// with the same routine, so only relative similarity matters. If an image can't be read
// (CORS, bad file) the result is "unavailable" - never a guess.

export const LOGO_MATCH_STRONG = 0.88; // near-identical copy / re-encode / light edit
export const LOGO_MATCH_LIKELY = 0.80; // same artwork with noticeable edits

const SIDE = 16;

export interface VisualComparison {
  available: boolean;
  similarity: number; // 0..1
  reason: string;
}

/** Pure hash builder (testable without a DOM). `big` is (SIDE+1)*SIDE gray values, `tiny` is SIDE*SIDE. */
export function hashFromGray(big: ArrayLike<number>, tiny: ArrayLike<number>): string {
  const stretch = (v: ArrayLike<number>) => {
    let lo = 255, hi = 0;
    for (let i = 0; i < v.length; i++) { lo = Math.min(lo, v[i]); hi = Math.max(hi, v[i]); }
    const span = Math.max(1, hi - lo);
    return Array.from({ length: v.length }, (_, i) => ((v[i] - lo) / span) * 255);
  };
  const b = stretch(big);
  const t = stretch(tiny);
  let bits = '';
  for (let y = 0; y < SIDE; y++) {
    for (let x = 0; x < SIDE; x++) {
      bits += b[y * (SIDE + 1) + x] > b[y * (SIDE + 1) + x + 1] ? '1' : '0';
    }
  }
  const mean = t.reduce((s, v) => s + v, 0) / t.length;
  for (let i = 0; i < t.length; i++) bits += t[i] > mean ? '1' : '0';
  return bits;
}

export function hashSimilarity(a: string | null, b: string | null): number {
  if (!a || !b || a.length !== b.length) return 0;
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  return Math.round((1 - diff / a.length) * 10000) / 10000;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    if (typeof Image === 'undefined') return resolve(null);
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 6000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = src;
  });
}

function grayPixels(img: HTMLImageElement, w: number, h: number): number[] | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff'; // flatten transparency onto white
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const out: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      out.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    return out;
  } catch {
    return null; // tainted canvas (CORS) or unreadable image
  }
}

export async function hashImageSource(src: string | undefined | null): Promise<string | null> {
  if (!src) return null;
  const img = await loadImage(src);
  if (!img) return null;
  const big = grayPixels(img, SIDE + 1, SIDE);
  const tiny = grayPixels(img, SIDE, SIDE);
  return big && tiny ? hashFromGray(big, tiny) : null;
}

/** Compare a candidate avatar/icon with the brand's official logo. */
export async function compareToOfficialLogo(
  candidateImage: string | undefined | null,
  officialLogo: string | undefined | null
): Promise<VisualComparison> {
  if (!candidateImage) return { available: false, similarity: 0, reason: 'No candidate image supplied.' };
  if (!officialLogo) {
    return { available: false, similarity: 0, reason: 'Brand profile has no official logo. Upload one in Brand Profile to enable logo matching.' };
  }
  const [a, b] = await Promise.all([hashImageSource(officialLogo), hashImageSource(candidateImage)]);
  if (!a) return { available: false, similarity: 0, reason: 'Official logo could not be read.' };
  if (!b) return { available: false, similarity: 0, reason: 'Candidate image could not be read.' };
  return { available: true, similarity: hashSimilarity(a, b), reason: '' };
}

/** Read an uploaded image file as a data URL (size-capped). */
export function fileToDataUrl(file: File, maxBytes = 2 * 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    if (file.size > maxBytes) return reject(new Error('Image must be 2 MB or smaller.'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.readAsDataURL(file);
  });
}
