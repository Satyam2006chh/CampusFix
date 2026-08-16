// ============================================================
//  CampusFix — Student Dashboard Logic
//  File: js/student.js
// ============================================================

// ─── INITIALIZATION ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (currentUser.role !== 'student') {
    window.location.href = 'login.html';
    return;
  }
  
  loadLocations();
  loadStats();
  loadComplaints();
});

// ─── FETCH & POPULATE LOCATIONS ──────────────────────────────
async function loadLocations() {
  try {
    const locations = await apiFetch('/student/locations');
    const select = document.getElementById('cLocation');
    select.innerHTML = '<option value="" disabled selected>Select specific location</option>';
    
    locations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.location_id;
      opt.textContent = `${loc.campus} — ${loc.block}, ${loc.floor} (${loc.room_area})`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load locations', err);
  }
}

// ─── FETCH & POPULATE STATS ──────────────────────────────────
async function loadStats() {
  try {
    const stats = await apiFetch('/student/stats');
    document.getElementById('statTotal').textContent = stats.total || 0;
    document.getElementById('statPending').textContent = stats.pending || 0;
    document.getElementById('statInProgress').textContent = stats.in_progress || 0;
    document.getElementById('statResolved').textContent = stats.resolved || 0;
  } catch (err) {
    console.error('Failed to load stats', err);
  }
}

// ─── FETCH & POPULATE COMPLAINTS ─────────────────────────────
let myComplaints = [];

async function loadComplaints() {
  try {
    myComplaints = await apiFetch('/student/complaints');
    renderRecentComplaints();
    renderAllComplaints();
  } catch (err) {
    console.error('Failed to load complaints', err);
  }
}

function renderRecentComplaints() {
  const tbody = document.getElementById('recentComplaintsBody');
  tbody.innerHTML = '';
  
  const recent = myComplaints.slice(0, 5); // top 5
  if (recent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No complaints reported yet.</td></tr>';
    return;
  }
  
  recent.forEach(c => {
    tbody.innerHTML += `
      <tr>
        <td>#CF-${c.complaint_id}</td>
        <td style="font-weight:500; color:var(--text-primary);">${c.title}</td>
        <td>${c.category}</td>
        <td>${getStatusBadge(c.status)}</td>
        <td>${formatDate(c.created_at)}</td>
      </tr>
    `;
  });
}

function renderAllComplaints() {
  const tbody = document.getElementById('allComplaintsBody');
  tbody.innerHTML = '';
  
  if (myComplaints.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No complaints reported yet.</td></tr>';
    return;
  }
  
  myComplaints.forEach(c => {
    let actionHtml = '-';
    
    // If waiting confirmation, show Verify button
    if (c.status === 'Waiting Confirmation') {
      actionHtml = `<button class="action-btn" onclick="openConfirmModal(${c.complaint_id})">Verify Fix</button>`;
    }
    
    tbody.innerHTML += `
      <tr>
        <td>#CF-${c.complaint_id}</td>
        <td>
          <div style="font-weight:600; color:var(--text-primary); margin-bottom:4px;">${c.title}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${c.block}, ${c.room_area}</div>
        </td>
        <td>${c.category}</td>
        <td>${getStatusBadge(c.status)}</td>
        <td>${formatDate(c.created_at)}</td>
        <td>${actionHtml}</td>
      </tr>
    `;
  });
}

// ─── SUBMIT NEW COMPLAINT ────────────────────────────────────
let currentDuplicateId = null;

async function submitComplaint(e) {
  e.preventDefault();
  
  const btn = document.getElementById('cSubmitBtn');
  const errorEl = document.getElementById('cError');
  const successEl = document.getElementById('cSuccess');
  
  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  
  const data = {
    title: document.getElementById('cTitle').value,
    category: document.getElementById('cCategory').value,
    location_id: document.getElementById('cLocation').value,
    urgency: document.getElementById('cUrgency').value,
    description: document.getElementById('cDesc').value
  };
  
  try {
    const res = await apiFetch('/student/complaints', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (res.duplicate) {
      showDuplicateModal(res.existing_complaint);
    } else {
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
  currentDuplicateId = complaint.complaint_id;
  const modal = document.getElementById('duplicateModal');
  const details = document.getElementById('duplicateDetails');
  
  details.innerHTML = `
    <strong>Existing Issue:</strong> ${complaint.title}<br/>
    <strong>Status:</strong> ${complaint.status}<br/>
    <strong>Upvotes:</strong> ${complaint.upvote_count}
  `;
  
  modal.classList.remove('hidden');
}

function closeDuplicateModal() {
  document.getElementById('duplicateModal').classList.add('hidden');
  currentDuplicateId = null;
}

document.getElementById('btnUpvoteInstead').addEventListener('click', async () => {
  if (!currentDuplicateId) return;
  
  try {
    await apiFetch(`/student/complaints/${currentDuplicateId}/upvote`, { method: 'POST' });
    closeDuplicateModal();
    document.getElementById('complaintForm').reset();
    
    // Switch to my complaints (conceptually they upvoted, we won't show it in their list for now, but UI feedback)
    alert('Successfully upvoted the existing issue!');
    switchTab('overview');
  } catch (err) {
    alert(err.message);
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
    alert('Please provide a reason for reopening.');
    return;
  }
  
  try {
    await apiFetch(`/student/complaints/${confirmComplaintId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ confirmed: isConfirmed, reason })
    });
    
    closeConfirmModal();
    loadStats();
    loadComplaints();
  } catch (err) {
    alert(err.message);
  }
}
