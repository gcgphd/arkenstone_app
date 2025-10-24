const API_BASE_URL = "http://127.0.0.1:8080"

export const token = async () => {
    const response = await fetch(
        `${API_BASE_URL}/api/validate-token`,
        {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        }
    );

    if (!response.ok) {
        var error_message = await response.json()
        console.log(error_message)
        throw new Error(error_message.message);
    }

    return await response.json();
};

