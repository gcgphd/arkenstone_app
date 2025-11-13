// src/services/shareService.ts

export type ShareHooks = {
    onSuccess?: () => void;
    onCopy?: () => void;
    onOpenFallback?: () => void;
    onError?: (err: unknown) => void;
};

/** Open the signed URL; with response-disposition=attachment the browser downloads it. */
export function downloadDirect(signedUrl: string): void {
    // Using target=_blank avoids popup blockers in most cases
    window.open(signedUrl, "_blank", "noopener,noreferrer");
}

/** Copy text to clipboard with fallback for older browsers. */
export async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
}

/** Share a URL via native share if available, else clipboard, else open a tab. */
export async function shareUrl(
    url: string,
    opts?: { title?: string; text?: string } & ShareHooks
): Promise<void> {
    const { title = "Share", text = "", onSuccess, onCopy, onOpenFallback, onError } = opts || {};

    try {
        if (typeof navigator !== "undefined" && typeof (navigator as any).share === "function") {
            await (navigator as any).share({ title, text, url });
            onSuccess?.();
            return;
        }

        await copyToClipboard(url);
        onCopy?.();
    } catch (err) {
        onError?.(err);
        try {
            window.open(url, "_blank", "noopener,noreferrer");
            onOpenFallback?.();
        } catch {
            /* no-op */
        }
    }
}
