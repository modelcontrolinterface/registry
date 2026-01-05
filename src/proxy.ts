import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { extractTokenFromHeader, authenticateWithToken } from "@/lib/auth";

export const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/v1/")) {
    return NextResponse.next();
  }

  const publicRoutes = [
    { path: /^\/api\/v1\/stats$/, methods: ["GET"] },
    { path: /^\/api\/v1\/users\/[^/]+$/, methods: ["GET"] },
    { path: /^\/api\/v1\/packages(\/.*)?$/, methods: ["GET"] },
  ];

  for (const route of publicRoutes) {
    if (route.path.test(pathname) && route.methods.includes(request.method)) {
      return NextResponse.next();
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let userId: string | null = null;
  let authError: string | null = null;

  const token = extractTokenFromHeader(request.headers.get("Authorization"));

  if (token) {
    try {
      const user = await authenticateWithToken(token);
      if (user) {
        userId = user.id;
      } else {
        authError = "Invalid API token";
      }
    } catch (error) {
      console.error("Token authentication error:", error);
      authError = "An error occurred during token authentication";
    }
  } else {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    } catch (error) {
      console.error("Session authentication error:", error);
      authError = "An error occurred during session authentication";
    }
  }

  if (!userId) {
    return new NextResponse(
      JSON.stringify({ message: authError || "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", userId);
  response.headers.set("x-user-id", userId);

  return response;
};

export const config = {
  matcher: "/api/v1/:path*",
};
