// ============================================================
// CampusFix — AI Controller (Powered by Groq)
// File: controllers/aiController.js
// ============================================================

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = process.env.GROQ_PRIMARY_MODEL || 'openai/gpt-oss-120b';
const FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || 'qwen/qwen3.8-27b';

async function callGroqChat(messages, jsonFormat = false) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in backend environment.');
  }

  const payload = {
    model: PRIMARY_MODEL,
    messages,
    temperature: 0.3,
  };

  if (jsonFormat) {
    payload.response_format = { type: 'json_object' };
  }

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      // Attempt fallback model
      console.warn('Primary Groq model error, trying fallback:', data.error);
      payload.model = FALLBACK_MODEL;
      const fallbackRes = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const fallbackData = await fallbackRes.json();
      if (!fallbackRes.ok) {
        throw new Error(fallbackData.error?.message || 'Groq API request failed.');
      }
      return fallbackData.choices[0].message.content;
    }

    return data.choices[0].message.content;
  } catch (err) {
    console.error('Groq API call error:', err.message);
    throw err;
  }
}

// @desc    Polish rough description into structured technician specs
// @route   POST /api/ai/polish
// @access  Public (or authenticated student)
const polishDescription = async (req, res) => {
  const { title, description, category, location } = req.body;

  if (!description || description.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Please write a brief description first before polishing.'
    });
  }

  const systemPrompt = `You are an expert AI maintenance technician and facility manager for CampusFix campus operations.
Your job is to take a student's brief or informal description of a broken item/issue and convert it into a well-structured, clear, technical complaint ticket.

Format your output exactly as:
**Issue Summary:** [Clear 1-sentence technical overview]

**Observed Symptoms:**
- [Bullet 1: Specific malfunction observed]
- [Bullet 2: Physical/operational indicators]

**Safety & Operational Impact:**
[Brief note on urgency, safety precaution, or disruption to class/lab]

Keep it concise, professional, and directly actionable for campus electricians, plumbers, IT technicians, or carpenters. Avoid fluff.`;

  const userContent = `Student Complaint Info:
- Issue Title: ${title || 'Not specified'}
- Category: ${category || 'General'}
- Location: ${location || 'Campus'}
- Rough Student Description: "${description}"`;

  try {
    const polishedText = await callGroqChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ]);

    res.json({
      success: true,
      polishedText: polishedText.trim()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to polish description. ' + err.message
    });
  }
};

// @desc    Evaluate if an issue has a 30-second self-help quick fix
// @route   POST /api/ai/quick-fix
// @access  Public (or authenticated student)
const evaluateQuickFix = async (req, res) => {
  const { title, description, category } = req.body;

  const combinedText = `${title || ''} - ${description || ''}`.trim();
  if (combinedText.length < 4) {
    return res.json({ success: true, hasQuickFix: false });
  }

  const systemPrompt = `You evaluate campus facility complaints to see if they are common, trivial classroom or computer lab glitches that a student or instructor can easily fix themselves in 30 seconds without needing a technician dispatch.

Examples of Quick-Fixable issues:
- Projector "No Signal", blue screen, or not duplicating laptop display (Win+P, HDMI toggle).
- No sound / audio muted on classroom podium speaker (audio jack check, unmute icon).
- Lab computer monitor black or sleeping (power toggle, cable seating).
- Wi-Fi authentication portal loop / captive portal not loading (1.1.1.1 or browser incognito).
- Lab mouse or keyboard not responding (USB reconnect to front/back port).
- Fan regulator loose (toggle wall switch directly).

Examples of NON-Quick-Fixable issues (return {"hasQuickFix": false}):
- Water leakage, broken tap, blocked drain, sewage.
- Burnt switchboard, sparks, AC cooling failure, tripping MCB, high-voltage wiring.
- Cracked windows, broken door lock, fractured desk/bench.
- Projector bulb dead, smoke coming from PC, hardware failure.
- Deep networking / router offline, physical damage.

CRITICAL INSTRUCTIONS:
If it is quick-fixable, return valid JSON:
{
  "hasQuickFix": true,
  "title": "Short Descriptive Title of Fix",
  "steps": [
    "Step 1: Specific 10-second action...",
    "Step 2: Specific 10-second action...",
    "Step 3: Verification step..."
  ]
}

If it requires physical tools, spare parts, plumbing, electrical rewiring, or technician intervention, return valid JSON:
{
  "hasQuickFix": false
}

Return ONLY the raw JSON object.`;

  const userContent = `Issue Category: ${category || 'General'}
Title: ${title || ''}
Description: ${description || ''}`;

  try {
    const rawJson = await callGroqChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ], true);

    let parsed = { hasQuickFix: false };
    try {
      parsed = JSON.parse(rawJson);
    } catch (parseErr) {
      console.warn('JSON parse error from Groq response:', parseErr);
    }

    res.json({
      success: true,
      hasQuickFix: Boolean(parsed.hasQuickFix),
      title: parsed.title || 'Quick 30-Second Fix Available',
      steps: parsed.steps || []
    });
  } catch (err) {
    console.error('evaluateQuickFix error:', err.message);
    // Graceful fallback: do not block ticket submission
    res.json({
      success: true,
      hasQuickFix: false
    });
  }
};

// @desc    Analyze rough description to extract title, category, urgency, and polished tech specs
// @route   POST /api/ai/analyze
// @access  Public (or authenticated student)
const analyzeComplaint = async (req, res) => {
  const { description } = req.body;

  if (!description || description.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Please write a brief description of the issue first.'
    });
  }

  const systemPrompt = `You are an AI campus maintenance operations assistant for CampusFix.
Analyze the student's informal description of an issue (which may be in English, Hindi/Hinglish, or mixed notes).
Your task is to accurately extract and generate:
1. "title": A concise 4-8 word professional ticket title in English (e.g. "Monitor Display Failure with Burning Odor").
2. "category": Must be EXACTLY ONE of: ["Electrical", "IT", "Water", "Civil", "Cleaning", "Security", "Hostel"].
   - Electrical: Fans, lights, switchboards, power sockets, sparks, burning smell from appliances/monitors/switchboards, tripping MCBs, wiring.
   - IT: Lab PCs, classroom monitors (no smoke/burning), networking, Wi-Fi, classroom projectors, sound/podium audio, lab mice/keyboards.
   - Water: Plumbing, taps, water coolers, washroom flush, leakages, blocked drains.
   - Civil: Broken doors, windows, desks, chairs, classroom wall/ceiling cracks, floor tiles.
   - Cleaning: Washroom dirt, garbage, uncleaned classrooms, wet floors.
   - Security: Broken door locks, missing equipment, CCTV issues, safety hazards.
   - Hostel: Mess issues, hostel room furniture, warden facilities.
   *Note: If an electrical device or monitor has smoke, burning smell, or sparking, categorize as "Electrical" due to fire/power hazard.
3. "urgency": Must be EXACTLY ONE of: ["Low", "Medium", "High"].
   - High: Burning smell, fire hazard, smoke, electric sparks, exposed live wire, heavy water flooding, immediate hazard.
   - Medium: Broken equipment disrupting lab/class (projector down, PC not turning on, fan broken, leaking tap).
   - Low: Minor inconvenience, squeaky chair, aesthetic flaw, can wait a few days.
4. "polishedDescription": Professional technician specification formatted as:
**Issue Summary:** [Clear 1-sentence technical overview]

**Observed Symptoms:**
- [Bullet 1: Specific malfunction observed]
- [Bullet 2: Physical/operational indicators]

**Safety & Operational Impact:**
[Brief note on urgency, safety precautions taken or required, or impact on lab/class]

Return ONLY valid JSON matching this schema:
{
  "title": "...",
  "category": "...",
  "urgency": "...",
  "polishedDescription": "..."
}`;

  try {
    const rawJson = await callGroqChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: description.trim() }
    ], true);

    let parsed = {};
    try {
      parsed = JSON.parse(rawJson);
    } catch (e) {
      console.warn('JSON parse error from analyzeComplaint Groq response:', e);
    }

    // Validate category
    const validCategories = ['Electrical', 'IT', 'Water', 'Civil', 'Cleaning', 'Security', 'Hostel'];
    let category = validCategories.find(c => c.toLowerCase() === (parsed.category || '').toLowerCase());
    if (!category) category = 'IT';

    // Validate urgency
    const validUrgencies = ['Low', 'Medium', 'High'];
    let urgency = validUrgencies.find(u => u.toLowerCase() === (parsed.urgency || '').toLowerCase());
    if (!urgency) urgency = 'Medium';

    res.json({
      success: true,
      title: parsed.title || 'Campus Maintenance Issue',
      category: category,
      urgency: urgency,
      polishedDescription: parsed.polishedDescription || description.trim()
    });
  } catch (err) {
    console.error('analyzeComplaint error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze complaint: ' + err.message
    });
  }
};

module.exports = {
  polishDescription,
  evaluateQuickFix,
  analyzeComplaint
};
