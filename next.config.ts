import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    '/api/agents': ['./next.config.ts'],
    '/api/chat/messages': ['./next.config.ts'],
    '/api/chat/sessions': ['./next.config.ts'],
    '/api/chat/sessions/[sessionId]': ['./next.config.ts'],
    '/api/chat/stream': ['./next.config.ts'],
  },
};

export default nextConfig;
