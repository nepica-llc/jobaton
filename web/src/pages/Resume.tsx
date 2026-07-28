import { useState, useEffect, useRef } from "react";
import { Upload, Plus, Trash2, FileText, Download, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface ResumeData {
  id?: string;
  name: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: { title: string; company: string; location: string; startDate: string; endDate: string; bullets: string[] }[];
  education: { school: string; degree: string; year: string }[];
  skills: string[];
  rawText?: string;
}

const emptyResume: ResumeData = {
  name: "My Resume",
  fullName: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  experience: [],
  education: [],
  skills: [],
};

export default function Resume() {
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [active, setActive] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getResumes().then((data: any) => setResumes(data || [])).catch(() => {});
  }, []);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push((content.items as any[]).map((item) => item.str).join(" "));
    }
    return pages.join("\n\n");
  };

  const parseWithAI = async (text: string): Promise<ResumeData> => {
    const res = await api.chat([
      {
        role: "system",
        content: `Parse this resume text into structured JSON. Output ONLY valid JSON with this shape:
{
  "fullName": "", "email": "", "phone": "", "location": "", "summary": "",
  "experience": [{"title":"","company":"","location":"","startDate":"","endDate":"","bullets":[""]}],
  "education": [{"school":"","degree":"","year":""}],
  "skills": [""]
}`,
      },
      { role: "user", content: text },
    ]);
    return { ...JSON.parse(res.content), rawText: text, name: "Uploaded Resume" };
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await extractTextFromPdf(file);
      const parsed = await parseWithAI(text);
      const saved = await api.saveResume(parsed);
      setResumes((prev) => [...prev, saved]);
      setActive(saved);
      toast.success("Resume uploaded and parsed!");
    } catch (err: any) {
      toast.error(err.message || "Failed to parse resume");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleCreateNew = () => {
    setActive({ ...emptyResume });
  };

  const handleSave = async () => {
    if (!active) return;
    setLoading(true);
    try {
      if (active.id) {
        await api.updateResume(active.id, active);
        setResumes((prev) => prev.map((r) => (r.id === active.id ? active : r)));
      } else {
        const saved = await api.saveResume(active);
        setResumes((prev) => [...prev, saved]);
        setActive(saved);
      }
      toast.success("Resume saved!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteResume(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
      if (active?.id === id) setActive(null);
      toast.success("Resume deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAIGenerate = async () => {
    if (!active?.rawText) {
      toast.error("Upload a resume first or enter your details");
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.chat([
        {
          role: "system",
          content: "You are a professional resume writer. Improve the following resume summary to be more compelling and ATS-friendly. Output ONLY the improved summary text, nothing else.",
        },
        { role: "user", content: `Current summary: ${active.summary}\n\nFull resume context: ${active.rawText}` },
      ]);
      setActive({ ...active, summary: res.content });
      toast.success("Summary improved by AI!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const updateField = (field: keyof ResumeData, value: any) => {
    if (active) setActive({ ...active, [field]: value });
  };

  const updateExperience = (idx: number, field: string, value: any) => {
    if (!active) return;
    const exp = [...active.experience];
    exp[idx] = { ...exp[idx], [field]: value };
    setActive({ ...active, experience: exp });
  };

  const addExperience = () => {
    if (!active) return;
    setActive({
      ...active,
      experience: [...active.experience, { title: "", company: "", location: "", startDate: "", endDate: "", bullets: [""] }],
    });
  };

  const removeExperience = (idx: number) => {
    if (!active) return;
    setActive({ ...active, experience: active.experience.filter((_, i) => i !== idx) });
  };

  // --- List view (no active resume) ---
  if (!active) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resumes</h1>
            <p className="text-sm text-gray-500 mt-1">Upload a PDF or create from scratch.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload PDF
            </button>
            <button onClick={handleCreateNew} className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <Plus className="h-4 w-4" /> New Resume
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".pdf" onChange={handleUpload} className="hidden" />
        </div>

        {resumes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No resumes yet. Upload a PDF or create one manually.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {resumes.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => setActive(r)}>
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{r.fullName || r.name}</p>
                    <p className="text-xs text-gray-400">{r.experience?.length || 0} positions · {r.skills?.length || 0} skills</p>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id!); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Editor view ---
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => setActive(null)} className="text-sm text-blue-600 hover:underline mb-1">&larr; Back to list</button>
          <h1 className="text-2xl font-bold text-gray-900">{active.fullName || "New Resume"}</h1>
        </div>
        <button onClick={handleSave} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="space-y-6">
        {/* Personal Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" value={active.fullName} onChange={(v) => updateField("fullName", v)} />
            <Input label="Email" value={active.email} onChange={(v) => updateField("email", v)} />
            <Input label="Phone" value={active.phone} onChange={(v) => updateField("phone", v)} />
            <Input label="Location" value={active.location} onChange={(v) => updateField("location", v)} />
          </div>
        </section>

        {/* Summary */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
            <button onClick={handleAIGenerate} disabled={aiLoading} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors">
              {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              AI Improve
            </button>
          </div>
          <textarea
            value={active.summary}
            onChange={(e) => updateField("summary", e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Professional summary..."
          />
        </section>

        {/* Experience */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Experience</h2>
            <button onClick={addExperience} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <Plus className="h-3 w-3" /> Add Position
            </button>
          </div>
          {active.experience.map((exp, idx) => (
            <div key={idx} className="border border-gray-100 rounded-lg p-4 mb-3 relative">
              <button onClick={() => removeExperience(idx)} className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Input label="Job Title" value={exp.title} onChange={(v) => updateExperience(idx, "title", v)} />
                <Input label="Company" value={exp.company} onChange={(v) => updateExperience(idx, "company", v)} />
                <Input label="Start Date" value={exp.startDate} onChange={(v) => updateExperience(idx, "startDate", v)} />
                <Input label="End Date" value={exp.endDate} onChange={(v) => updateExperience(idx, "endDate", v)} placeholder="Present" />
              </div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bullet Points</label>
              {exp.bullets.map((b, bi) => (
                <div key={bi} className="flex gap-2 mb-1.5">
                  <span className="text-gray-400 text-sm mt-1.5">•</span>
                  <input
                    value={b}
                    onChange={(e) => {
                      const bullets = [...exp.bullets];
                      bullets[bi] = e.target.value;
                      updateExperience(idx, "bullets", bullets);
                    }}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      const bullets = exp.bullets.filter((_, i) => i !== bi);
                      updateExperience(idx, "bullets", bullets);
                    }}
                    className="p-1 text-gray-300 hover:text-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => updateExperience(idx, "bullets", [...exp.bullets, ""])}
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                + Add bullet
              </button>
            </div>
          ))}
        </section>

        {/* Skills */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {active.skills.map((s, i) => (
              <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                {s}
                <button
                  onClick={() => setActive({ ...active, skills: active.skills.filter((_, si) => si !== i) })}
                  className="text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            placeholder="Type a skill and press Enter"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                setActive({ ...active, skills: [...active.skills, (e.target as HTMLInputElement).value.trim()] });
                (e.target as HTMLInputElement).value = "";
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </section>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}
