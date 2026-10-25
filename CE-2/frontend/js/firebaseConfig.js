// ============================================================
// CampusFix — Firebase Configuration & Authentication
// File: js/firebaseConfig.js
// ============================================================

// Replace these placeholders with your actual Firebase Project config:
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let firebaseInitialized = false;

function isFirebaseConfigured() {
  return firebaseConfig.apiKey && 
         firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && 
         !firebaseConfig.apiKey.includes("YOUR_");
}

function initFirebase() {
  if (firebaseInitialized) return true;
  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK not loaded on this page.');
    return false;
  }
  if (!isFirebaseConfigured()) {
    console.warn('Firebase config is using placeholders. Please add your Firebase keys in js/firebaseConfig.js.');
    return false;
  }
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    firebaseInitialized = true;
    return true;
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return false;
  }
}

// Trigger Google Sign-In with Firebase Popup
async function triggerGoogleSignIn() {
  if (initFirebase()) {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
        hd: 'chitkara.edu.in' // hints Google to prioritize Chitkara accounts
      });
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      return {
        success: true,
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        uid: user.uid,
        photoURL: user.photoURL
      };
    } catch (err) {
      console.error('Firebase Google sign-in failed:', err);
      return {
        success: false,
        error: err.message || 'Google sign-in was cancelled or failed.'
      };
    }
  }

  // Fallback Dev / Interactive Prompt if keys are not yet pasted:
  return new Promise((resolve) => {
    showDevGoogleModal((userData) => {
      resolve(userData);
    });
  });
}

// Interactive helper for quick testing before Firebase keys are pasted
function showDevGoogleModal(callback) {
  let modal = document.getElementById('firebaseSetupModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'firebaseSetupModal';
    modal.innerHTML = `
      <div class="firebase-modal-backdrop" onclick="closeDevGoogleModal()"></div>
      <div class="firebase-modal-box">
        <div class="firebase-modal-header">
          <div class="g-icon-circle">
            <svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
          </div>
          <div>
            <h3>Sign in with Google</h3>
            <p>Select or enter your Chitkara University student email</p>
          </div>
        </div>
        <div class="firebase-modal-body">
          <div class="form-group" style="margin-bottom:12px;">
            <label>Student Email Address</label>
            <input type="email" id="devChitkaraEmail" placeholder="e.g. satyam3396.beai24@chitkara.edu.in" value="satyam3396.beai24@chitkara.edu.in" />
          </div>
          <div class="form-group" style="margin-bottom:16px;">
            <label>Full Name</label>
            <input type="text" id="devStudentName" placeholder="e.g. Satyam Chhabra" value="Satyam Chhabra" />
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:16px; line-height:1.4;">
            💡 <em>Note: Firebase project keys can be pasted in <code>CE-2/frontend/js/firebaseConfig.js</code> at any time. When configured, the official Google Sign-in popup opens automatically.</em>
          </div>
        </div>
        <div class="firebase-modal-actions">
          <button class="btn-secondary" onclick="closeDevGoogleModal()">Cancel</button>
          <button class="btn-primary" id="devConfirmGoogleBtn">Continue with Google →</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  modal.style.display = 'flex';
  const confirmBtn = document.getElementById('devConfirmGoogleBtn');
  confirmBtn.onclick = () => {
    const email = document.getElementById('devChitkaraEmail').value.trim();
    const name = document.getElementById('devStudentName').value.trim() || 'Student';
    modal.style.display = 'none';
    if (!email) {
      callback({ success: false, error: 'Email cannot be empty.' });
    } else {
      callback({
        success: true,
        email: email,
        name: name,
        uid: 'dev_' + Date.now(),
        photoURL: ''
      });
    }
  };
}

function closeDevGoogleModal() {
  const modal = document.getElementById('firebaseSetupModal');
  if (modal) modal.style.display = 'none';
}
