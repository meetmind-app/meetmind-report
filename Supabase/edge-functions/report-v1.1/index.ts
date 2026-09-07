import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeLanguage(value: unknown): string {
  const raw = String(value || "en").trim().replace(/_/g, "-").toLowerCase();
  if (raw === "pt" || raw === "pt-br" || raw.startsWith("pt-")) return "pt";
  if (raw === "in" || raw.startsWith("in-")) return "id";
  const base = raw.split("-")[0];
  return ["en", "ru", "es", "tr", "id", "hi", "ar", "uz", "fa"].includes(base)
    ? base
    : "en";
}

function buildReportPayload(row: Record<string, any>): Record<string, unknown> {
  const stored = isRecord(row.report_json) ? row.report_json : {};
  const language = normalizeLanguage(row.report_language ?? stored.language ?? "en");
  const storedStats = isRecord(stored.stats) ? stored.stats : {};
  const storedDuration = Number(storedStats.duration_seconds || 0);
  const rootDuration = Number(row.duration_seconds || 0);
  const durationSeconds = storedDuration > 0
    ? Math.ceil(storedDuration)
    : rootDuration > 0
      ? Math.ceil(rootDuration)
      : null;

  const participants = Array.isArray(stored.participants)
    ? stored.participants
    : Array.isArray(row.participants)
      ? row.participants
      : [];

  return {
    ...stored,
    language: normalizeLanguage(stored.language ?? language),
    participants,
    stats: {
      ...storedStats,
      duration_seconds: durationSeconds,
    },
  };
}

export default {
  fetch: withSupabase(
    { auth: "none" },

    async (request, context) => {
      if (request.method === "OPTIONS") {
        return new Response("ok", {
          status: 200,
          headers: corsHeaders,
        });
      }

      if (request.method !== "GET") {
        return jsonResponse(
          {
            success: false,
            error: "METHOD_NOT_ALLOWED",
          },
          405,
        );
      }

      try {
        const url = new URL(request.url);
        const token = url.searchParams.get("token")?.trim();

        if (!token) {
          return jsonResponse(
            {
              success: false,
              error: "TOKEN_REQUIRED",
            },
            400,
          );
        }

        const { data: row, error } = await context.supabaseAdmin
          .from("meetings")
          .select(
            [
              "id",
              "share_token",
              "meeting_title",
              "report_language",
              "status",
              "created_at",
              "duration_seconds",
              "report_json",
              "participants",
              "branding_visible",
              "transcript",
              "deleted_at",
            ].join(","),
          )
          .eq("share_token", token)
          .maybeSingle();

        if (error) {
          console.error("Report query failed:", error);

          return jsonResponse(
            {
              success: false,
              error: "DATABASE_ERROR",
            },
            500,
          );
        }

        if (!row) {
          return jsonResponse(
            {
              success: false,
              error: "REPORT_NOT_FOUND",
            },
            404,
          );
        }

        const report = buildReportPayload(row);
        const language = normalizeLanguage(row.report_language ?? report.language ?? "en");

        return jsonResponse({
          success: true,

          meeting: {
            id: row.id,
            share_token: row.share_token,
            title:
              row.meeting_title ??
              report.title ??
              "",
            language,
            report_language: language,
            status:
              row.deleted_at
                ? "deleted"
                : row.status,
            created_at: row.created_at,
            deleted_at: row.deleted_at,
            duration_seconds:
              Number(row.duration_seconds || 0) > 0
                ? Math.ceil(Number(row.duration_seconds))
                : null,
            participants: Array.isArray(row.participants) ? row.participants : [],
            branding_visible: row.branding_visible !== false,
            report,
            transcript: row.transcript ?? "",
          },
        });
      } catch (error) {
        console.error("Unexpected report error:", error);

        return jsonResponse(
          {
            success: false,
            error: "INTERNAL_ERROR",
          },
          500,
        );
      }
    },
  ),
};
