/**
 * Ambient type declaration for Next.js server APIs in workspace packages.
 * Allows Route Handlers to use NextRequest and NextResponse without requiring
 * non-web packages to add 'next' to their dependencies.
 */
declare module 'next/server' {
    export class NextRequest extends Request {
        nextUrl: URL;
        cookies: any;
        geo?: {
            city?: string;
            country?: string;
            region?: string;
            latitude?: string;
            longitude?: string;
        };
        ip?: string;
    }

    export class NextResponse<Body = unknown> extends Response {
        static json<JsonBody>(data: JsonBody, init?: ResponseInit): NextResponse<JsonBody>;
        static redirect(url: string | URL, status?: number): NextResponse;
        static rewrite(url: string | URL): NextResponse;
        static next(options?: any): NextResponse;
        cookies: any;
    }
}
