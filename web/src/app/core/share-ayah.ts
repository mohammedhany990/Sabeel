import { Injectable, inject } from '@angular/core';
import { Ayah, Surah } from './models';
import { Toast } from './toast';

export interface ShareOptions {
  tafsir: boolean;
}

@Injectable({ providedIn: 'root' })
export class ShareAyah {
  private readonly toast = inject(Toast);
  async buildText(a: Ayah, s: Surah, opts: ShareOptions, tafsirText?: string): Promise<string> {
    const ref = `${s.nameEn} ${a.surahId}:${a.ayahNumber}`;
    let out = `${a.textUthmani}\n\n[${ref}]`;
    if (opts.tafsir && tafsirText) out += `\n\nTafsir: ${tafsirText}`;
    return out + '\n\nShared from Sabeel';
  }

  async shareText(a: Ayah, s: Surah, opts: ShareOptions, tafsirText?: string): Promise<void> {
    const text = await this.buildText(a, s, opts, tafsirText);
    const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ text });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(text);
    this.toast.show('Copied', 'ok');
  }

  async shareImage(a: Ayah, s: Surah, opts: ShareOptions, tafsirText?: string): Promise<void> {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0d1b16';
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.strokeStyle = '#e2c275';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, 1008, 1278);
    ctx.fillStyle = '#e2c275';
    ctx.textAlign = 'center';
    ctx.font = '600 44px Amiri, serif';
    ctx.fillText(`${s.nameAr} \u2022 ${a.surahId}:${a.ayahNumber}`, 540, 120);
    try {
      await document.fonts.load('700 72px Amiri');
    } catch {
      return;
    }
    ctx.direction = 'rtl';
    ctx.fillStyle = '#f5efe0';
    ctx.font = '700 64px Amiri, serif';
    let y = this.wrap(ctx, a.textUthmani, 540, 260, 920, 96);
    if (opts.tafsir && tafsirText) {
      ctx.direction = 'rtl';
      ctx.fillStyle = '#a8c5b5';
      ctx.font = '400 34px Amiri, serif';
      y = this.wrap(ctx, tafsirText.slice(0, 400), 540, y + 60, 920, 50);
    }
    ctx.direction = 'ltr';
    ctx.fillStyle = '#e2c275';
    ctx.font = '600 30px Georgia, serif';
    ctx.save();
    ctx.translate(475, 1252);
    ctx.scale(0.62, 0.62);
    ctx.fillStyle = '#e2c275';
    ctx.fill(new Path2D('M32 6 L40 24 L58 32 L40 40 L32 58 L24 40 L6 32 L24 24 Z'));
    ctx.fillStyle = '#0d1b16';
    ctx.beginPath();
    ctx.arc(32, 32, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e2c275';
    ctx.fillText('Sabeel', 525, 1286);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    if (!blob) return;
    const file = new File([blob], `ayah-${a.surahId}-${a.ayahNumber}.png`, { type: 'image/png' });
    const nav = navigator as Navigator & { share?: (d: { files: File[] }) => Promise<void>; canShare?: (d: { files: File[] }) => boolean };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file] });
        return;
      } catch {
        return;
      }
    }
    const url = URL.createObjectURL(blob);
    const aEl = document.createElement('a');
    aEl.href = url;
    aEl.download = file.name;
    aEl.click();
    URL.revokeObjectURL(url);
  }

  private wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
    const words = text.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        y += lineHeight;
        line = w;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
    return y;
  }
}
