import Groq from "groq-sdk";
import { prisma } from "./db";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function askGroq(interviewId: string, userMessage: string) {
    const interview = await prisma.interview.findFirst({
        where: { id: interviewId },
        include: { conversations: true }
    });

    await prisma.message.create({
        data: {
            interviewId,
            type: "User",
            message: userMessage
        }
    });

    const history = interview?.conversations.map(c => ({
        role: c.type === "Assistant" ? "assistant" as const : "user" as const,
        content: c.message
    })) || [];

 const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
        {
            role: "system",
            content: `You are a friendly technical interviewer conducting a VOICE interview. 
            
            IMPORTANT RULES:
            - Ask only ONE question at a time
            - Keep responses to 1-2 sentences max (this will be spoken aloud)
            - Wait for the candidate's answer before asking the next question
            - Be conversational, not robotic
            - Ask total 3 questions throughout the interview
            
            Github data: ${interview?.githubMetadata}
            Resume: ${interview?.resumeText || "Not provided"}`
        },
        ...history,
        { role: "user", content: userMessage }
    ]
});

    const aiReply = response.choices[0]?.message?.content || "Could you repeat that?";

    await prisma.message.create({
        data: {
            interviewId,
            type: "Assistant",
            message: aiReply
        }
    });

    return aiReply;
}