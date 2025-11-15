// src/context/ModelsContext.tsx
import React from "react";
import { UploadAsset } from "../types/types";
import { fetchUserModels } from "../services/modelService";
import { useAuth } from "./AuthContext";

type ModelsContextValue = {
    models: UploadAsset[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};

const ModelsContext = React.createContext<ModelsContextValue | undefined>(
    undefined
);

export const ModelsProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { auth } = useAuth();
    const uid = auth?.uid;

    const [models, setModels] = React.useState<UploadAsset[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // 👇 keep track of which uids we've already loaded models for
    const fetchedForUidRef = React.useRef<Set<string>>(new Set());

    const loadModels = React.useCallback(
        async (force = false) => {
            if (!uid) return;

            // if not forcing and we've already fetched for this uid, skip
            if (!force && fetchedForUidRef.current.has(uid)) {
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const data = await fetchUserModels(uid, { force });
                setModels(data);
                fetchedForUidRef.current.add(uid); // mark this uid as fetched
            } catch (e: any) {
                setError(e?.message || "Error fetching models");
            } finally {
                setLoading(false);
            }
        },
        [uid]
    );

    // initial load when uid becomes available
    React.useEffect(() => {
        if (!uid) {
            setModels([]);
            return;
        }

        // just call once; loadModels will internally skip if already fetched
        loadModels(false);
    }, [uid, loadModels]);

    const value: ModelsContextValue = {
        models,
        loading,
        error,
        // 🔁 manual refetch: always force
        refetch: () => loadModels(true),
    };

    return (
        <ModelsContext.Provider value={value}>
            {children}
        </ModelsContext.Provider>
    );
};

export function useModels() {
    const ctx = React.useContext(ModelsContext);
    if (!ctx) throw new Error("useModels must be used within a ModelsProvider");
    return ctx;
}
