// ============================================================
// CampusFix — Admin AI Operations Controller
// File: backend/controllers/adminAiController.js
// ============================================================

const Complaint = require('../models/Complaint');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payslip = require('../models/Payslip');
const User = require('../models/User');
const Department = require('../models/Department');
const Location = require('../models/Location');
const { generateAiContent } = require('../services/geminiService');

// ─── HELPER: Deterministic Campus Metrics Calculator ─────────
async function computeRealCampusMetrics() {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Fetch complaints
  const [complaints, depts, heads, leaves, todayAttendance] = await Promise.all([
    Complaint.find({ source: { $ne: 'upvoted' } }).lean(),
    Department.find().lean(),
    User.find({ role: 'dept_head', is_active: 1 }).lean(),
    Leave.find({ status: 'Pending' }).populate('department_id', 'name').lean(),
    Attendance.find({ date: todayStr }).populate('employee_id', 'name email role').lean()
  ]);

  // Complaints analytics
  const totalComplaints = complaints.length;
  let pendingCount = 0;
  let inProgressCount = 0;
  let resolvedCount = 0;
  let overdueCount = 0;
  let highUrgencyCount = 0;
  let totalResolutionTimeMs = 0;
  let resolvedCountForTime = 0;

  const deptCounts = {};
  const blockCounts = {};

  const now = new Date();

  complaints.forEach(c => {
    if (c.status === 'Pending') pendingCount++;
    else if (c.status === 'In Progress') inProgressCount++;
    else if (c.status === 'Resolved' || c.status === 'Closed' || c.status === 'Waiting Confirmation') {
      resolvedCount++;
      if (c.createdAt && c.updatedAt) {
        const diff = new Date(c.updatedAt) - new Date(c.createdAt);
        if (diff > 0) {
          totalResolutionTimeMs += diff;
          resolvedCountForTime++;
        }
      }
    }

    // Check overdue
    if (c.deadline && (c.status === 'Pending' || c.status === 'In Progress')) {
      const dDate = new Date(c.deadline);
      if (dDate < now) overdueCount++;
    }

    if (c.urgency === 'High') highUrgencyCount++;

    const cat = c.category || 'General';
    deptCounts[cat] = (deptCounts[cat] || 0) + 1;

    let block = 'Unknown';
    if (c.location_desc) {
      block = c.location_desc.split(',')[0].trim();
    }
    blockCounts[block] = (blockCounts[block] || 0) + 1;
  });

  const avgResolutionHours = resolvedCountForTime > 0
    ? Math.round(totalResolutionTimeMs / (resolvedCountForTime * 1000 * 3600))
    : 0;

  // Department Heads Attendance Analytics
  const totalHeads = heads.length;
  const headIds = new Set(heads.map(h => String(h._id)));
  const headTodayAtt = todayAttendance.filter(a => headIds.has(String(a.employee_id?._id || a.employee_id)));

  const presentHeads = headTodayAtt.filter(a => a.clock_in).length;
  const lateHeads = headTodayAtt.filter(a => a.status === 'Late' || a.status === 'Late_1' || a.status === 'Late_2').length;
  const absentHeads = Math.max(0, totalHeads - presentHeads);

  // Pending leaves
  const headLeavesPending = leaves.filter(l => {
    return l.employee_id && headIds.has(String(l.employee_id._id || l.employee_id));
  });

  return {
    timestamp: new Date().toISOString(),
    complaints: {
      total: totalComplaints,
      pending: pendingCount,
      inProgress: inProgressCount,
      resolved: resolvedCount,
      overdue: overdueCount,
      highUrgency: highUrgencyCount,
      avgResolutionHours,
      byDepartment: deptCounts,
      byBlock: blockCounts
    },
    attendance: {
      totalHeads,
      presentHeads,
      lateHeads,
      absentHeads,
      onTimeRate: totalHeads > 0 ? Math.round(((presentHeads - lateHeads) / totalHeads) * 100) : 100
    },
    workforce: {
      pendingLeavesCount: leaves.length,
      headPendingLeavesCount: headLeavesPending.length
    }
  };
}

// ─── MODULE 1: AI Executive Summary & Daily Brief ────────────
// @route   POST /api/ai/admin/daily-brief
// @access  Admin only
const generateDailyBrief = async (req, res) => {
  try {
    const metrics = await computeRealCampusMetrics();

    const prompt = `You are the AI Executive Operations Advisor for CampusFix at Chitkara University.
Analyze these real, verified campus metrics and generate a structured, executive 30-second operational briefing for the Super Administrator.

Real Campus Metrics Data:
- Total Complaints: ${metrics.complaints.total} (Pending: ${metrics.complaints.pending}, In Progress: ${metrics.complaints.inProgress}, Resolved: ${metrics.complaints.resolved}, Overdue: ${metrics.complaints.overdue}, High Urgency: ${metrics.complaints.highUrgency})
- Average Complaint Resolution Time: ${metrics.complaints.avgResolutionHours} hours
- Top Complaint Departments: ${JSON.stringify(metrics.complaints.byDepartment)}
- Top Location Hotspots: ${JSON.stringify(metrics.complaints.byBlock)}
- Department Head Staffing Today: ${metrics.attendance.presentHeads}/${metrics.attendance.totalHeads} present (${metrics.attendance.lateHeads} late, ${metrics.attendance.absentHeads} absent, On-time rate: ${metrics.attendance.onTimeRate}%)
- Pending Leave Requests: ${metrics.workforce.pendingLeavesCount} total (${metrics.workforce.headPendingLeavesCount} from Department Heads)

Return ONLY a valid JSON object matching this exact schema:
{
  "headline": "A sharp, 1-sentence executive overview of campus operational status",
  "criticalAlerts": [
    "Specific alert 1 based on real numbers (e.g. overdue tickets, high urgency issues)",
    "Specific alert 2 based on staffing or hotspots"
  ],
  "departmentHighlights": [
    "Department performance highlight 1",
    "Department performance highlight 2"
  ],
  "staffingSummary": "1-2 sentences summarizing head attendance punctuality and pending leave approvals",
  "recommendedActions": [
    "Direct actionable administrative step 1",
    "Direct actionable administrative step 2",
    "Direct actionable administrative step 3"
  ]
}`;

    let aiResult = null;
    try {
      const rawText = await generateAiContent(prompt, {
        jsonFormat: true,
        systemInstruction: 'You are an executive campus intelligence assistant. Always use exact verified metrics and output strict JSON.'
      });
      aiResult = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (aiErr) {
      console.warn('AI brief generation fallback triggered:', aiErr.message);
      // Deterministic rule-based fallback ensuring zero downtime
      aiResult = {
        headline: `Campus status: ${metrics.complaints.pending} pending issues and ${metrics.attendance.presentHeads}/${metrics.attendance.totalHeads} Department Heads currently on campus.`,
        criticalAlerts: [
          metrics.complaints.overdue > 0 ? `${metrics.complaints.overdue} tickets are currently overdue past their SLA deadline.` : 'All active maintenance tickets are within scheduled deadlines.',
          metrics.complaints.highUrgency > 0 ? `${metrics.complaints.highUrgency} complaints are tagged with High Urgency requiring priority dispatch.` : 'No critical life-safety hazards reported.'
        ],
        departmentHighlights: Object.entries(metrics.complaints.byDepartment).map(([dept, count]) => `${dept}: ${count} total tickets logged.`),
        staffingSummary: `${metrics.attendance.presentHeads} of ${metrics.attendance.totalHeads} Department Heads clocked in today (${metrics.attendance.onTimeRate}% on-time). ${metrics.workforce.headPendingLeavesCount} leadership leave request(s) await review.`,
        recommendedActions: [
          metrics.complaints.overdue > 0 ? 'Follow up with department heads on overdue tickets.' : 'Review ongoing resolution progress across departments.',
          metrics.workforce.headPendingLeavesCount > 0 ? 'Review and approve/reject pending Department Head leave requests.' : 'Maintain standard campus monitoring.',
          'Verify geofence attendance logs for field compliance.'
        ]
      };
    }

    res.json({
      success: true,
      metrics,
      brief: aiResult,
      generatedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
  } catch (err) {
    console.error('generateDailyBrief error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate AI brief: ' + err.message });
  }
};

// ─── MODULE 1: Ask CampusFix AI Copilot ───────────────────────
// @route   POST /api/ai/admin/copilot-query
// @access  Admin only
const askCopilot = async (req, res) => {
  const question = req.body.question || req.body.query || req.body.prompt;
  if (!question || question.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Please provide a question.' });
  }

  try {
    const q = question.toLowerCase().trim();
    const metrics = await computeRealCampusMetrics();
    const todayStr = new Date().toISOString().split('T')[0];

    let queryType = 'general';
    let deterministicAnswer = '';
    let supportingData = {};

    // 1. Overdue complaints
    if (q.includes('overdue')) {
      queryType = 'overdue';
      const overdueList = await Complaint.find({
        status: { $in: ['Pending', 'In Progress'] },
        deadline: { $exists: true, $ne: '' }
      }).lean();

      const overdueFiltered = overdueList.filter(c => new Date(c.deadline) < new Date());
      const byDept = {};
      overdueFiltered.forEach(c => {
        byDept[c.category || 'General'] = (byDept[c.category || 'General'] || 0) + 1;
      });

      let topDept = 'None';
      let topCount = 0;
      Object.entries(byDept).forEach(([dept, count]) => {
        if (count > topCount) { topCount = count; topDept = dept; }
      });

      deterministicAnswer = overdueFiltered.length > 0
        ? `There are currently ${overdueFiltered.length} overdue complaints across campus. The department with the highest overdue count is ${topDept} with ${topCount} ticket(s).`
        : `There are currently no overdue complaints across any campus department.`;

      supportingData = {
        totalOverdue: overdueFiltered.length,
        breakdownByDepartment: byDept,
        tickets: overdueFiltered.map(c => ({ id: c._id, title: c.title, dept: c.category, deadline: c.deadline }))
      };
    }
    // 2. Late Department Heads / Attendance
    else if (q.includes('late') || q.includes('attendance') || q.includes('clock')) {
      queryType = 'attendance';
      const heads = await User.find({ role: 'dept_head', is_active: 1 }).select('name email department_id').lean();
      const headIds = heads.map(h => h._id);
      const atts = await Attendance.find({ date: todayStr, employee_id: { $in: headIds } }).populate('employee_id', 'name email').lean();

      const lateList = atts.filter(a => a.status === 'Late' || a.status === 'Late_1' || a.status === 'Late_2');
      const presentCount = atts.filter(a => a.clock_in).length;

      deterministicAnswer = `${lateList.length} Department Head(s) arrived late today out of ${presentCount} clocked in (Total active heads: ${heads.length}).`;
      supportingData = {
        totalHeads: heads.length,
        presentToday: presentCount,
        lateToday: lateList.length,
        lateHeads: lateList.map(a => ({
          name: a.employee_id?.name || 'Dept Head',
          clockIn: a.clock_in || 'N/A',
          status: a.status
        }))
      };
    }
    // 3. Hotspot blocks / locations
    else if (q.includes('block') || q.includes('location') || q.includes('hotspot')) {
      queryType = 'hotspots';
      const complaints = await Complaint.find({ source: { $ne: 'upvoted' } }).lean();
      const blockCounts = {};
      complaints.forEach(c => {
        const b = (c.location_desc || '').split(',')[0].trim() || 'Unknown';
        blockCounts[b] = (blockCounts[b] || 0) + 1;
      });

      const sorted = Object.entries(blockCounts).sort((a, b) => b[1] - a[1]);
      const topBlock = sorted[0] ? sorted[0][0] : 'None';
      const topCount = sorted[0] ? sorted[0][1] : 0;

      deterministicAnswer = `The campus block with the highest number of reported issues is ${topBlock} with ${topCount} complaints.`;
      supportingData = {
        topBlock,
        topCount,
        allBlocks: Object.fromEntries(sorted)
      };
    }
    // 4. Resolution time
    else if (q.includes('resolution') || q.includes('time') || q.includes('hours') || q.includes('average')) {
      queryType = 'resolution';
      deterministicAnswer = `The average complaint resolution time across all campus departments is approximately ${metrics.complaints.avgResolutionHours} hours (based on ${metrics.complaints.resolved} resolved tickets).`;
      supportingData = {
        avgResolutionHours: metrics.complaints.avgResolutionHours,
        totalResolved: metrics.complaints.resolved
      };
    }
    // 5. Pending leaves
    else if (q.includes('leave') || q.includes('vacation')) {
      queryType = 'leaves';
      const pendingLeaves = await Leave.find({ status: 'Pending' })
        .populate('employee_id', 'name email role')
        .populate('department_id', 'name')
        .lean();

      const headLeaves = pendingLeaves.filter(l => l.employee_id?.role === 'dept_head');

      deterministicAnswer = `There are ${pendingLeaves.length} total pending leave requests across campus, of which ${headLeaves.length} require your direct review as Super Admin (from Department Heads).`;
      supportingData = {
        totalPending: pendingLeaves.length,
        headPending: headLeaves.length,
        leaves: pendingLeaves.map(l => ({
          applicant: l.employee_name || l.employee_id?.name,
          role: l.employee_id?.role,
          dept: l.department_id?.name,
          type: l.leave_type,
          dates: `${l.from_date} to ${l.to_date}`
        }))
      };
    }
    // 6. General campus statistics
    else {
      queryType = 'general_summary';
      deterministicAnswer = `Campus Operations Summary: ${metrics.complaints.total} total tickets (${metrics.complaints.pending} pending, ${metrics.complaints.inProgress} in progress, ${metrics.complaints.resolved} resolved). ${metrics.attendance.presentHeads}/${metrics.attendance.totalHeads} Department Heads clocked in today with ${metrics.workforce.pendingLeavesCount} leave applications awaiting decision.`;
      supportingData = metrics;
    }

    // Enhance response with Gemini AI natural synthesis
    let finalExplanation = deterministicAnswer;
    try {
      const prompt = `You are the CampusFix AI Data Copilot for Chitkara University administration.
The user asked: "${question}"

Here is the exact, verified data from the MongoDB database:
${deterministicAnswer}
Supporting Context: ${JSON.stringify(supportingData)}

Provide a direct, polished, executive response that:
1. Answers the user's question clearly in 1-2 paragraphs.
2. Cites the exact numbers and departments provided above.
3. Suggests a helpful administrative insight or next step.
Do not fabricate numbers or speculate outside the verified data.`;

      const aiText = await generateAiContent(prompt, { maxTokens: 400 });
      if (aiText && aiText.trim().length > 10) {
        finalExplanation = aiText.trim();
      }
    } catch (e) {
      // Deterministic answer already set
    }

    res.json({
      success: true,
      question,
      queryType,
      answer: finalExplanation,
      supportingData,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    });
  } catch (err) {
    console.error('askCopilot error:', err);
    res.status(500).json({ success: false, message: 'Failed to process copilot query: ' + err.message });
  }
};

// ─── MODULE 2: AI SAFETY TRIAGE & HAZARD AUDIT ───────────────
// @route   GET /api/ai/admin/triage-audit
// @access  Admin only
const auditComplaintTriage = async (req, res) => {
  try {
    const complaints = await Complaint.find({
      status: { $in: ['Pending', 'In Progress', 'Reopened'] }
    })
      .populate('location_id')
      .sort({ createdAt: -1 })
      .lean();

    const HAZARD_PATTERNS = [
      { type: 'Electrical Hazard', rx: /\b(spark|sparks|sparking|shock|short circuit|live wire|burning smell|smoke|tripping mcb|burst|fuse blow)\b/i, dept: 'Electrical' },
      { type: 'Fire / Smoke Danger', rx: /\b(fire|flame|smoke|burning|smell of burning)\b/i, dept: 'Security' },
      { type: 'Water Leak near Power', rx: /\b(leak near|water dripping on|flooding near socket|water panel)\b/i, dept: 'Electrical' },
      { type: 'Structural Hazard', rx: /\b(ceiling crack|falling plaster|slab broken|glass shattered|window falling)\b/i, dept: 'Civil & Infrastructure' },
      { type: 'Elevator Trapped / Jammed', rx: /\b(elevator trapped|lift stuck|elevator drop|lift jammed)\b/i, dept: 'Electrical' }
    ];

    const audited = complaints.map(c => {
      const text = `${c.title} ${c.description || ''}`.toLowerCase();
      let matchedHazard = null;

      for (const h of HAZARD_PATTERNS) {
        if (h.rx.test(text)) {
          matchedHazard = h;
          break;
        }
      }

      const isSafetyHazard = Boolean(matchedHazard);
      let aiSeverity = 'Low';
      if (isSafetyHazard) {
        aiSeverity = 'Critical';
      } else if (c.urgency === 'High') {
        aiSeverity = 'High';
      } else if (c.urgency === 'Medium') {
        aiSeverity = 'Medium';
      }

      // Check if student under-reported urgency
      const isUnderReported = isSafetyHazard && c.urgency !== 'High';

      return {
        id: c._id,
        title: c.title,
        location: c.location_desc || 'Campus',
        currentCategory: c.category,
        currentUrgency: c.urgency || 'Medium',
        aiSeverity,
        isSafetyHazard,
        hazardType: matchedHazard ? matchedHazard.type : null,
        recommendedDept: matchedHazard ? matchedHazard.dept : c.category,
        requiresEscalation: isUnderReported,
        reason: isUnderReported
          ? `Contains safety hazard indicators (${matchedHazard.type}). Recommended immediate escalation from ${c.urgency} to High.`
          : isSafetyHazard
            ? `Critical safety flag detected (${matchedHazard.type}).`
            : `Classified as ${aiSeverity} priority.`
      };
    });

    const hazardCount = audited.filter(a => a.isSafetyHazard).length;
    const escalationCount = audited.filter(a => a.requiresEscalation).length;

    res.json({
      success: true,
      totalAudited: audited.length,
      hazardCount,
      escalationCount,
      items: audited
    });
  } catch (err) {
    console.error('auditComplaintTriage error:', err);
    res.status(500).json({ success: false, message: 'Failed to run triage audit: ' + err.message });
  }
};

// @route   POST /api/ai/admin/escalate-complaint
// @access  Admin only
const escalateComplaint = async (req, res) => {
  const { complaintId, reason } = req.body;
  if (!complaintId) {
    return res.status(400).json({ success: false, message: 'Complaint ID is required' });
  }

  try {
    const comp = await Complaint.findById(complaintId);
    if (!comp) return res.status(404).json({ success: false, message: 'Complaint not found' });

    comp.urgency = 'High';
    comp.description += `\n\n[ADMIN AI ESCALATION]: Upgraded to High Priority on ${new Date().toISOString().split('T')[0]}. Reason: ${reason || 'Identified safety hazard.'}`;
    await comp.save();

    res.json({
      success: true,
      message: 'Complaint priority escalated to High successfully.',
      complaint: comp
    });
  } catch (err) {
    console.error('escalateComplaint error:', err);
    res.status(500).json({ success: false, message: 'Escalation failed: ' + err.message });
  }
};

// ─── MODULE 2: CAMPUS INFRASTRUCTURE RISK & PREDICTIVE MAINTENANCE
// @route   GET /api/ai/admin/infrastructure-risks
// @access  Admin only
const getInfrastructureRisks = async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 }).lean();

    // Group complaints by Block & Category
    const groupKey = {};
    complaints.forEach(c => {
      const block = (c.location_desc || '').split(',')[0].trim() || 'Unknown Block';
      const cat = c.category || 'General';
      const key = `${block}::${cat}`;

      if (!groupKey[key]) {
        groupKey[key] = {
          block,
          category: cat,
          incidents: [],
          highUrgencyCount: 0
        };
      }
      groupKey[key].incidents.push(c);
      if (c.urgency === 'High') groupKey[key].highUrgencyCount++;
    });

    const riskClusters = Object.values(groupKey).map(g => {
      const count = g.incidents.length;
      let riskLevel = 'Low';
      let estimatedRiskPct = 25;
      let recommendedAction = 'Routine observational maintenance.';

      if (count >= 3 || g.highUrgencyCount >= 2) {
        riskLevel = 'High';
        estimatedRiskPct = Math.min(92, 60 + count * 8);
        recommendedAction = `Schedule full preventive overhaul of ${g.category.toLowerCase()} infrastructure in ${g.block}. High recurrence rate detected.`;
      } else if (count >= 2) {
        riskLevel = 'Medium';
        estimatedRiskPct = Math.min(65, 40 + count * 10);
        recommendedAction = `Conduct targeted inspection of ${g.category.toLowerCase()} fixtures in ${g.block} to prevent service disruption.`;
      }

      return {
        block: g.block,
        category: g.category,
        incidentCount: count,
        highUrgencyCount: g.highUrgencyCount,
        riskLevel,
        estimatedRiskPct,
        recommendedAction,
        isEstimate: true,
        evidence: g.incidents.slice(0, 4).map(i => ({
          title: i.title,
          date: i.createdAt ? new Date(i.createdAt).toISOString().split('T')[0] : 'Past record',
          status: i.status
        }))
      };
    });

    // Filter to medium and high risks, sorted descending
    const prioritizedRisks = riskClusters
      .filter(r => r.incidentCount >= 2)
      .sort((a, b) => b.estimatedRiskPct - a.estimatedRiskPct);

    res.json({
      success: true,
      totalClustersAnalyzed: Object.keys(groupKey).length,
      highRiskCount: prioritizedRisks.filter(r => r.riskLevel === 'High').length,
      disclaimer: 'Risk indicators are empirical estimates derived from historical ticket clusters and recurrence patterns. They do not constitute guaranteed mechanical failures.',
      risks: prioritizedRisks
    });
  } catch (err) {
    console.error('getInfrastructureRisks error:', err);
    res.status(500).json({ success: false, message: 'Failed to compute infrastructure risks: ' + err.message });
  }
};

// ─── MODULE 3: INTELLIGENT LEAVE ADVISOR ─────────────────────
// @route   POST /api/ai/admin/leave-advisor
// @access  Admin only
const evaluateLeaveStaffing = async (req, res) => {
  const { leaveId } = req.body;
  if (!leaveId) {
    return res.status(400).json({ success: false, message: 'Leave ID is required' });
  }

  try {
    const leave = await Leave.findById(leaveId)
      .populate('employee_id', 'name email role department_id')
      .populate('department_id', 'name category_tag')
      .lean();

    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });

    const deptId = leave.department_id?._id || leave.department_id;
    const deptTag = leave.department_id?.category_tag || '';
    const deptName = leave.department_id?.name || 'Department';

    // 1. Count active open tickets in this department
    const openTickets = await Complaint.countDocuments({
      category: { $regex: new RegExp(deptName.split(' ')[0], 'i') },
      status: { $in: ['Pending', 'In Progress'] }
    });

    // 2. Count active staff members in this department
    const staffMembers = await User.countDocuments({
      department_id: deptId,
      is_active: 1
    });

    // 3. Check overlapping approved leaves in department during same period
    const overlappingLeaves = await Leave.find({
      department_id: deptId,
      status: 'Approved',
      _id: { $ne: leave._id },
      $or: [
        { from_date: { $lte: leave.to_date, $gte: leave.from_date } },
        { to_date: { $gte: leave.from_date, $lte: leave.to_date } }
      ]
    }).lean();

    // Determine Risk Level deterministically
    let riskLevel = 'Low';
    let reasons = [];

    if (openTickets >= 8) {
      riskLevel = 'High';
      reasons.push(`${deptName} currently has ${openTickets} active unresolved tickets.`);
    } else if (openTickets >= 3) {
      if (riskLevel !== 'High') riskLevel = 'Medium';
      reasons.push(`${deptName} has ${openTickets} open tickets currently being processed.`);
    }

    if (overlappingLeaves.length >= 2) {
      riskLevel = 'High';
      reasons.push(`${overlappingLeaves.length} other staff members are already on approved leave during this time frame.`);
    } else if (overlappingLeaves.length === 1) {
      if (riskLevel !== 'High') riskLevel = 'Medium';
      reasons.push(`1 other colleague is scheduled on leave during these dates.`);
    }

    if (leave.employee_id?.role === 'dept_head') {
      reasons.push(`Applicant is Department Head. Department leadership must be delegated during absence.`);
    }

    if (reasons.length === 0) {
      reasons.push(`Staff capacity is sufficient (${staffMembers} active members) with low pending workload (${openTickets} tickets).`);
    }

    const recommendation = riskLevel === 'High'
      ? `High operational impact. Suggest coordinating backup leadership or approving with temporary ticket delegation.`
      : riskLevel === 'Medium'
        ? `Moderate workload. Approval recommended provided ongoing tasks are assigned.`
        : `Safe to approve. Minimal disruption to campus operations expected.`;

    res.json({
      success: true,
      leaveId,
      applicant: leave.employee_name || leave.employee_id?.name,
      department: deptName,
      dates: `${leave.from_date} → ${leave.to_date}`,
      riskLevel,
      openTickets,
      totalStaff: staffMembers,
      overlappingLeavesCount: overlappingLeaves.length,
      reasons,
      recommendation
    });
  } catch (err) {
    console.error('evaluateLeaveStaffing error:', err);
    res.status(500).json({ success: false, message: 'Failed to analyze leave staffing risk: ' + err.message });
  }
};

// ─── MODULE 3: ATTENDANCE ANOMALY AUDITOR ────────────────────
// @route   GET /api/ai/admin/attendance-audit
// @access  Admin only
const auditAttendanceAnomalies = async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate('employee_id', 'name email role department_id')
      .populate('department_id', 'name')
      .sort({ date: -1 })
      .limit(60)
      .lean();

    const CAMPUS_LAT = 30.5094;
    const CAMPUS_LNG = 76.6566;
    const MAX_GEOFENCE_METERS = 500;

    // Haversine formula
    function getDistance(lat1, lon1, lat2, lon2) {
      const R = 6371e3;
      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const dPhi = ((lat2 - lat1) * Math.PI) / 180;
      const dLam = ((lon2 - lon1) * Math.PI) / 180;
      const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
      return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }

    const anomalies = [];

    records.forEach(r => {
      const name = r.employee_id?.name || 'Staff Member';
      const role = r.employee_id?.role || 'Staff';
      const dept = r.department_id?.name || 'Campus';

      // 1. Geofence violation
      if (r.clock_in_lat && r.clock_in_lng) {
        const dist = getDistance(CAMPUS_LAT, CAMPUS_LNG, r.clock_in_lat, r.clock_in_lng);
        if (dist > MAX_GEOFENCE_METERS) {
          anomalies.push({
            id: r._id,
            name,
            role,
            dept,
            date: r.date,
            anomalyType: 'Geofence Boundary Alert',
            severity: 'High',
            details: `Punch recorded ${dist}m away from campus perimeter (Threshold: ${MAX_GEOFENCE_METERS}m). Recorded coordinates: ${r.clock_in_lat.toFixed(4)}, ${r.clock_in_lng.toFixed(4)}.`
          });
        }
      }

      // 2. Unusually short shift
      if (r.clock_in && r.clock_out && r.working_hours !== undefined) {
        const hrs = Number(r.working_hours);
        if (hrs > 0 && hrs < 3.5 && r.day_type !== 'Half Day') {
          anomalies.push({
            id: r._id,
            name,
            role,
            dept,
            date: r.date,
            anomalyType: 'Abnormal Shift Duration',
            severity: 'Medium',
            details: `Completed shift recorded only ${hrs.toFixed(1)} hours (Regular shift requirement: 8 hours). Clock in: ${r.clock_in}, Clock out: ${r.clock_out}.`
          });
        }
      }

      // 3. Repeated off-campus departure
      if (r.off_campus_count && r.off_campus_count >= 2) {
        anomalies.push({
          id: r._id,
          name,
          role,
          dept,
          date: r.date,
          anomalyType: 'Mid-Shift Campus Absence',
          severity: 'Medium',
          details: `Detected off-campus ${r.off_campus_count} times during active shift (Logged timestamps: ${r.off_campus_times || 'N/A'}).`
        });
      }
    });

    res.json({
      success: true,
      totalScanned: records.length,
      anomalyCount: anomalies.length,
      anomalies
    });
  } catch (err) {
    console.error('auditAttendanceAnomalies error:', err);
    res.status(500).json({ success: false, message: 'Failed to audit attendance: ' + err.message });
  }
};

// ─── MODULE 3: PAYROLL ANOMALY AUDITOR ───────────────────────
// @route   GET /api/ai/admin/payroll-audit
// @access  Admin only
const auditPayrollAnomalies = async (req, res) => {
  try {
    const slips = await Payslip.find()
      .populate('employee_id', 'name email role')
      .populate('department_id', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const seenCombos = new Set();
    const anomalies = [];

    let totalQuarterDisbursed = 0;

    slips.forEach(s => {
      const name = s.employee_name || s.employee_id?.name || 'Employee';
      const month = s.month;
      const year = s.year;
      const basic = Number(s.basic_salary) || 0;
      const allowances = Number(s.allowances) || 0;
      const deductions = Number(s.deductions) || 0;
      const net = Number(s.net_salary) || 0;

      totalQuarterDisbursed += net;

      // 1. Check duplicate payroll voucher
      const combo = `${s.employee_id?._id || s.employee_id}-${month}-${year}`;
      if (seenCombos.has(combo)) {
        anomalies.push({
          id: s._id,
          name,
          period: `${month}/${year}`,
          type: 'Duplicate Payslip Entry',
          severity: 'High',
          explanation: `Multiple salary payslips exist for ${name} for pay period ${month}/${year}. Human review required prior to disbursement.`
        });
      } else {
        seenCombos.add(combo);
      }

      // 2. Allowances exceeding 80% of basic
      if (basic > 0 && allowances > basic * 0.8) {
        anomalies.push({
          id: s._id,
          name,
          period: `${month}/${year}`,
          type: 'Excessive Allowance Surge',
          severity: 'Medium',
          explanation: `Allowances of ₹${allowances.toLocaleString()} exceed 80% of basic salary (₹${basic.toLocaleString()}). Requires supervisor authorization.`
        });
      }

      // 3. Deductions higher than basic
      if (deductions > basic && basic > 0) {
        anomalies.push({
          id: s._id,
          name,
          period: `${month}/${year}`,
          type: 'Negative Net Salary Discrepancy',
          severity: 'High',
          explanation: `Deductions (₹${deductions.toLocaleString()}) exceed basic salary (₹${basic.toLocaleString()}), resulting in abnormal net compensation.`
        });
      }

      // 4. Zero or negative basic salary
      if (basic <= 0) {
        anomalies.push({
          id: s._id,
          name,
          period: `${month}/${year}`,
          type: 'Missing Salary Structure',
          severity: 'High',
          explanation: `Payslip record has non-positive basic salary: ₹${basic}.`
        });
      }
    });

    res.json({
      success: true,
      totalVouchersAudited: slips.length,
      anomalyCount: anomalies.length,
      projectedQuarterExpenditure: totalQuarterDisbursed,
      anomalies
    });
  } catch (err) {
    console.error('auditPayrollAnomalies error:', err);
    res.status(500).json({ success: false, message: 'Failed to audit payroll: ' + err.message });
  }
};

module.exports = {
  generateDailyBrief,
  askCopilot,
  computeRealCampusMetrics,
  auditComplaintTriage,
  escalateComplaint,
  getInfrastructureRisks,
  evaluateLeaveStaffing,
  auditAttendanceAnomalies,
  auditPayrollAnomalies
};

