// ============================================================
//  CampusFix — Student Dashboard Logic
//  File: js/student.js
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (currentUser.role !== 'student') {
    window.location.href = 'login.html';
    return;
  }
  loadLocations();
  loadStats();
  loadComplaints();
});

// ─── LOCATIONS ───────────────────────────────────────────────
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

// ─── STATS ───────────────────────────────────────────────────
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

// ─── COMPLAINTS ───────────────────────────────────────────────
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

// ─── SUBMIT COMPLAINT ────────────────────────────────────────
let currentDuplicateId = null;

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
  btn.textContent = 'Submitting...';

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

  try {
    const existing = await apiFetch(`/complaints?location_id=${data.location_id}&category=${encodeURIComponent(data.category)}`);
    const duplicate = existing.find(c => c.status !== 'Closed' && c.status !== 'Resolved');

    if (duplicate) {
      showDuplicateModal(duplicate);
    } else {
      await apiFetch('/complaints', { method: 'POST', body: JSON.stringify(data) });
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

// ─── DUPLICATE HANDLING ──────────────────────────────────────
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

// ─── RESOLUTION CONFIRMATION ─────────────────────────────────
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
