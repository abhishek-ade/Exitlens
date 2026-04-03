import { useState } from "react";

const PRESET_QUESTIONS = [
  "Why are you leaving the organisation?",
  "How would you describe your relationship with your manager?",
  "Were you satisfied with your compensation and benefits?",
  "Did you feel your work environment was safe and respectful?",
  "Were you given enough growth and learning opportunities?",
  "Would you recommend this organisation to others?",
];

const SAMPLE_DATA = {
  company: "Bharat Steel Works Pvt Ltd",
  industry: "Manufacturing",
  dept: "Production",
  tenure: "3–5 years",
  responses: [
    { q: "Why are you leaving the organisation?", a: "The main reason is that I have not received any salary increment in the last 2 years despite good performance reviews. I feel my contribution is not valued financially." },
    { q: "How would you describe your relationship with your manager?", a: "My supervisor was often aggressive and used to shout at workers on the floor. When I raised it with HR, nothing happened." },
    { q: "Were you satisfied with your work environment?", a: "The factory floor has very poor ventilation and we were asked to work overtime without proper compensation — 12-hour shifts regularly without extra pay." },
    { q: "Would you recommend this organisation to others?", a: "Honestly no. There is no transparency about promotions or pay. Junior workers are not aware of their basic rights." },
  ],
};

const tagColor = {
  red:   { bg: "#fdf2f0", border: "#c84b2f", color: "#c84b2f" },
  blue:  { bg: "#f0f4fd", border: "#2f6ec8", color: "#2f6ec8" },
  amber: { bg: "#fffbeb", border: "#b87c00", color: "#b87c00" },
  green: { bg: "#f0fdf4", border: "#2f8c4e", color: "#2f8c4e" },
};
const tagCycle = ["red", "blue", "amber", "green"];

const riskStyle = {
  High:   { bg: "#f8d7da", color: "#721c24", border: "#f5c6cb" },
  Medium: { bg: "#fff3cd", color: "#856404", border: "#ffeeba" },
  Low:    { bg: "#d4edda", color: "#155724", border: "#c3e6cb" },
};

const loadingMessages = [
  "Searching for latest Indian labour law updates...",
  "Analyzing exit interview responses...",
  "Mapping concerns to applicable laws...",
  "Generating HR recommendations...",
];

export default function ExitLens() {
  const [company, setCompany]   = useState("");
  const [industry, setIndustry] = useState("");
  const [dept, setDept]         = useState("");
  const [tenure, setTenure]     = useState("");
  const [responses, setResponses] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [loadMsg, setLoadMsg]   = useState(0);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState("");
  const [webSearched, setWebSearched] = useState(false);

  const addPreset = (q) => setResponses(r => [...r, { q, a: "" }]);
  const addCustom = () => setResponses(r => [...r, { q: "", a: "" }]);
  const removeQ   = (i) => setResponses(r => r.filter((_, idx) => idx !== i));
  const updateQ   = (i, field, val) => setResponses(r => r.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const loadSample = () => {
    setCompany(SAMPLE_DATA.company); setIndustry(SAMPLE_DATA.industry);
    setDept(SAMPLE_DATA.dept); setTenure(SAMPLE_DATA.tenure);
    setResponses(SAMPLE_DATA.responses);
    setResult(null); setError(""); setWebSearched(false);
  };

  const clearAll = () => {
    setCompany(""); setIndustry(""); setDept(""); setTenure("");
    setResponses([]); setResult(null); setError(""); setWebSearched(false);
  };

  const analyze = async () => {
    const filled = responses.filter(r => r.q.trim() && r.a.trim());
    if (filled.length === 0) { setError("Please add at least one question and response."); return; }
    setError(""); setResult(null); setLoading(true); setWebSearched(false);

    // Cycle through loading messages
    let msgIdx = 0;
    setLoadMsg(0);
    const msgInterval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, loadingMessages.length - 1);
      setLoadMsg(msgIdx);
    }, 2500);

    const responsesText = filled.map((r, i) => `Q${i+1}: ${r.q}\nResponse: ${r.a}`).join("\n\n");

    const prompt = `You are an expert HR analyst and Indian Labour Law specialist with access to web search. 

IMPORTANT: First use web search to find the LATEST updates, amendments, and notifications related to Indian labour laws — especially the 4 Labour Codes (Wages, Industrial Relations, Social Security, Occupational Safety), recent Ministry of Labour notifications, and any state-level amendments. Then use that up-to-date information in your analysis.

Company Context:
- Company: ${company || "Not specified"}
- Industry: ${industry || "Not specified"}
- Department: ${dept || "Not specified"}
- Employee Tenure: ${tenure || "Not specified"}

Exit Interview Responses:
${responsesText}

After searching for latest law updates, respond ONLY with a valid JSON object. No markdown, no backticks. Exact format:
{
  "primary_reason": "One sentence on the main reason for leaving",
  "risk_level": "High or Medium or Low",
  "risk_explanation": "2 sentences on risk level",
  "themes": ["theme1","theme2","theme3"],
  "theme_types": ["red","blue","amber"],
  "laws": [
    {"name":"Full law name","code":"3-letter code","relevance":"Brief relevance including any recent amendments"}
  ],
  "recommendations": ["rec1","rec2","rec3","rec4"],
  "full_analysis": "100 word narrative on key concerns, legal risks including latest amendments, and HR interventions.",
  "law_update_note": "One sentence about the most recent relevant labour law update found via web search."
}
Keep all fields concise. Include genuinely relevant laws only.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      // Check if web search was used
      const usedSearch = (data.content || []).some(b => b.type === "tool_use" && b.name === "web_search");
      setWebSearched(usedSearch);

      const text = (data.content || [])
        .filter(b => b.type === "text")
        .map(b => b.text || "")
        .join("")
        .replace(/```json|```/g, "")
        .trim();

      const parsed = JSON.parse(text);
      setResult(parsed);
    } catch (err) {
      setError("Analysis failed: " + err.message);
    } finally {
      clearInterval(msgInterval);
      setLoading(false);
    }
  };

  const rs = riskStyle[result?.risk_level] || riskStyle.Medium;

  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh", fontFamily: "'Georgia', serif", color: "#0f0e0c" }}>

      {/* Header */}
      <div style={{ borderBottom: "2px solid #0f0e0c", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f5f0e8", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ fontSize: "1.5rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, background: "#c84b2f", borderRadius: "50%", display: "inline-block" }} />
          ExitLens
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "monospace", fontSize: "0.62rem", background: "#2f6ec8", color: "white", padding: "4px 10px", borderRadius: 2, letterSpacing: 1 }}>LIVE LAW SEARCH</span>
          <span style={{ fontFamily: "monospace", fontSize: "0.62rem", background: "#0f0e0c", color: "#f5f0e8", padding: "4px 10px", borderRadius: 2, letterSpacing: 1 }}>AI POWERED</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: "48px 32px 24px", maxWidth: 820, margin: "0 auto" }}>
        <div style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "#c84b2f", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Exit Interview Intelligence</div>
        <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.6rem)", lineHeight: 1.2, marginBottom: 12, fontStyle: "italic" }}>
          Turn exit responses into <span style={{ color: "#c84b2f" }}>actionable</span> HR insight
        </h1>
        <p style={{ color: "#7a7060", fontSize: "0.97rem", lineHeight: 1.7, maxWidth: 540, fontFamily: "sans-serif" }}>
          Analyzes exit interview responses using AI — surfacing attrition patterns, mapping concerns to the <strong>latest Indian labour laws</strong> via live web search, and generating HR recommendations.
        </p>

        {/* Live search callout */}
        <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 10, background: "#f0f4fd", border: "1.5px solid #2f6ec8", borderRadius: 6, padding: "10px 16px" }}>
          <span style={{ fontSize: "0.8rem", color: "#2f6ec8", fontFamily: "sans-serif" }}>
            🔍 <strong>New:</strong> Searches the web for the latest labour law amendments before every analysis — always up to date.
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 32px 80px" }}>
        <hr style={{ border: "none", borderTop: "1.5px solid #d4cbbe", margin: "24px 0" }} />

        {/* Company Context */}
        <div style={{ fontFamily: "monospace", fontSize: "0.66rem", color: "#7a7060", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>01 — Company Context</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          {[
            { label: "Company Name", val: company, set: setCompany, ph: "e.g. ABC Manufacturing Pvt Ltd" },
            { label: "Industry", val: industry, set: setIndustry, isSelect: true },
            { label: "Department", val: dept, set: setDept, ph: "e.g. Production, HR, Sales" },
            { label: "Years of Service", val: tenure, set: setTenure, isSelect2: true },
          ].map(({ label, val, set, ph, isSelect, isSelect2 }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, fontFamily: "sans-serif" }}>{label}</label>
              {isSelect ? (
                <select value={val} onChange={e => set(e.target.value)} style={inputStyle}>
                  <option value="">Select industry</option>
                  {["Manufacturing","IT / Software","Banking & Finance","Healthcare","Retail / FMCG","Logistics","Construction","Education","Other"].map(o => <option key={o}>{o}</option>)}
                </select>
              ) : isSelect2 ? (
                <select value={val} onChange={e => set(e.target.value)} style={inputStyle}>
                  <option value="">Select tenure</option>
                  {["Less than 1 year","1–2 years","3–5 years","5–10 years","10+ years"].map(o => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input value={val} onChange={e => set(e.target.value)} placeholder={ph} style={inputStyle} />
              )}
            </div>
          ))}
        </div>

        <hr style={{ border: "none", borderTop: "1.5px solid #d4cbbe", margin: "24px 0" }} />

        {/* Responses */}
        <div style={{ fontFamily: "monospace", fontSize: "0.66rem", color: "#7a7060", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>02 — Exit Interview Responses</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {PRESET_QUESTIONS.map(q => (
            <button key={q} onClick={() => addPreset(q)} style={{ fontSize: "0.74rem", padding: "5px 11px", border: "1.5px solid #d4cbbe", borderRadius: 3, background: "#faf7f2", cursor: "pointer", fontFamily: "sans-serif", color: "#0f0e0c" }}>
              + {q.length > 32 ? q.slice(0, 32) + "…" : q}
            </button>
          ))}
        </div>

        {responses.map((r, i) => (
          <div key={i} style={{ background: "#faf7f2", border: "1.5px solid #d4cbbe", borderRadius: 6, padding: 16, marginBottom: 12, position: "relative" }}>
            <button onClick={() => removeQ(i)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#7a7060", fontSize: "1rem" }}>✕</button>
            <div style={{ fontFamily: "monospace", fontSize: "0.63rem", color: "#2f6ec8", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Question {i + 1}</div>
            <input value={r.q} onChange={e => updateQ(i, "q", e.target.value)} placeholder="Enter interview question..." style={{ ...inputStyle, width: "100%", marginBottom: 10, fontWeight: 600 }} />
            <textarea value={r.a} onChange={e => updateQ(i, "a", e.target.value)} placeholder="Employee's response..." rows={3} style={{ ...inputStyle, width: "100%", resize: "vertical", lineHeight: 1.6 }} />
          </div>
        ))}

        <button onClick={addCustom} style={{ ...btnSecondary, marginBottom: 20 }}>+ Add Custom Question</button>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={analyze} disabled={loading} style={btnPrimary}>
            {loading ? "Analyzing…" : "Analyze with AI →"}
          </button>
          <button onClick={loadSample} style={btnSecondary}>Load Sample Data</button>
          <button onClick={clearAll} style={btnSecondary}>Clear All</button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 0", color: "#7a7060", fontFamily: "monospace", fontSize: "0.82rem" }}>
            <div style={{ width: 18, height: 18, border: "2px solid #d4cbbe", borderTopColor: "#2f6ec8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            {loadingMessages[loadMsg]}
          </div>
        )}

        {error && (
          <div style={{ background: "#fdf2f0", border: "1.5px solid #c84b2f", borderRadius: 6, padding: "12px 16px", color: "#c84b2f", fontSize: "0.88rem", marginTop: 14, fontFamily: "sans-serif" }}>
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ marginTop: 40 }}>

            {/* Web search badge */}
            {webSearched && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f0f4fd", border: "1.5px solid #2f6ec8", borderRadius: 6, padding: "8px 14px", marginBottom: 20, fontFamily: "sans-serif", fontSize: "0.8rem", color: "#2f6ec8" }}>
                🔍 Live web search used — analysis reflects latest Indian labour law updates
              </div>
            )}

            {/* Law update note */}
            {result.law_update_note && (
              <div style={{ background: "#fffbeb", border: "1.5px solid #b87c00", borderRadius: 6, padding: "10px 16px", marginBottom: 20, fontFamily: "sans-serif", fontSize: "0.82rem", color: "#856404" }}>
                <strong>Latest law update:</strong> {result.law_update_note}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, borderBottom: "2px solid #0f0e0c", paddingBottom: 20, marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: "monospace", fontSize: "0.66rem", color: "#7a7060", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Analysis Complete</div>
                <div style={{ fontSize: "1.6rem", fontStyle: "italic" }}>Exit Interview Report</div>
              </div>
              <span style={{ fontFamily: "monospace", fontSize: "0.76rem", padding: "6px 14px", borderRadius: 2, background: rs.bg, color: rs.color, border: `1.5px solid ${rs.border}`, whiteSpace: "nowrap", marginTop: 4 }}>
                RISK: {result.risk_level}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Card title="Primary Attrition Reason"><p style={valueStyle}>{result.primary_reason}</p></Card>
              <Card title="Risk Explanation"><p style={valueStyle}>{result.risk_explanation}</p></Card>

              <Card title="Key Themes Identified" full>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(result.themes || []).map((t, i) => {
                    const c = tagColor[result.theme_types?.[i] || tagCycle[i % 4]];
                    return <span key={i} style={{ fontFamily: "monospace", fontSize: "0.7rem", padding: "4px 10px", borderRadius: 2, background: c.bg, border: `1.5px solid ${c.border}`, color: c.color }}>{t}</span>;
                  })}
                </div>
              </Card>

              <Card title="Applicable Indian Labour Laws & Compliance Flags" full>
                {(result.laws || []).map((law, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < result.laws.length - 1 ? "1px solid #d4cbbe" : "none" }}>
                    <div style={{ width: 32, height: 32, background: "#0f0e0c", color: "#f5f0e8", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.58rem", fontFamily: "monospace", flexShrink: 0 }}>
                      {(law.code || "§").substring(0, 3)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 3, fontFamily: "sans-serif" }}>{law.name}</div>
                      <div style={{ fontSize: "0.82rem", color: "#7a7060", lineHeight: 1.5, fontFamily: "sans-serif" }}>{law.relevance}</div>
                    </div>
                  </div>
                ))}
              </Card>

              <Card title="HR Recommendations" full>
                {(result.recommendations || []).map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "#c84b2f", minWidth: 22, marginTop: 2 }}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ fontSize: "0.9rem", lineHeight: 1.6, fontFamily: "sans-serif" }}>{r}</span>
                  </div>
                ))}
              </Card>

              <Card title="Full AI Analysis" full>
                <p style={{ ...valueStyle, whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{result.full_analysis}</p>
              </Card>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid #d4cbbe", fontFamily: "monospace", fontSize: "0.65rem", color: "#7a7060", textAlign: "center", letterSpacing: 0.5 }}>
          Built by Abhishek Ade
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Card({ title, children, full }) {
  return (
    <div style={{ background: "#faf7f2", border: "1.5px solid #d4cbbe", borderRadius: 6, padding: 20, gridColumn: full ? "1 / -1" : undefined }}>
      <div style={{ fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: 1.5, textTransform: "uppercase", color: "#7a7060", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  background: "white", border: "1.5px solid #d4cbbe", borderRadius: 4,
  padding: "9px 13px", fontFamily: "sans-serif", fontSize: "0.9rem",
  color: "#0f0e0c", outline: "none",
};
const btnPrimary = {
  fontFamily: "sans-serif", fontSize: "0.88rem", fontWeight: 600,
  padding: "11px 22px", borderRadius: 4, border: "2px solid #0f0e0c",
  background: "#0f0e0c", color: "#f5f0e8", cursor: "pointer",
};
const btnSecondary = {
  fontFamily: "sans-serif", fontSize: "0.88rem", fontWeight: 600,
  padding: "11px 22px", borderRadius: 4, border: "2px solid #0f0e0c",
  background: "transparent", color: "#0f0e0c", cursor: "pointer",
};
const valueStyle = { fontSize: "0.92rem", lineHeight: 1.65, fontFamily: "sans-serif", color: "#0f0e0c" };
