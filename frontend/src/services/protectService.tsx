import { BACKEND_URL } from "../config";

export const token = async () => {
    const response = await fetch(
        `${BACKEND_URL}/api/validate-token`,
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

