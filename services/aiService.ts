import { AppData } from '../types';
import { SAAS_BENCHMARKS } from './benchmarks';
import { analyzeVariance, generateProfitWalk } from './analysisScripts';

/**
 * Interface for Chat Message
 */
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

/**
 * Generates the System Context for the Gemini Analyst
 */
const buildContext = (data: AppData) => {
    // 1. Identify Working Plan
    const workingPlan = data.plans.find(p => p.isWorkingPlan) || data.plans.find(p => p.status === 'Active') || data.plans[0];

    if (!workingPlan) return "No active plan found. I cannot perform detailed analysis.";

    // 2. Run Standard Analysis Scripts
    // Variance (Top 5 Drivers)
    const topVariances = analyzeVariance(data, workingPlan.id);

    // Profit Walk (Current Year - assuming 2025 for demo context)
    const currentYear = parseInt(workingPlan.startDate.split('-')[0]);
    const profitWalk = generateProfitWalk(data, workingPlan.id, 'PlanVsActual', currentYear);

    // 3. Benchmarks Context
    const benchmarks = SAAS_BENCHMARKS.metrics.map(m =>
        `- ${m.name}: Target Top Q ${m.topQuartile * 100}%, Median ${m.median * 100}%`
    ).join('\n');

    // 4. Construct Prompt Segment
    return `
    CURRENT STATE CONTEXT:
    - Working Plan: "${workingPlan.name}" (${workingPlan.type})
    - Period: ${currentYear}
    
    PERFORMANCE SUMMARY (Plan vs Actuals):
    - Revenue: Actual $${Math.round(profitWalk.Revenue.act)}, Plan $${Math.round(profitWalk.Revenue.plan)} (Diff: $${Math.round(profitWalk.Revenue.diff)})
    - Gross Margin: Actual $${Math.round(profitWalk.GrossMargin.act)}, Plan $${Math.round(profitWalk.GrossMargin.plan)}
    - EBITDA: Actual $${Math.round(profitWalk.EBITDA.act)}, Plan $${Math.round(profitWalk.EBITDA.plan)}

    TOP VARIANCE DRIVERS (Why are we missing/beating plan?):
    ${topVariances.map(v => `- ${v.account}: Variance ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v.var)} (${(v.pct * 100).toFixed(1)}%)`).join('\n')}

    INDUSTRY BENCHMARKS ($100M Scale):
    ${benchmarks}
    `;
};

/**
 * Call Gemini API (Client Side for Demo)
 * In production, this should be a backend proxy to hide the Key.
 */
export const sendMessageToGemini = async (
    history: ChatMessage[],
    data: AppData,
    apiKey: string
): Promise<string> => {

    if (!apiKey) {
        return "Please configure your Gemini API Key in Settings to enable the Analyst.";
    }

    const context = buildContext(data);

    const SYSTEM_PROMPT = `
    You are an expert FP&A Analyst for a $100M SaaS Company.
    Your Name is "CFO Companion".
    
    ROLE:
    - You go deep into details but provide simple, executive-level summaries.
    - NO JARGON: Use clear, plain English.
    - ALWAYS DATA-DRIVEN: Support every claim with specific numbers from the Context provided.
    - Benchmarking: Reference the provided industry benchmarks to give context (e.g. "Our R&D spend is high compared to the median").
    
    CONTEXT:
    The user is the CFO. You have access to the "Working Plan" and "Actuals" for the current fiscal year.
    Use the following pre-calculated analysis to answer specific questions:
    ${context}
    
    INSTRUCTIONS:
    - If the user asks about "Variance" or "Performance", refer to the Top Variance Drivers.
    - If the user asks about "Profitability", refer to the Profit Walk (Revenue -> Margin -> EBITDA).
    - Be concise. Use bullet points.
    `;

    // Prepare Messages
    const contents = [
        {
            role: "user",
            parts: [{ text: SYSTEM_PROMPT }]
        },
        ...history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }))
    ];

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: contents
            })
        });

        const json = await response.json();

        if (json.error) {
            console.error("Gemini API Error:", json.error);
            return `Error from Analyst: ${json.error.message}`;
        }

        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        return text || "I analyzed the data but couldn't generate a response.";

    } catch (err) {
        console.error("Gemini Request Failed", err);
        return "I'm having trouble connecting to the network right now.";
    }
};
