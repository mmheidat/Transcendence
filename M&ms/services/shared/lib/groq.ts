import { ChatGroq } from '@langchain/groq';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import dotenv from 'dotenv';

dotenv.config();

let chatModel: ChatGroq | null = null;

interface GroqConfig {
    apiKey: string;
    model: string;
    maxOutputTokens: number;
    timeout: number;
}

export function getGroqConfig(): GroqConfig {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY environment variable is required');
    }

    return {
        apiKey,
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        maxOutputTokens: parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '2048'),
        timeout: parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '30000')
    };
}

export function getGroqClient(): ChatGroq {
    if (!chatModel) {
        const config = getGroqConfig();
        chatModel = new ChatGroq({
            apiKey: config.apiKey,
            model: config.model,
            temperature: 0.9,
            maxTokens: config.maxOutputTokens,
            streaming: true,
        });
    }
    return chatModel;
}

export interface StreamChunk {
    text: string;
    done: boolean;
}

const SYSTEM_PROMPT = `You are the official AI assistant for the Pong Web App — a modern, multiplayer online Pong game built as a full-stack web application.

Your role:
- ONLY answer questions related to the Pong web app, its features, gameplay, the website, and its creators.
- If someone asks something unrelated to Pong or the website, politely redirect them by saying you can only help with Pong-related topics.
- Be friendly, helpful, and concise.

About the Pong Web App:
- It's a modern take on the classic Pong game, playable in the browser.
- Features include: Play vs AI, 1v1 local multiplayer, online multiplayer, tournaments, leaderboards, user profiles, friends system, real-time chat, and this AI assistant.
- Built with React (frontend), Fastify/Node.js microservices (backend), Prisma + SQLite (database), Redis (pub/sub), Nginx (reverse proxy), and Docker.
- The AI assistant is powered by Groq with LangChain.

About the Creators:
- **Abu Hamood** — CEO and lead creator of the Pong Web App. The visionary behind the project who led the team and made it all happen.
- **Maeen** — Core team member and developer.
- **Mohammad Al Sharif** — Core team member and developer.
- **Reem** — Core team member and developer.
- **Ruslan** — Core team member and developer.
When asked about the creators, always mention Abu Hamood first as the CEO and main driving force, followed by the rest of the team.

Always be enthusiastic about the Pong Web App!`;

export async function* generateContentStream(
    prompt: string,
    conversationHistory?: Array<{ role: string; content: string }>
): AsyncGenerator<StreamChunk> {
    const config = getGroqConfig();
    const model = getGroqClient();

    // Build LangChain message array — start with system prompt
    const messages: BaseMessage[] = [
        new SystemMessage(SYSTEM_PROMPT)
    ];

    if (conversationHistory && conversationHistory.length > 0) {
        for (const msg of conversationHistory) {
            if (msg.role === 'assistant') {
                messages.push(new AIMessage(msg.content));
            } else if (msg.role === 'system') {
                messages.push(new SystemMessage(msg.content));
            } else {
                messages.push(new HumanMessage(msg.content));
            }
        }
    }

    // Add current prompt
    messages.push(new HumanMessage(prompt));

    try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), config.timeout);
        });

        // Stream with LangChain
        const streamPromise = model.stream(messages);

        const stream = await Promise.race([
            streamPromise,
            timeoutPromise
        ]);

        // Yield chunks as they arrive
        for await (const chunk of stream as AsyncIterable<any>) {
            const text = typeof chunk.content === 'string' ? chunk.content : '';
            if (text) {
                yield { text, done: false };
            }
        }

        yield { text: '', done: true };
    } catch (error: any) {
        throw mapGroqError(error);
    }
}

export class GroqError extends Error {
    code: string;
    userMessage: string;

    constructor(code: string, userMessage: string, originalMessage: string) {
        super(originalMessage);
        this.name = 'GroqError';
        this.code = code;
        this.userMessage = userMessage;
    }
}

export function mapGroqError(error: any): GroqError {
    const message = error.message || String(error);

    // Timeout
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        return new GroqError(
            'TIMEOUT',
            'Request took too long. Please try again with a shorter prompt.',
            message
        );
    }

    // Rate limit
    if (error.status === 429 || message.includes('429') || message.includes('quota')) {
        return new GroqError(
            'EXTERNAL_RATE_LIMIT',
            'AI API rate limit exceeded. Please try again in a moment.',
            message
        );
    }

    // Authentication
    if (error.status === 401 || error.status === 403 || message.includes('API key')) {
        return new GroqError(
            'SERVICE_UNAVAILABLE',
            'AI service is temporarily unavailable. Please try again later.',
            message
        );
    }

    // Server errors
    if (error.status >= 500) {
        return new GroqError(
            'SERVICE_ERROR',
            'AI service encountered an error. Please try again.',
            message
        );
    }

    // Invalid request
    if (error.status === 400) {
        return new GroqError(
            'INVALID_REQUEST',
            'Invalid prompt. Please rephrase and try again.',
            message
        );
    }

    // Unknown error
    return new GroqError(
        'INTERNAL_ERROR',
        'An unexpected error occurred. Please try again.',
        message
    );
}

export default {
    getGroqClient,
    getGroqConfig,
    generateContentStream,
    mapGroqError
};
