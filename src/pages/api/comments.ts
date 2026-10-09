import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  MAX_BODY_BYTES,
  addComment,
  approvedCommentPage,
  listComments,
  parseNewComment,
  parsePageKeys,
  replyRecipient,
} from '../../server/comments';
import { notifyOwner } from '../../server/notify';
import { notifyReplyAuthor } from '../../server/reply-notice';
import { findPage, getPageIndex } from '../../server/page-index';
import { rateLimitKey } from '../../server/rate-limit-key';
import { tokenFrom, verifyTurnstile } from '../../server/turnstile';

// Runs in the Worker on each request (the rest of the site is static).
export const prerender = false;

// public/_headers covers static files only, so the API sets its own.
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

export const GET: APIRoute = async ({ url }) =>
  json(await listComments(env.DB, parsePageKeys(url.searchParams.get('page_slug'))));

export const POST: APIRoute = async ({ request, url, clientAddress, locals }) => {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    return json({ error: 'Too large' }, 413);
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return json({ error: 'Too large' }, 413);
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const comment = parseNewComment(body);
  if ('error' in comment) return json(comment, 400);

  try {
    const index = await getPageIndex(env.ASSETS, url.origin);
    const page = findPage(index, comment.page_slug);
    if (!page) return json({ error: 'Unknown page' }, 400);
    // A reply must answer an approved comment on the same page (old comments may be stored
    // under another key of the same page).
    if (comment.parent_id !== null) {
      const parentKey = await approvedCommentPage(env.DB, comment.parent_id);
      if (!parentKey || findPage(index, parentKey)?.url !== page.url) {
        return json({ error: 'Unknown parent' }, 400);
      }
    }
    const turnstileKey = env.TURNSTILE_SECRET_KEY;
    if (!turnstileKey) throw new Error('TURNSTILE_SECRET_KEY is not set');
    if (!(await verifyTurnstile(turnstileKey, tokenFrom(body), clientAddress))) {
      return json({ error: 'Human check failed' }, 403);
    }
    // Counted only for comments that would be saved, so rejected junk doesn't use up the quota.
    const { success } = await env.COMMENT_RATE_LIMIT.limit({ key: rateLimitKey(clientAddress) });
    if (!success) return json({ error: 'Too many comments, try again in a minute' }, 429);
    const saved = await addComment(env.DB, comment);
    notifyOwner({
      apiKey: env.BREVO_API_KEY,
      waitUntil: (promise) => locals.cfContext.waitUntil(promise),
      notice: () => ({
        commentId: saved.id,
        pageTitle: page.title,
        pageUrl: new URL(page.url, url.origin).href,
        author: comment.author_name,
        email: comment.author_email,
        content: comment.content,
      }),
    });
    // A reply: tell the author of the comment replied to, if they asked (in the background, so a
    // failure here can't turn the saved reply into an error).
    const parentId = comment.parent_id;
    if (parentId !== null) {
      locals.cfContext.waitUntil(
        replyRecipient(env.DB, parentId)
          // Returned, so this one waitUntil covers the lookup and the send.
          .then((recipient) =>
            recipient
              ? notifyReplyAuthor({
                  apiKey: env.BREVO_API_KEY,
                  replierEmail: comment.author_email,
                  notice: {
                    recipient,
                    replyId: saved.id,
                    replierName: comment.author_name,
                    pageTitle: page.title,
                    pageUrl: new URL(page.url, url.origin).href,
                    origin: url.origin,
                  },
                })
              : undefined,
          )
          .catch((error: unknown) => {
            console.error('Reply notification lookup failed:', error);
          }),
      );
    }
    return json(saved, 201);
  } catch (error) {
    console.error('POST /api/comments failed:', error);
    return json({ error: 'Internal error' }, 500);
  }
};
