import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';
import { listSubscribers, subscribersToCsv } from '../../../lib/engagement';

export const prerender = false;

// /admin/* já exige login (ver src/middleware.ts).
export const GET: APIRoute = async ({ request }) => {
  const csv = subscribersToCsv(await listSubscribers(getDB()), new URL(request.url).origin);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="inscritos.csv"',
      'Cache-Control': 'no-store',
    },
  });
};
