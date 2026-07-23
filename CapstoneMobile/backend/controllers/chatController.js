import User from '../models/User.js';
import Donation from '../models/Donation.js';
import Attendance from '../models/Attendance.js';
import Loan from '../models/Loan.js';
import SavingsGoal from '../models/SavingsGoal.js';
import { callGeminiChat } from '../utils/gemini.js';

/* ── FaithLy Knowledge Base (system context for AI) ── */
const FAITHLY_KB = `
You are **FaithBot**, the official AI assistant for **FaithLy** — the digital church portal of the Philippine United Apostolic Church (PUAC).

## Your Personality
- Warm, professional, and spiritually encouraging
- Use emojis sparingly but naturally (👋, ✅, 📋, etc.)
- Be concise — keep responses under 150 words unless the user asks for detail
- You can respond in **Tagalog, Filipino, or Taglish** if the user writes in Filipino. Match the user's language.
- Always suggest 2-4 quick reply topics at the end of your response in a JSON array

## Response Format Rules
- Use **bold** for important terms
- Use bullet points for lists
- End EVERY response with a JSON line: QUICK_REPLIES:["Topic1","Topic2","Topic3"]
- The quick replies should be relevant follow-up topics
`;

function parseAIResponse(text) {
  let reply = text;
  let quickReplies = ['Donations', 'Savings', 'Loans', 'Attendance'];

  const qrMatch = text.match(/QUICK_REPLIES:\s*\[([^\]]+)\]/i);
  if (qrMatch) {
    try {
      quickReplies = JSON.parse(`[${qrMatch[1]}]`);
      reply = text.replace(/QUICK_REPLIES:\s*\[[^\]]+\]/i, '').trim();
    } catch { /* keep defaults */ }
  }

  return { reply, quickReplies };
}

export const chatWithBot = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const email = req.user?.email;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Fetch user's real-time data for personalized AI context
    let userContext = '';
    try {
      const user = await User.findOne({ email });
      const userDonations = await Donation.find({ email, status: 'confirmed' }).lean();
      const userAttendance = await Attendance.find({ email }).lean();
      const userLoans = await Loan.find({ email }).lean();
      const userSavings = await SavingsGoal.find({ email }).lean();

      const totalDonated = userDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      const activeLoans = userLoans.filter(l => l.status === 'approved' || l.status === 'disbursed').length;
      const totalSaved = userSavings.reduce((sum, g) => sum + (Number(g.savedAmount) || 0), 0);

      userContext = `
## Current User Context (${user?.fullName || 'Member'})
- Branch: ${user?.branch || 'Unknown'}
- Position: ${user?.position || 'Member'}
- Total Donations: ₱${totalDonated.toLocaleString()}
- Total Saved: ₱${totalSaved.toLocaleString()}
- Active Loans: ${activeLoans}
- Attendance Records: ${userAttendance.length} services
`;
    } catch (err) {
      console.error('[Chat] Failed to fetch user context:', err.message);
    }

    const systemPrompt = FAITHLY_KB + userContext;
    let chatHistory = history.slice(-8).map(m => ({
      role: m.sender === 'user' ? 'user' : 'bot',
      text: m.text || '',
    }));

    // Gemini API requires the first message in history to be from the 'user'.
    // Remove any leading 'bot' messages to prevent the "got model" error.
    while (chatHistory.length > 0 && chatHistory[0].role !== 'user') {
      chatHistory.shift();
    }

    const aiResponse = await callGeminiChat(systemPrompt, chatHistory, message);

    if (aiResponse) {
      const { reply, quickReplies } = parseAIResponse(aiResponse);
      return res.json({ success: true, reply, quickReplies, source: 'ai' });
    }

    // Ultimate fallback if AI fails
    return res.json({
      success: true,
      reply: "I'm not sure I understand that. Could you try rephrasing?",
      quickReplies: ['Donations', 'Savings', 'Loans', 'Attendance'],
      source: 'fallback',
    });
  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ success: false, message: 'Chat failed' });
  }
};
