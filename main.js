import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

// --- 1. 環境變數 ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  databaseURL: "https://teacher-shirley-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let csvData = { words: [], quotes: [] };
let checkinHistory = [];
let activityLog = [];

// ==========================================
// 核心邏輯 (已修正 Class 對應你的米色信封)
// ==========================================

// --- 信封開啟 ---
window.openLetter = () => {
    // 播放音樂
    const windchime = document.getElementById('windchime');
    if (windchime) {
        windchime.volume = 0.5;
        windchime.play().catch(e => console.log("Audio play failed"));
    }
    
    // 【關鍵修正】：這裡改成抓 .envelope-wrapper (你的原檔 HTML 是用這個)
    const container = document.querySelector('.envelope-wrapper');
    if (container) {
        container.classList.add('open');
    } else {
        console.error("錯誤：找不到 .envelope-wrapper，請檢查 HTML");
    }
    
    setTimeout(() => {
        const letterView = document.getElementById('letter-view');
        if (letterView) letterView.classList.add('show');
        
        const paragraphs = document.querySelectorAll('.letter-p');
        paragraphs.forEach((p, index) => { 
            setTimeout(() => { p.classList.add('visible'); }, index * 800); 
        });
        
        setTimeout(() => { 
            const btns = document.getElementById('choice-buttons');
            if (btns) btns.classList.add('visible'); 
        }, paragraphs.length * 800 + 400);
    }, 800);
};

// --- 訪客/登入 介面切換 ---
window.enterVisitorMode = () => {
    const overlay = document.getElementById('intro-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; }, 1000);
    }
    const visitorView = document.getElementById('visitor-view');
    if (visitorView) visitorView.classList.add('active');
};

window.showAuthForm = () => { 
    document.getElementById('choice-buttons').style.display = 'none'; 
    document.getElementById('auth-form-container').style.display = 'block'; 
};

window.hideAuthForm = () => { 
    document.getElementById('choice-buttons').style.display = 'flex'; 
    document.getElementById('auth-form-container').style.display = 'none'; 
};

window.openMemberTerminal = () => { 
    const term = document.getElementById('member-terminal');
    if(term) term.classList.add('show'); 
};

window.closeMemberTerminal = () => { 
    const term = document.getElementById('member-terminal');
    if(term) term.classList.remove('show'); 
};

// --- 綁定按鈕監聽 (確保 DOM 載入後執行) ---
setTimeout(() => {
    const googleBtn = document.getElementById('google-login-btn');
    if(googleBtn) googleBtn.addEventListener('click', () => { 
        signInWithPopup(auth, provider).catch(e => alert("Login Error: " + e.message)); 
    });

    const emailBtn = document.getElementById('email-login-btn');
    if(emailBtn) emailBtn.addEventListener('click', () => {
        const email = document.getElementById('email-input').value;
        const pass = document.getElementById('pass-input').value;
        if (!email || !pass) return alert("Please fill in fields");
        signInWithEmailAndPassword(auth, email, pass).catch(error => {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                if(confirm("Create account?")) createUserWithEmailAndPassword(auth, email, pass);
            } else alert(error.message);
        });
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) logoutBtn.addEventListener('click', () => { 
        signOut(auth).then(() => location.reload()); 
    });
}, 500);

// --- Auth 狀態監聽 ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const overlay = document.getElementById('intro-overlay');
        if(overlay) overlay.style.display = 'none';
        
        const visitorView = document.getElementById('visitor-view');
        if(visitorView) visitorView.classList.remove('active');
        
        const universeView = document.getElementById('universe-view');
        if(universeView) universeView.classList.add('active');
        
        const logoutBtn = document.getElementById('logoutBtn');
        if(logoutBtn) logoutBtn.style.display = 'flex';
        
        const greeting = document.getElementById('greeting-name');
        if(greeting) greeting.innerText = `Welcome to Moon Base, ${user.displayName || user.email.split('@')[0]}`;
        
        await loadCSVData();
        await loadUserData(user.uid);
        renderDailyContent(getTodayMMDD());
        trackActivity("Login", "Arrived at Moon Base");
    }
});

// --- 星球與資料 ---
window.visitPlanet = (planetName, url) => {
    if (currentUser) trackActivity("Exploration", `Departed Moon for ${planetName}`);
    setTimeout(() => { window.location.href = url; }, 300);
};

async function trackActivity(type, detail) {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    try { 
        await updateDoc(userRef, { activityLogs: arrayUnion({ date: new Date().toISOString(), type, detail }) }); 
    } catch (e) { console.log(e); }
}

async function loadUserData(uid) {
    const userRef = doc(db, "users", uid);
    let docSnap;
    try { docSnap = await getDoc(userRef); } catch(e) { return; }
    
    const fullDate = new Date().toISOString().split('T')[0];
    if (docSnap.exists()) {
        const data = docSnap.data();
        checkinHistory = data.history || [];
        activityLog = data.activityLogs || [];
        
        const total = document.getElementById('total-days');
        if(total) total.innerText = checkinHistory.length;
        
        const streak = document.getElementById('streak-days');
        if(streak) streak.innerText = data.streak || 0;
        
        const checkinBtn = document.getElementById('checkin-btn');
        if (checkinBtn && checkinHistory.includes(fullDate)) checkinBtn.disabled = true;
    } else {
        await setDoc(userRef, { email: currentUser.email, history: [], streak: 0, activityLogs: [] }, { merge: true });
    }
    renderCalendar();
}

window.handleCheckIn = async () => {
    if (!currentUser) return;
    const btn = document.getElementById('checkin-btn');
    btn.disabled = true; btn.innerText = "Signing in...";
    
    const fullDate = new Date().toISOString().split('T')[0];
    const userRef = doc(db, "users", currentUser.uid);
    const docSnap = await getDoc(userRef);
    
    let currentStreak = docSnap.data().streak || 0;
    const lastCheckIn = docSnap.data().history?.slice(-1)[0];
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastCheckIn === yesterdayStr) currentStreak++;
    else if (lastCheckIn !== fullDate) currentStreak = 1;
    
    const newHistory = checkinHistory.includes(fullDate) ? checkinHistory : [...checkinHistory, fullDate];
    await setDoc(userRef, { streak: currentStreak, history: newHistory }, { merge: true });
    await trackActivity("Check-in", "Daily Check-in");
    
    checkinHistory = newHistory;
    document.getElementById('streak-days').innerText = currentStreak;
    document.getElementById('total-days').innerText = checkinHistory.length;
    btn.innerText = "Moon Check-in Success! 🌕";
    renderCalendar();
};

window.printRecords = () => {
    const printBody = document.getElementById('print-body');
    if(printBody && currentUser) {
         printBody.innerHTML = '';
         document.getElementById('print-name').innerText = currentUser.displayName || currentUser.email;
         document.getElementById('print-date').innerText = new Date().toLocaleDateString();
         [...activityLog].reverse().forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(log.date).toLocaleString()}</td><td>-</td><td>${log.type}: ${log.detail}</td>`;
            printBody.appendChild(tr);
         });
    }
    window.print();
};

// --- CSV Logic ---
async function loadCSVData() {
    try {
        const [resWords, resQuotes] = await Promise.all([
            fetch('https://ducj-creator.github.io/Teacher-Shirley/assets/word%20of%20the%20day.csv'),
            fetch('https://ducj-creator.github.io/Teacher-Shirley/assets/quote%20of%20the%20day.csv')
        ]);
        csvData.words = parseCSV(await resWords.text());
        csvData.quotes = parseCSV(await resQuotes.text());
    } catch (e) {}
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const row = {}; 
        const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
        const matches = []; let match;
        while ((match = regex.exec(line)) !== null) { 
            if (match.index === regex.lastIndex) regex.lastIndex++; 
            if (match[1] !== undefined) matches.push(match[1].replace(/^"|"$/g, '').replace(/""/g, '"')); 
        }
        headers.forEach((h, i) => row[h] = matches[i] ? matches[i].trim() : '');
        return row;
    });
}

function getTodayMMDD() { const now = new Date(); return String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'); }

function renderDailyContent(dateStr) {
    const wordObj = csvData.words.find(r => r.date === dateStr);
    if (wordObj) {
        if(document.getElementById('wotd-word')) document.getElementById('wotd-word').innerText = wordObj.word;
        if(document.getElementById('wotd-ipa')) document.getElementById('wotd-ipa').innerText = wordObj.ipa;
        if(document.getElementById('wotd-pos')) document.getElementById('wotd-pos').innerText = wordObj.pos;
        if(document.getElementById('wotd-meaning')) document.getElementById('wotd-meaning').innerText = wordObj.meaning;
        if(document.getElementById('wotd-sentence-e')) document.getElementById('wotd-sentence-e').innerText = wordObj['sentence e'];
        if(document.getElementById('wotd-sentence-c')) document.getElementById('wotd-sentence-c').innerText = wordObj['sentence c'];
        if(document.getElementById('word-date')) document.getElementById('word-date').innerText = `(${dateStr})`;
    }
    const quoteObj = csvData.quotes.find(r => r.date === dateStr);
    if (quoteObj) {
        if(document.getElementById('qotd-text')) document.getElementById('qotd-text').innerText = quoteObj['quote e'];
        if(document.getElementById('qotd-trans')) document.getElementById('qotd-trans').innerText = quoteObj['quote c'];
        if(document.getElementById('qotd-author')) document.getElementById('qotd-author').innerText = "— " + quoteObj.author;
    }
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    if(!grid) return;
    grid.innerHTML = '';
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentYearMonth = now.toISOString().slice(0, 7); 
    for (let i = 1; i <= daysInMonth; i++) {
        const dayEl = document.createElement('div');
        dayEl.innerText = i;
        dayEl.style.cssText = "aspect-ratio:1; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.05); border-radius:4px;";
        if (checkinHistory.includes(`${currentYearMonth}-${String(i).padStart(2, '0')}`)) { dayEl.style.background = "var(--accent)"; dayEl.style.color="white"; dayEl.style.borderRadius="50%"; }
        grid.appendChild(dayEl);
    }
}

// --- 粒子與音樂 (保留原版) ---
const canvas = document.getElementById('particle-canvas');
if(canvas) {
    const ctx = canvas.getContext('2d');
    let particlesArray;
    function resizeCanvas(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });
    resizeCanvas();
    class Particle {
        constructor() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.size = Math.random() * 2; this.speedX = (Math.random() * 0.2 - 0.1); this.speedY = (Math.random() * 0.2 - 0.1); this.opacity = Math.random() * 0.5; }
        update() { this.x += this.speedX; this.y += this.speedY; if(this.x>canvas.width)this.x=0; if(this.x<0)this.x=canvas.width; if(this.y>canvas.height)this.y=0; if(this.y<0)this.y=canvas.height; }
        draw(isDark) { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = isDark ? `rgba(255, 255, 255, ${this.opacity})` : `rgba(44, 62, 80, ${this.opacity * 0.5})`; ctx.fill(); }
    }
    function initParticles() { particlesArray = []; for (let i = 0; i < 80; i++) particlesArray.push(new Particle()); }
    function animateParticles() { requestAnimationFrame(animateParticles); ctx.clearRect(0, 0, canvas.width, canvas.height); const isDark = document.getElementById('htmlRoot').classList.contains('dark'); particlesArray.forEach(p => { p.update(); p.draw(isDark); }); }
    initParticles(); animateParticles();
}

const html = document.getElementById('htmlRoot');
const themeToggle = document.getElementById('themeToggle');
if(themeToggle) themeToggle.addEventListener('click', () => html.classList.toggle('dark'));

const musicToggle = document.getElementById('musicToggle');
const themeSong = document.getElementById('themeSong');
let isPlaying = false;
if(musicToggle) musicToggle.addEventListener('click', () => {
    if(isPlaying) { themeSong.pause(); musicToggle.style.color="var(--text)"; }
    else { themeSong.currentTime=0; themeSong.play(); musicToggle.style.color="var(--accent)"; }
    isPlaying = !isPlaying;
});
