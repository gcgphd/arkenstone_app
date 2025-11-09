// useJobPolling.ts
import * as React from "react";
import { pollingService } from "./pollingService";

export function useJobPolling(
    onUpdate: (evt: { jobId: string; status: string; data: any }) => void
) {
    React.useEffect(() => {
        const unsubscribe = pollingService.subscribe(onUpdate);
        return () => {
            unsubscribe(); // returns void
        };
    }, [onUpdate]);

    React.useEffect(() => {
        return () => {
            // optional: do not globally stop all if multiple pages use it
            // pollingService.stopAll();
        };
    }, []);

    return {
        startPolling: (jobId: string, uId: string) => pollingService.start(jobId, uId),
        stopPolling: (jobId: string) => pollingService.stop(jobId),
        stopAllPolling: () => pollingService.stopAll(),
    };
}
