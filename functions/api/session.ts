/**
 * Cloudflare Pages Function: /api/session
 * Handles fetching and saving user session data in D1.
 */

interface Env {
    DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const username = url.searchParams.get('username');

    if (!username) {
        return new Response("Missing username", { status: 400 });
    }

    try {
        const result = await env.DB.prepare(
            "SELECT session_data FROM user_sessions WHERE username = ?"
        ).bind(username).first<{ session_data: string }>();

        if (!result) {
            return new Response(JSON.stringify({ found: false }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify({ found: true, data: result.session_data }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    try {
        const payload: { username: string; data: string } = await request.json();
        const { username, data } = payload;

        if (!username || !data) {
            return new Response("Missing username or data", { status: 400 });
        }

        const now = Date.now();
        await env.DB.prepare(
            "INSERT INTO user_sessions (username, session_data, updated_at) VALUES (?, ?, ?) " +
            "ON CONFLICT(username) DO UPDATE SET session_data = EXCLUDED.session_data, updated_at = EXCLUDED.updated_at"
        ).bind(username, data, now).run();

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
