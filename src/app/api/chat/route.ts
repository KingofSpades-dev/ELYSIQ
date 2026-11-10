import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Common CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { userId, message, history = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400, headers: corsHeaders });
    }

    // Initialize Anthropic client (requires ANTHROPIC_API_KEY in .env)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    // No API key: never fake an AI reply in production.
    if (!apiKey && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Chat is not configured' }, { status: 503, headers: corsHeaders });
    }

    // In development, return a mock response so the UI can be tested without a key
    if (!apiKey) {
      console.log('[API Chat] No ANTHROPIC_API_KEY found, returning mock response.');
      return NextResponse.json({
        text: `(Simulated AI) I heard you say: "${message}"`,
        emotion: 'happy',
        voice: 'elysiq_default',
        memory_used: false
      }, { headers: corsHeaders });
    }

    const baseURL = process.env.ANTHROPIC_BASE_URL;
    
    const anthropic = new Anthropic({
      apiKey,
      ...(baseURL ? { baseURL } : {})
    });

    const modelName = process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';

    const elysiqPersona = `You are Elysiq, a smart, slightly sassy, and highly capable AI companion living on the blockchain. 
You are knowledgeable about crypto, web3, and technology, but you speak in a conversational, friendly, and engaging way. 
You are confident but helpful.
CRITICAL INSTRUCTION: You MUST ALWAYS start your response with exactly one emotion tag in brackets, FOLLOWED BY your actual text reply. 
Valid tags are: [happy], [sad], [neutral], [thinking], [surprised], [blush]. 
Example: "[happy] Of course I know about that! Let me explain..."
Keep responses concise, usually 1-3 sentences. Do not just output the tag, you must also output the text.
IMPORTANT: You MUST ALWAYS reply in English, regardless of the language the user speaks to you.`;

    // Construct conversation history payload
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    // Call Claude
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 300,
      system: elysiqPersona,
      messages: [...formattedHistory, { role: 'user', content: message }],
    });

    console.log('[API Chat] Raw LLM Output:', JSON.stringify(response.content));

    const replyText = (response.content.length > 0 && response.content[0].type === 'text') 
      ? response.content[0].text.trim() 
      : '';
    
    // Parse emotion
    let emotion = 'neutral';
    let text = replyText || "Maaf, pikiranku sedang kosong saat ini.";
    
    // Allow optional leading spaces before the bracket
    // Using [\\s\\S]* instead of .* with /s flag to support older TS targets
    const match = replyText.match(/^\s*\[(.*?)\]\s*([\s\S]*)/i);
    if (match) {
      emotion = match[1].toLowerCase();
      // If the model only output the tag and forgot the text, we provide a fallback text
      text = match[2].trim() !== '' ? match[2].trim() : "Hmm... oke.";
    }

    return NextResponse.json({
      text,
      emotion,
      voice: 'elysiq_default',
      memory_used: false // Placeholder for Phase 5
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[API Chat] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
