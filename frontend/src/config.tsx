
const isDev =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";

let BACKEND_URL: string;

if (isDev) {
    BACKEND_URL = "http://localhost:8080";
} else {
    BACKEND_URL = "https://your-production-domain.com";
}

export { BACKEND_URL };