import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { useNavigate } from "react-router";
import { ArrowRight, Github, Loader2, Mic, FileText, X } from "lucide-react";

export function Form() {
    const [github, setGithub] = useState("");
    const [resume, setResume] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== "application/pdf") {
                toast("Please upload a PDF file");
                return;
            }
            setResume(file);
        }
    }

    async function onSubmit() {
        if (!github.trim()) {
            toast("Please provide a valid GitHub URL");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("github", github.trim());
            if (resume) {
                formData.append("resume", resume);
            }

            const response = await axios.post(`${BACKEND_URL}/api/v1/pre-interview`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            navigate(`/interview/${response.data.id}`);
        } catch (e) {
            toast("Something went wrong starting your interview. Please try again.");
            setLoading(false);
        }
    }

    return (
        <main className="flex h-screen w-screen items-center justify-center overflow-hidden px-6">
            <div className="flex w-full max-w-xl flex-col items-center text-center">
                <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                    <Mic className="size-3.5 text-primary" />
                    Voice-based technical interview
                </span>

                <h1 className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
                    AI Interview Kickstart
                </h1>
                <p className="mt-4 max-w-md text-balance text-base text-muted-foreground">
                    Drop your GitHub profile and resume to start a live, voice-driven interview.
                </p>

                <div className="mt-10 w-full space-y-3">
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-card/60 p-2 shadow-sm backdrop-blur focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
                        <div className="flex items-center pl-2 text-muted-foreground">
                            <Github className="size-5" />
                        </div>
                        <Input
                            value={github}
                            placeholder="https://github.com/your-username"
                            onChange={(e) => setGithub(e.target.value)}
                            disabled={loading}
                            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                        />
                    </div>

                    {/* Resume upload */}
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-card/60 p-2 shadow-sm backdrop-blur">
                        <div className="flex items-center pl-2 text-muted-foreground">
                            <FileText className="size-5" />
                        </div>
                        {resume ? (
                            <div className="flex flex-1 items-center justify-between">
                                <span className="text-sm">{resume.name}</span>
                                <button onClick={() => setResume(null)} className="p-1">
                                    <X className="size-4 text-muted-foreground" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex-1 cursor-pointer text-sm text-muted-foreground">
                                Upload resume (PDF, optional)
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    <Button
                        disabled={loading}
                        onClick={onSubmit}
                        size="lg"
                        className="w-full gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Starting
                            </>
                        ) : (
                            <>
                                Start interview
                                <ArrowRight className="size-4" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </main>
    );
}