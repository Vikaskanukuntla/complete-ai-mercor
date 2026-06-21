import { BACKEND_URL } from "@/lib/config";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Bot, Loader2, PhoneOff, User } from "lucide-react";
import { Button } from "./ui/button";
import { VoiceOrb } from "./VoiceOrb";

type Status = "connecting" | "live" | "ending";

export function InterviewGroq() {
    const { interviewId } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<Status>("connecting");
    const [aiSpeaking, setAiSpeaking] = useState(false);
    const [userSpeaking, setUserSpeaking] = useState(false);

    const socketRef = useRef<WebSocket | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const userStreamRef = useRef<MediaStream | null>(null);
    const lastTranscriptTime = useRef<number>(0);

    function speak(text: string) {
        setAiSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.onend = () => setAiSpeaking(false);
        speechSynthesis.speak(utterance);
    }

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (cancelled) {
                ms.getTracks().forEach((t) => t.stop());
                return;
            }
            userStreamRef.current = ms;

            const socket = new WebSocket("wss://api.deepgram.com/v1/listen", [
                "token",
                "88dd62c4f80f053cbae8cf9ddc87dcec99218cd8",
            ]);
            socketRef.current = socket;

            socket.onopen = () => {
                const mediaRecorder = new MediaRecorder(ms, { mimeType: "audio/webm" });
                recorderRef.current = mediaRecorder;
                mediaRecorder.start(250);
                mediaRecorder.addEventListener("dataavailable", (event) => {
                    if (socket.readyState === WebSocket.OPEN) socket.send(event.data);
                });
            };

            socket.onmessage = async (message) => {
                const received = JSON.parse(message.data);
                const transcript = received.channel?.alternatives[0]?.transcript;
                const isFinal = received.is_final;
            
                if (transcript && isFinal && transcript.trim().split(" ").length >= 2) {
                    setUserSpeaking(true);
                    lastTranscriptTime.current = Date.now();
            
                    setTimeout(async () => {
                        if (Date.now() - lastTranscriptTime.current >= 1500) {
                            setUserSpeaking(false);
                            const res = await axios.post(
                                `${BACKEND_URL}/api/v1/groq/ask/${interviewId}`,
                                { message: transcript }
                            );
                            speak(res.data.reply);
                        }
                    }, 3000);
                }
            };

            if (cancelled) return;
            setStatus("live");

            const res = await axios.post(`${BACKEND_URL}/api/v1/groq/ask/${interviewId}`, {
                message: "Hello, I'm ready to start the interview."
            });
            speak(res.data.reply);
        })();

        return () => {
            cancelled = true;
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interviewId]);

    function cleanup() {
        speechSynthesis.cancel();
        recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
        socketRef.current?.close();
        userStreamRef.current?.getTracks().forEach((t) => t.stop());
    }

    function endInterview() {
        setStatus("ending");
        cleanup();
        navigate(`/result/${interviewId}`);
    }

    return (
        <main className="flex h-screen w-screen flex-col overflow-hidden">
            <header className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="relative flex size-2.5">
                        <span
                            className={
                                status === "live"
                                    ? "absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                                    : "hidden"
                            }
                        />
                        <span
                            className={
                                "relative inline-flex size-2.5 rounded-full " +
                                (status === "live" ? "bg-emerald-400" : "bg-amber-400")
                            }
                        />
                    </span>
                    {status === "connecting" ? "Connecting…" : status === "ending" ? "Wrapping up…" : "Interview live"}
                </div>
                <span className="text-sm text-muted-foreground">AI Interview (Groq)</span>
            </header>

            <div className="flex flex-1 items-center justify-center px-6">
                {status === "connecting" ? (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Loader2 className="size-7 animate-spin" />
                        <p className="text-sm">Setting up your interview & microphone…</p>
                    </div>
                ) : (
                    <div className="flex w-full max-w-3xl items-center justify-center gap-12 sm:gap-24">
                        <VoiceOrb
                            level={aiSpeaking ? 0.8 : 0}
                            speaking={aiSpeaking}
                            label="Interviewer"
                            sublabel="Listening"
                            icon={Bot}
                            accent="violet"
                        />
                        <VoiceOrb
                            level={userSpeaking ? 0.8 : 0}
                            speaking={userSpeaking}
                            label="You"
                            sublabel="Mic on"
                            icon={User}
                            accent="emerald"
                        />
                    </div>
                )}
            </div>

            <footer className="flex justify-center px-6 py-8">
                <Button
                    variant="destructive"
                    size="lg"
                    onClick={endInterview}
                    disabled={status === "ending"}
                    className="gap-2 rounded-full px-6"
                >
                    {status === "ending" ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <PhoneOff className="size-4" />
                    )}
                    End interview
                </Button>
            </footer>
        </main>
    );
}