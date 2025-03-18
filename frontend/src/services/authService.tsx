const API_BASE_URL = "http://127.0.0.1:8080"

export const login = async (email: string, password: string) => {
    const response = await fetch(
        //`${import.meta.env.VITE_API_BASE_URL}/auth/login`,
        `${API_BASE_URL}/signin`,
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
        `${API_BASE_URL}/signout`,
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