import { SessionData } from "../types";

export class ApiService {
    private baseUrl = "/api/session";

    async getSession(username: string): Promise<SessionData | null> {
        const response = await fetch(`${this.baseUrl}?username=${encodeURIComponent(username)}`);
        if (!response.ok) {
            throw new Error(`Cloud fetch failed with status: ${response.status}`);
        }

        const result = await response.json();
        if (result.found && result.data) {
            return JSON.parse(result.data);
        }
        return null;
    }

    async saveSession(username: string, data: SessionData): Promise<boolean> {
        try {
            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username,
                    data: JSON.stringify(data)
                })
            });
            return response.ok;
        } catch (error) {
            console.error("Cloud save error:", error);
            return false;
        }
    }
}

export const api = new ApiService();
