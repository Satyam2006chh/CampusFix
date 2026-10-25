

document.addEventListener('DOMContentLoaded', () => {
  if (currentUser.role !== 'student') {
    window.location.href = 'login.html';
    return;
  }
  loadLocations();
  loadStats();
  loadComplaints();
});

async function loadLocations() {
  try {
    const locations = await apiFetch('/locations');
    const select = document.getElementById('cLocation');
    select.innerHTML = '<option value="" disabled selected>Select specific location</option>';
    locations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.id;
      opt.textContent = `${loc.campus} — ${loc.block}, ${loc.floor} (${loc.room_area})`;
      select.appendChild(opt);
    });
  } catch (err) { console.error('Failed to load locations', err); }
}


async function loadStats() {
  try {
    const complaints = await apiFetch('/complaints');
    const myComplaints = complaints.filter(c => String(c.user_id) === String(currentUser.id));
    
    let pending = 0, in_progress = 0, resolved = 0;
    myComplaints.forEach(c => {
      if (c.status === 'Pending') pending++;
      else if (c.status === 'In Progress') in_progress++;
      else if (c.status === 'Resolved' || c.status === 'Waiting Confirmation' || c.status === 'Closed') resolved++;
    });

    document.getElementById('statTotal').textContent      = myComplaints.length;
    document.getElementById('statPending').textContent    = pending;
    document.getElementById('statInProgress').textContent = in_progress;
    document.getElementById('statResolved').textContent   = resolved;
  } catch (err) { console.error('Failed to load stats', err); }
}


let myComplaints = [];

async function loadComplaints() {
  try {
    const allComplaints = await apiFetch('/complaints');
    const myRawComplaints = allComplaints.filter(c => String(c.user_id) === String(currentUser.id));
    
    myComplaints = myRawComplaints.map(c => {
      if (c.source === 'upvoted' && c.original_complaint_id) {
        const orig = allComplaints.find(oc => String(oc.id) === String(c.original_complaint_id));
        if (orig) {
          return { ...orig, _is_upvoted_copy: true, created_at: c.created_at };
        }
      }
      return c;
    });

    myComplaints.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    renderRecentComplaints();
    renderAllComplaints();
  } catch (err) { console.error('Failed to load complaints', err); }
}

function renderRecentComplaints() {
  const tbody = document.getElementById('recentComplaintsBody');
  tbody.innerHTML = '';
  const recent = myComplaints.slice(0, 5);
  if (recent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No complaints reported yet.</td></tr>';
    return;
  }
  recent.forEach(c => {
    tbody.innerHTML += `
      <tr>
        <td>#CF-${c.id}</td>
        <td style="font-weight:500;color:var(--text-primary);">${c.title}</td>
        <td>${c.category}</td>
        <td>${getStatusBadge(c.status)}</td>
        <td>${formatDate(c.created_at)}</td>
      </tr>`;
  });
}

function renderAllComplaints() {
  const tbody = document.getElementById('allComplaintsBody');
  tbody.innerHTML = '';

  if (myComplaints.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px;">
        No complaints reported yet.
      </td></tr>`;
    return;
  }

  myComplaints.forEach(c => {
    const isUpvoted = c._is_upvoted_copy || c.source === 'upvoted';

    let actionHtml = '<span style="color:var(--text-muted);font-size:0.8rem;">—</span>';
    if (!isUpvoted && c.status === 'Waiting Confirmation') {
      actionHtml = `<button class="action-btn" onclick="openConfirmModal('${c.id}')">Verify Fix</button>`;
    }

    const upvoteBadge = c.upvote_count > 0
      ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:0.72rem;
           background:var(--accent-light);color:var(--accent);
           padding:2px 7px;border-radius:20px;margin-left:6px;font-weight:600;">
           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
             <polyline points="18 15 12 9 6 15"/>
           </svg>${c.upvote_count} upvote${c.upvote_count !== 1 ? 's' : ''}</span>`
      : '';

    const sourceTag = isUpvoted
      ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:0.68rem;
           background:var(--warning-bg);color:var(--warning);
           padding:2px 7px;border-radius:20px;margin-left:6px;font-weight:600;">Upvoted</span>`
      : '';

    const assignedInfo = c.assigned_to_name
      ? `<small style="display:flex;align-items:center;gap:4px;margin-top:3px;">
           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
           </svg>
           Assigned to: ${c.assigned_to_name}
         </small>`
      : '';

    const locText = c.location_desc || `Location ID: ${c.location_id}`;

    tbody.innerHTML += `
      <tr ${isUpvoted ? 'style="background:rgba(245,158,11,0.03);"' : ''}>
        <td>#CF-${c.id}</td>
        <td>
          <strong>${c.title}</strong>${sourceTag}${upvoteBadge}
          <small>${locText}</small>
          ${assignedInfo}
        </td>
        <td>${c.category}</td>
        <td>${getStatusBadge(c.status)}</td>
        <td>${formatDate(c.created_at)}</td>
        <td>${actionHtml}</td>
      </tr>`;
  });
}


let currentDuplicateId = null;
let rawOriginalDescription = '';
let pendingComplaintData = null;

// ─── AI FEATURE 1: POLISH & STRUCTURE (Groq Powered) ─────────
async function polishComplaintDescription() {
  const descEl = document.getElementById('cDesc');
  const btn = document.getElementById('btnPolishAi');
  const btnText = document.getElementById('btnPolishText');
  const undoContainer = document.getElementById('aiUndoContainer');
  const errorEl = document.getElementById('cError');

  const text = descEl.value.trim();
  if (text.length < 3) {
    errorEl.textContent = 'Please write a brief description or rough notes first before polishing.';
    errorEl.classList.remove('hidden');
    descEl.focus();
    return;
  }
  errorEl.classList.add('hidden');

  rawOriginalDescription = descEl.value;
  btn.disabled = true;
  btnText.textContent = 'Polishing with AI...';

  const title = document.getElementById('cTitle').value.trim();
  const category = document.getElementById('cCategory').value;
  const locSelect = document.getElementById('cLocation');
  const locationText = locSelect.options[locSelect.selectedIndex]?.text || '';

  try {
    const res = await fetch('http://localhost:5000/api/ai/polish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: text,
        category,
        location: locationText
      })
    });

    const data = await res.json();
    if (res.ok && data.success && data.polishedText) {
      descEl.value = data.polishedText;
      btnText.textContent = '✓ Polished!';
      
      undoContainer.innerHTML = `<a href="javascript:void(0)" class="ai-undo-link" onclick="undoAiPolish()">(↺ Revert to raw notes)</a>`;

      setTimeout(() => {
        btnText.textContent = 'AI Polish & Structure';
        btn.disabled = false;
      }, 2500);
    } else {
      errorEl.textContent = data.message || 'Failed to polish description.';
      errorEl.classList.remove('hidden');
      btnText.textContent = 'AI Polish & Structure';
      btn.disabled = false;
    }
  } catch (err) {
    errorEl.textContent = 'AI service temporarily unavailable. You can still submit your manual description.';
    errorEl.classList.remove('hidden');
    btnText.textContent = 'AI Polish & Structure';
    btn.disabled = false;
  }
}

function undoAiPolish() {
  if (rawOriginalDescription) {
    document.getElementById('cDesc').value = rawOriginalDescription;
    document.getElementById('aiUndoContainer').innerHTML = '';
  }
}

// ─── AI FEATURE 2: SMART QUICK-FIX ASSISTANT ──────────────────
async function submitComplaint(e) {
  e.preventDefault();
  const btn       = document.getElementById('cSubmitBtn');
  const errorEl   = document.getElementById('cError');
  const successEl = document.getElementById('cSuccess');

  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');
  clearAllErrors(document.getElementById('complaintForm'));

  let ok = true;
  ok = validateRequired('cTitle',    'Complaint title') && ok;
  ok = validateSelect('cCategory',   'category')        && ok;
  ok = validateSelect('cLocation',   'location')        && ok;
  ok = validateRequired('cDesc',     'Description')     && ok;
  if (!ok) return;

  btn.disabled = true;

  let locDesc = '';
  try {
    const locId = document.getElementById('cLocation').value;
    const loc = await apiFetch(`/locations/${locId}`);
    locDesc = `${loc.block}, ${loc.room_area}`;
  } catch(e) {}

  const data = {
    title:       document.getElementById('cTitle').value,
    category:    document.getElementById('cCategory').value,
    location_id: parseInt(document.getElementById('cLocation').value),
    location_desc: locDesc,
    urgency:     document.getElementById('cUrgency').value,
    description: document.getElementById('cDesc').value,
    user_id:     currentUser.id,
    user_name:   currentUser.name,
    status:      'Pending',
    upvote_count: 0,
    created_at:  new Date().toISOString()
  };

  pendingComplaintData = data;

  // Step 1: Evaluate if issue can be resolved via 30-second quick fix
  btn.textContent = 'Analyzing issue...';
  try {
    const qfRes = await fetch('http://localhost:5000/api/ai/quick-fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        category: data.category
      })
    });
    const qfData = await qfRes.json();
    if (qfData.success && qfData.hasQuickFix && qfData.steps && qfData.steps.length > 0) {
      showQuickFixModal(qfData.title, qfData.steps);
      btn.disabled = false;
      btn.textContent = 'Submit Complaint';
      return; // Stop here to let student attempt quick fix
    }
  } catch (qfErr) {
    console.warn('Quick-fix check skipped:', qfErr);
  }

  // Step 2: Proceed with regular ticket submission
  await executeComplaintSubmission(data);
}

function showQuickFixModal(title, steps) {
  document.getElementById('qfTitle').textContent = title || 'Quick 30-Second Fix Available';
  const container = document.getElementById('qfStepsContainer');
  container.innerHTML = steps.map((s, idx) => `
    <div class="qf-step-item">
      <span class="qf-step-num">${idx + 1}</span>
      <span>${s}</span>
    </div>
  `).join('');

  document.getElementById('quickFixModal').classList.remove('hidden');
}

function closeQuickFixModal() {
  document.getElementById('quickFixModal').classList.add('hidden');
}

function resolveSelfHelpSuccess() {
  closeQuickFixModal();
  document.getElementById('complaintForm').reset();
  const successEl = document.getElementById('cSuccess');
  successEl.textContent = '🎉 Great job! You resolved the issue yourself and saved maintenance resources.';
  successEl.classList.remove('hidden');
  setTimeout(() => {
    successEl.classList.add('hidden');
    successEl.textContent = 'Complaint submitted! Redirecting...';
  }, 4000);
}

async function proceedWithTicketSubmission() {
  closeQuickFixModal();
  if (pendingComplaintData) {
    await executeComplaintSubmission(pendingComplaintData);
  }
}

async function executeComplaintSubmission(data) {
  const btn       = document.getElementById('cSubmitBtn');
  const errorEl   = document.getElementById('cError');
  const successEl = document.getElementById('cSuccess');

  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    const existing = await apiFetch(`/complaints?location_id=${data.location_id}&category=${encodeURIComponent(data.category)}`);
    const duplicate = existing.find(c => c.status !== 'Closed' && c.status !== 'Resolved');

    if (duplicate) {
      showDuplicateModal(duplicate);
    } else {
      await apiFetch('/complaints', { method: 'POST', body: JSON.stringify(data) });
      successEl.textContent = 'Complaint submitted! Redirecting...';
      successEl.classList.remove('hidden');
      document.getElementById('complaintForm').reset();
      loadStats();
      loadComplaints();
      setTimeout(() => {
        successEl.classList.add('hidden');
        switchTab('my-complaints');
      }, 1500);
    }
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Complaint';
  }
}


function showDuplicateModal(complaint) {
  currentDuplicateId = complaint.id;
  const details = document.getElementById('duplicateDetails');
  details.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;">
      <div style="font-size:0.85rem;"><strong>Issue:</strong> ${complaint.title}</div>
      <div style="font-size:0.85rem;"><strong>Status:</strong> ${complaint.status}</div>
      <div style="font-size:0.85rem;display:flex;align-items:center;gap:6px;">
        <strong>Current Upvotes:</strong>
        <span style="display:inline-flex;align-items:center;gap:3px;font-size:0.8rem;
          background:var(--accent-light);color:var(--accent);
          padding:2px 8px;border-radius:20px;font-weight:600;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="18 15 12 9 6 15"/>
          </svg>${complaint.upvote_count || 0}
        </span>
      </div>
    </div>`;
  document.getElementById('duplicateModal').classList.remove('hidden');
}

function closeDuplicateModal() {
  document.getElementById('duplicateModal').classList.add('hidden');
  currentDuplicateId = null;
}

document.getElementById('btnUpvoteInstead').addEventListener('click', async () => {
  if (!currentDuplicateId) return;
  try {
    const comp = await apiFetch(`/complaints/${currentDuplicateId}`);
    await apiFetch(`/complaints/${currentDuplicateId}`, { 
      method: 'PATCH', 
      body: JSON.stringify({ upvote_count: (comp.upvote_count || 0) + 1 }) 
    });
    
    const upvotedData = { ...comp };
    delete upvotedData.id;
    upvotedData.original_complaint_id = comp.id;
    upvotedData.user_id = currentUser.id;
    upvotedData.source = 'upvoted';
    
    await apiFetch('/complaints', { method: 'POST', body: JSON.stringify(upvotedData) });

    closeDuplicateModal();
    document.getElementById('complaintForm').reset();
    showCustomAlert('Upvoted', 'Your upvote has been counted on the existing complaint. You can track it under My Complaints.');
    loadComplaints();
    loadStats();
    switchTab('my-complaints');
  } catch (err) {
    showCustomAlert('Error', err.message);
  }
});


let confirmComplaintId = null;

function openConfirmModal(id) {
  confirmComplaintId = id;
  document.getElementById('confirmModal').classList.remove('hidden');
  document.getElementById('confirmReasonGroup').classList.add('hidden');
  document.getElementById('btnConfirmNo').classList.remove('hidden');
  document.getElementById('btnConfirmYes').classList.remove('hidden');
  document.getElementById('btnSubmitReopen').classList.add('hidden');
  document.getElementById('confirmReason').value = '';
}

function closeConfirmModal() {
  document.getElementById('confirmModal').classList.add('hidden');
  confirmComplaintId = null;
}

function handleConfirmNo() {
  document.getElementById('btnConfirmNo').classList.add('hidden');
  document.getElementById('btnConfirmYes').classList.add('hidden');
  document.getElementById('confirmReasonGroup').classList.remove('hidden');
  document.getElementById('btnSubmitReopen').classList.remove('hidden');
}

async function submitConfirmation(isConfirmed) {
  if (!confirmComplaintId) return;
  const reason = document.getElementById('confirmReason').value;

  if (!isConfirmed && !reason.trim()) {
    showCustomAlert('Required', 'Please provide a reason for reopening the complaint.');
    return;
  }

  try {
    await apiFetch(`/complaints/${confirmComplaintId}`, {
      method: 'PATCH',
      body: JSON.stringify({ 
        status: isConfirmed ? 'Closed' : 'Reopened', 
        reopen_reason: isConfirmed ? null : reason 
      })
    });
    closeConfirmModal();
    loadStats();
    loadComplaints();

    if (isConfirmed) {
      showCustomAlert('Closed', 'Complaint closed successfully. Thank you for confirming!');
    } else {
      showCustomAlert('Reopened', 'Complaint has been reopened. The department will be notified.');
    }
  } catch (err) {
    showCustomAlert('Error', err.message);
  }
}
