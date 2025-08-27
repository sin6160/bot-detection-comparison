import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://recaptchaenterprise.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://www.google.com https://www.gstatic.com https://recaptchaenterprise.googleapis.com",
              "frame-src 'self' https://www.google.com https://recaptcha.google.com https://www.gstatic.com https://content.googleapis.com",
              "child-src 'self' https://www.google.com https://recaptcha.google.com https://www.gstatic.com",
              "object-src 'none'",
              "base-uri 'self'"
            ].join('; ')
          }
        ]
      }
    ];
  }
};

export default nextConfig;
