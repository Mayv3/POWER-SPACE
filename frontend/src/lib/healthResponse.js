const noCacheHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export function createHealthResponse() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA;

  return Response.json(
    {
      status: "ok",
      service: "powerspace-web",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: commit ? commit.slice(0, 7) : null,
    },
    { headers: noCacheHeaders }
  );
}
