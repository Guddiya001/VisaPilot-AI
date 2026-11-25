/**
 * Ambient type declaration for Next.js cache APIs in root workspace environment.
 * Ensures TypeScript language server and root builds resolve 'next/cache' without
 * requiring the root package to duplicate 'next' in root dependencies.
 */
declare module 'next/cache' {
    export function revalidatePath(originalPath: string, type?: 'layout' | 'page'): void;
    export function revalidateTag(tag: string): void;
    export function unstable_cache<T extends (...args: any[]) => Promise<any>>(
        cb: T,
        keyParts?: string[],
        options?: {
            revalidate?: number | false;
            tags?: string[];
        }
    ): T;
    export function unstable_noStore(): void;
}
