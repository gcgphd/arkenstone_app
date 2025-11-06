import { BACKEND_URL } from "../config";


export const login = async (email: string, password: string) => {
    const response = await fetch(
        //`${import.meta.env.VITE_API_BASE_URL}/auth/login`,
        `${BACKEND_URL}/signin`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password }),
        }
    );

    if (!response.ok) {
        var error_message = await response.json()
        throw new Error(error_message.message);
    }

    return await response.json();
};


export const logout = async () => {
    const response = await fetch(
        //`${import.meta.env.VITE_API_BASE_URL}/auth/login`,
        `${BACKEND_URL}/signout`,
        {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        }
    );

    if (!response.ok) {
        var error_message = await response.json()
        throw new Error(error_message.message);
    }

    return await response.json();
};