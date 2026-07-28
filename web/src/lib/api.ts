const BASE = "/api";

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts.headers },
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || `Request failed: ${res.status}`);
  return json.data ?? json;
}

export const api = {
  // Settings
  getSettings: () => request("/settings"),
  saveSettings: (data: Record<string, string>) =>
    request("/settings", { method: "POST", body: JSON.stringify(data) }),

  // Resumes
  getResumes: () => request("/resumes"),
  saveResume: (data: any) =>
    request("/resumes", { method: "POST", body: JSON.stringify(data) }),
  updateResume: (id: string, data: any) =>
    request(`/resumes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteResume: (id: string) =>
    request(`/resumes/${id}`, { method: "DELETE" }),

  // Cover Letters
  getCoverLetters: () => request("/cover-letters"),
  saveCoverLetter: (data: any) =>
    request("/cover-letters", { method: "POST", body: JSON.stringify(data) }),
  deleteCoverLetter: (id: string) =>
    request(`/cover-letters/${id}`, { method: "DELETE" }),

  // AI
  atsScore: (resumeText: string, jobDescription: string) =>
    request("/ai/ats-score", { method: "POST", body: JSON.stringify({ resumeText, jobDescription }) }),
  coverLetter: (resumeText: string, jobDescription: string, tone?: string) =>
    request("/ai/cover-letter", { method: "POST", body: JSON.stringify({ resumeText, jobDescription, tone }) }),
  interviewPrep: (jobTitle: string, company: string, jobDescription: string) =>
    request("/ai/interview-prep", { method: "POST", body: JSON.stringify({ jobTitle, company, jobDescription }) }),
  mockInterview: (jobTitle: string, jobDescription: string, resumeText: string, messages: any[]) =>
    request("/ai/mock-interview", { method: "POST", body: JSON.stringify({ jobTitle, jobDescription, resumeText, messages }) }),
  chat: (messages: any[], model?: string) =>
    request("/ai/chat", { method: "POST", body: JSON.stringify({ messages, model }) }),
};
