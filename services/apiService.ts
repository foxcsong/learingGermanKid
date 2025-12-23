import { SessionData } from "../types";

export class ApiService {
    private baseUrl = "/api/session";

    async getSession(username: string): Promise<SessionData | null> {
        const response = await fetch(`${this.baseUrl}?username=${encodeURIComponent(username)}&t=${Date.now()}`);
        if (!response.ok) {
            let errorMsg = `Cloud fetch failed: ${response.status}`;
            try {
                const errData = await response.json();
                if (errData.error) errorMsg = errData.error;
            } catch (e) { }
            throw new Error(errorMsg);
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
