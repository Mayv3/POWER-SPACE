import { createHealthResponse } from "../../../lib/healthResponse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return createHealthResponse();
}
