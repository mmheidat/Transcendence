import { GoogleGenerativeAI, GenerateContentStreamResult } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

let genAI: GoogleGenerativeAI | null = null;

interface GeminiConfig {
    apiKey: string;
    model: string;
    maxOutputTokens: number;
    timeout: number;
}

export function getGeminiConfig(): GeminiConfig {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is required');
    }

    return {
        apiKey,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        maxOutputTokens: parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '2048'),
        timeout: parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '30000')
    };
}

export function getGeminiClient(): GoogleGenerativeAI {
    if (!genAI) {
        const config = getGeminiConfig();
        genAI = new GoogleGenerativeAI(config.apiKey);
    }
    return genAI;
}

export interface StreamChunk {
    text: string;
    done: boolean;
}

export async function* generateContentStream(
    prompt: string,
    conversationHistory?: Array<{ role: string; content: string }>
): AsyncGenerator<StreamChunk> {
    const config = getGeminiConfig();
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: config.model });

    // Build conversation context
    const contents = [];
    
    if (conversationHistory && conversationHistory.length > 0) {
        for (const msg of conversationHistory) {
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            });
        }
    }
    
    // Add current prompt
    contents.push({
        role: 'user',
        parts: [{ text: prompt }]
    });

    try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), config.timeout);
        });

        // Stream with timeout
        const streamPromise = model.generateContentStream({
            contents,
            generationConfig: {
                maxOutputTokens: config.maxOutputTokens,
                temperature: 0.9,
                topP: 0.95,
                topK: 40
            }
        });

        const result: GenerateContentStreamResult = await Promise.race([
            streamPromise,
            timeoutPromise
        ]) as GenerateContentStreamResult;

        // Yield chunks as they arrive
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
                yield { text: chunkText, done: false };
            }
        }

        yield { text: '', done: true };
    } catch (error: any) {
        throw mapGeminiError(error);
    }
}

export class GeminiError extends Error {
    code: string;
    userMessage: string;

    constructor(code: string, userMessage: string, originalMessage: string) {
        super(originalMessage);
        this.name = 'GeminiError';
        this.code = code;
        this.userMessage = userMessage;
    }
}

export function mapGeminiError(error: any): GeminiError {
    const message = error.message || String(error);

    // Timeout
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        return new GeminiError(
            'TIMEOUT',
            'Request took too long. Please try again with a shorter prompt.',
            message
        );
    }

    // Rate limit from Gemini
    if (error.status === 429 || message.includes('429') || message.includes('quota')) {
        return new GeminiError(
            'EXTERNAL_RATE_LIMIT',
            'Gemini API rate limit exceeded. Please try again in a moment.',
            message
        );
    }

    // Authentication
    if (error.status === 401 || error.status === 403 || message.includes('API key')) {
        return new GeminiError(
            'SERVICE_UNAVAILABLE',
            'AI service is temporarily unavailable. Please try again later.',
            message
        );
    }

    // Server errors
    if (error.status >= 500) {
        return new GeminiError(
            'SERVICE_ERROR',
            'AI service encountered an error. Please try again.',
            message
        );
    }

    // Invalid request
    if (error.status === 400) {
        return new GeminiError(
            'INVALID_REQUEST',
            'Invalid prompt. Please rephrase and try again.',
            message
        );
    }

    // Unknown error
    return new GeminiError(
        'INTERNAL_ERROR',
        'An unexpected error occurred. Please try again.',
        message
    );
}

export default {
    getGeminiClient,
    getGeminiConfig,
    generateContentStream,
    mapGeminiError
};
