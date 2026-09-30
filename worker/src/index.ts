export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json; charset=utf-8',
    };

    // GET /api/comments?page_slug=about,2
    if (request.method === 'GET' && url.pathname === '/api/comments') {
      const pageSlugParam = url.searchParams.get('page_slug');
      if (!pageSlugParam) {
        return new Response(JSON.stringify([]), { headers: corsHeaders });
      }

      const slugs = pageSlugParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (slugs.length === 0) {
        return new Response(JSON.stringify([]), { headers: corsHeaders });
      }

      const placeholders = slugs.map(() => '?').join(',');
      const query = `SELECT * FROM comments WHERE page_slug IN (${placeholders}) AND approved = 1 ORDER BY created_at ASC`;
      const { results } = await env.DB.prepare(query)
        .bind(...slugs)
        .all();

      return new Response(JSON.stringify(results || []), { headers: corsHeaders });
    }

    // POST /api/comments
    if (request.method === 'POST' && url.pathname === '/api/comments') {
      try {
        const body: any = await request.json();
        const { page_slug, author_name, author_email, content } = body;

        if (!page_slug || !author_name?.trim() || !content?.trim()) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        const result = await env.DB.prepare(
          `INSERT INTO comments (page_slug, author_name, author_email, content, is_admin_reply, approved)
           VALUES (?, ?, ?, ?, 0, 1) RETURNING *`,
        )
          .bind(page_slug, author_name.trim(), author_email?.trim() || null, content.trim())
          .first();

        return new Response(JSON.stringify(result), { status: 201, headers: corsHeaders });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    return new Response(JSON.stringify({ status: 'ok', service: 'mikraot-api' }), {
      headers: corsHeaders,
    });
  },
};
