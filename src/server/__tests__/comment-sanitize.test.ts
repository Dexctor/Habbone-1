import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  sanitizeCommentHtml,
  sanitizeRichContentHtml,
} from '../comment-sanitize';

describe('comment and rich content sanitization', () => {
  it('removes executable HTML from legacy comments', () => {
    const html = sanitizeCommentHtml(
      '<p onclick="alert(1)">Salut<script>alert(2)</script><img src=x onerror=alert(3)></p>',
    );

    assert.equal(html.includes('<script'), false);
    assert.equal(html.includes('onclick'), false);
    assert.equal(html.includes('onerror'), false);
    assert.equal(html.includes('<img'), false);
    assert.ok(html.includes('Salut'));
  });

  it('keeps safe rich content but strips script and unsafe links', () => {
    const html = sanitizeRichContentHtml(
      '<h2>Titre</h2><p><strong>OK</strong></p><script>alert(1)</script><a href="javascript:alert(2)">bad</a>',
    );

    assert.ok(html.includes('<h2>Titre</h2>'));
    assert.ok(html.includes('<strong>OK</strong>'));
    assert.equal(html.includes('<script'), false);
    assert.equal(html.includes('javascript:'), false);
  });

  it('cleans roomid metadata down to digits only', () => {
    const html = sanitizeRichContentHtml(
      '<a class="roomid-chip evil" data-roomid="12abc34" href="#roomid-1234">:roomid 1234</a>',
    );

    assert.ok(html.includes('class="roomid-chip"'));
    assert.ok(html.includes('data-roomid="1234"'));
    assert.equal(html.includes('evil'), false);
    assert.equal(html.includes('12abc34'), false);
  });
});
