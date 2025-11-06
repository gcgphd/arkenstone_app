import React from "react";

type AuthState = { uid: string | null; email?: string | null };
type AuthCtx = {
    auth: AuthState;
    setAuth: (s: AuthState) => void;
    logout: () => void;
};

const AuthContext = React.createContext<AuthCtx | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [auth, setAuthState] = React.useState<AuthState>(() => {
        const uid = typeof window !== "undefined" ? localStorage.getItem("uid") : null;
        const email = typeof window !== "undefined" ? localStorage.getItem("email") : null;
        return { uid, email };
    });

    const setAuth = React.useCallback((s: AuthState) => {
        setAuthState(s);
        if (typeof window !== "undefined") {
            s.uid ? localStorage.setItem("uid", s.uid) : localStorage.removeItem("uid");
            s.email ? localStorage.setItem("email", s.email) : localStorage.removeItem("email");
        }
    }, []);

    const logout = React.useCallback(() => setAuth({ uid: null, email: null }), [setAuth]);

    const value = React.useMemo(() => ({ auth, setAuth, logout }), [auth, setAuth, logout]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
    const ctx = React.useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
