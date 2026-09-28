import { createFileRoute } from "@tanstack/react-router";

import {
  parseApprovedPurchase,
  parseWebhookEnvelope,
  secretsMatch,
} from "@/lib/cakto-webhook";

function jsonResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/cakto-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
        if (!contentType.includes("application/json")) {
          return jsonResponse({ success: false, error: "Invalid content type" }, 400);
        }

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return jsonResponse({ success: false, error: "Invalid JSON payload" }, 400);
        }

        const envelope = parseWebhookEnvelope(payload);
        if (!envelope.success) {
          return jsonResponse({ success: false, error: "Invalid payload" }, 400);
        }

        const expectedSecret = process.env["CAKTO_WEBHOOK_SECRET"];
        if (!expectedSecret) {
          console.error("cakto-webhook: webhook secret is not configured");
          return jsonResponse({ success: false, error: "Webhook unavailable" }, 500);
        }

        if (!secretsMatch(envelope.data.secret, expectedSecret)) {
          return jsonResponse({ success: false, error: "Unauthorized" }, 401);
        }

        if (envelope.data.event === "purchase_approved") {
          const approvedPurchase = parseApprovedPurchase(payload);
          if (!approvedPurchase.success) {
            return jsonResponse({ success: false, error: "Invalid purchase data" }, 400);
          }

          console.log("cakto-webhook: approved purchase received", {
            purchaseId: approvedPurchase.data.data.id,
            referenceId: approvedPurchase.data.data.refId,
          });
        }

        return jsonResponse({ success: true }, 200);
      },
      GET: async () => jsonResponse({ success: false, error: "Method not allowed" }, 405),
      PUT: async () => jsonResponse({ success: false, error: "Method not allowed" }, 405),
      PATCH: async () => jsonResponse({ success: false, error: "Method not allowed" }, 405),
      DELETE: async () => jsonResponse({ success: false, error: "Method not allowed" }, 405),
    },
  },
});