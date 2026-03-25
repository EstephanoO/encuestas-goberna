import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedCandidate {
  fullName: string;
  partyName: string;
  partyLogoUrl: string | null;
  candidatePhotoUrl: string | null;
  sourceUrl: string;
  externalId: string | null;
  sortOrder: number;
}

@Injectable()
export class JneCandidatesScraper {
  private readonly logger = new Logger(JneCandidatesScraper.name);

  constructor(private readonly config: ConfigService) {}

  async scrape(): Promise<ScrapedCandidate[]> {
    const url = this.config.get<string>(
      'JNE_CANDIDATES_URL',
      'https://votoinformado.jne.gob.pe/presidente-vicepresidentes',
    );

    this.logger.log(`Scraping JNE candidates from: ${url}`);

    const { data: html } = await axios.get<string>(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; EncuestaBot/1.0; +https://encuesta-peru.com)',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-PE,es;q=0.9',
      },
      timeout: 15_000,
    });

    const $ = cheerio.load(html);
    const candidates: ScrapedCandidate[] = [];

    // JNE page structure: candidate cards with photo, name, party
    // Selectors based on the JNE voto informado site structure
    // Fallback-safe: if selector finds nothing, we return empty array
    const cardSelectors = [
      '.partido-card',
      '.candidate-card',
      '[class*="candidato"]',
      '[class*="partido"]',
      'article',
      '.card',
    ];

    let found = false;
    for (const selector of cardSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        this.logger.log(
          `Found ${elements.length} elements with selector: ${selector}`,
        );

        elements.each((index, el) => {
          const $el = $(el);

          const fullName = this.extractText($el, [
            '[class*="nombre"]',
            '[class*="name"]',
            'h2',
            'h3',
            'h4',
            '.title',
            'strong',
          ]);

          const partyName = this.extractText($el, [
            '[class*="partido"]',
            '[class*="party"]',
            '[class*="organizacion"]',
            'p',
            'span',
          ]);

          const candidatePhotoUrl = this.extractImageUrl($el, [
            '[class*="candidato"] img',
            '[class*="foto"] img',
            '[class*="photo"] img',
            'img[alt*="candidato"]',
            'img',
          ]);

          const partyLogoUrl = this.extractImageUrl($el, [
            '[class*="logo"] img',
            '[class*="partido"] img',
            '[class*="party-logo"] img',
          ]);

          const linkHref = $el.find('a').attr('href') || $el.attr('href') || '';
          const sourceUrl = linkHref.startsWith('http')
            ? linkHref
            : linkHref
              ? `https://votoinformado.jne.gob.pe${linkHref}`
              : url;

          const externalId =
            linkHref.match(/\/(\d+)/)?.[1] ||
            $el.attr('data-id') ||
            $el.attr('id') ||
            null;

          if (fullName && fullName.length > 2) {
            candidates.push({
              fullName: fullName.trim(),
              partyName: (partyName || 'Sin partido').trim(),
              candidatePhotoUrl: candidatePhotoUrl || null,
              partyLogoUrl: partyLogoUrl || null,
              sourceUrl,
              externalId,
              sortOrder: index,
            });
            found = true;
          }
        });

        if (found) break;
      }
    }

    if (candidates.length === 0) {
      this.logger.warn(
        'No candidates found with any selector — HTML structure may have changed. Returning empty list.',
      );
    } else {
      this.logger.log(`Scraped ${candidates.length} candidates from JNE`);
    }

    return candidates;
  }

  private extractText(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $el: any,
    selectors: string[],
  ): string {
    for (const sel of selectors) {
      const text = $el.find(sel).first().text().trim();
      if (text && text.length > 1) return text;
    }
    return '';
  }

  private extractImageUrl(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $el: any,
    selectors: string[],
  ): string | null {
    for (const sel of selectors) {
      const src =
        $el.find(sel).first().attr('src') ||
        $el.find(sel).first().attr('data-src');
      if (src) {
        return src.startsWith('http')
          ? src
          : `https://votoinformado.jne.gob.pe${src}`;
      }
    }
    return null;
  }
}
