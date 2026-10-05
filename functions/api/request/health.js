import { inquiryHealth } from '../../../scripts/inquiry-lib.mjs';

export function onRequestGet({ env }) {
  return Response.json(inquiryHealth(env || {}), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
