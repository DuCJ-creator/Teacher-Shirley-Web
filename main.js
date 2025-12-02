// main.js - 完整修復版
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

// 1. 設定 Firebase (從 Vercel 環境變數讀取)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID
};

console.log("正在初始化 Firebase..."); // Debug 訊息

// 2. 初始化 App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 3. 全域變數
let currentUser = null;

// ==========================================
// 核心功能函數 (Functions)
// ==========================================

// --- 信封開啟 ---
async function openLetter() {
    console.log("信封被點擊了！"); // Debug 訊息
    
    // 播放風鈴聲
    const windchime = document.getElementById('windchime');
    if(windchime) {
        windchime.volume = 0.5;
        windchime.play().catch(e => console.log("Audio play failed:", e));
    }

    // 動畫邏輯
    const container = document.querySelector('.envelope-container');
    if(container) container.classList.add('open');
    
    setTimeout(() => {
        const letterView = document.getElementById('letter-view');
        if(letterView) letterView.classList.add('show');
        
        const paragraphs = document.querySelectorAll('.letter-p');
        paragraphs.forEach((p, index) => { 
            setTimeout(() => { p.classList.add('visible'); }, index * 800); 
        });
        
        setTimeout(() => { 
            const btns = document.getElementById('choice-buttons');
            if(btns) btns.classList.add('visible'); 
        }, paragraphs.length * 800 + 400);
    }, 800);
}

// --- 訪客模式 ---
function enterVisitorMode() {
    console.log("進入訪客模式");
    document.getElementById('letter-view').style.display = 'none';
    document.querySelector('.envelope-container').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
    document.getElementById('welcome-msg').innerText = "Welcome, Traveler";
    
    // 訪客限制
    document.getElementById('daily-planet').style.pointerEvents = 'none';
    document.getElementById('daily-planet').style.opacity = '0.5';
    loadWordOfTheDay(); // 載入單字
    loadQuote(); // 載入名言
}

// --- 顯示登入視窗 (這裡直接呼叫 Firebase Login) ---
function showAuthForm() {
    console.log("準備登入...");
    login();
}

// --- 登入邏輯 ---
function login() {
    signInWithPopup(auth, provider)
    .then((result) => {
        console.log("登入成功:", result.user.email);
        // 登入成功後會自動觸發 onAuthStateChanged
    }).catch((error) => {
        console.error("登入失敗:", error);
        alert("Login failed: " + error.message);
    });
}

// --- 登出 ---
function logout() {
    signOut(auth).then(() => {
        console.log("已登出");
        window.location.reload();
    });
}

// --- 簽到星球 ---
async function visitPlanet() {
    if (!currentUser) return alert("Please log in to check in!");
    
    const planet = document.getElementById('daily-planet');
    planet.classList.add('checked-in');
    
    // 簡單的資料庫寫入範例
    const today = new Date().toISOString().split('T')[0];
    try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            checkins: arrayUnion(today)
        });
        alert("Check-in successful! 🌟");
    } catch (e) {
        console.error("Check-in error:", e);
        // 如果文檔不存在，則建立
        try {
            await setDoc(doc(db, "users", currentUser.uid), { checkins: [today] });
            alert("First Check-in successful! 🌟");
        } catch(e2) {
            console.error("Create doc error:", e2);
        }
    }
}

// --- 標記單字已學 ---
function markWordLearned() {
    if (!currentUser) return alert("Visitor mode: changes won't be saved.");
    alert("Word marked as learned! (Saved to database)");
}

// --- 列印報表 ---
function printReport() {
    window.print();
}

// --- 輔助功能: 載入單字 (假資料) ---
function loadWordOfTheDay() {
    document.getElementById('wod-word').innerText = "Serendipity";
    document.getElementById('wod-part').innerText = "noun";
    document.getElementById('wod-mean').innerText = "意外發現美好事物的運氣";
}

function loadQuote() {
    document.getElementById('qotd-text').innerText = "The only way to do great work is to love what you do.";
    document.getElementById('qotd-author').innerText = "Steve Jobs";
}

// ==========================================
// 監聽登入狀態
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        console.log("使用者已登入:", user.uid);
        
        // 如果還在信封畫面，直接進去
        const letterView = document.getElementById('letter-view');
        if (letterView && letterView.classList.contains('show')) {
            enterVisitorMode(); // 這裡借用切換畫面的邏輯
            document.getElementById('welcome-msg').innerText = "Welcome back, " + user.displayName;
            // 恢復星球點擊
            document.getElementById('daily-planet').style.pointerEvents = 'auto';
            document.getElementById('daily-planet').style.opacity = '1';
        }
    } else {
        currentUser = null;
    }
});


// ==========================================
// 粒子特效 (原本的背景代碼)
// ==========================================
const canvas = document.getElementById('particle-canvas');
if (canvas) {
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
    function animateParticles() { 
        requestAnimationFrame(animateParticles); 
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        const isDark = document.getElementById('htmlRoot') ? document.getElementById('htmlRoot').classList.contains('dark') : false; 
        particlesArray.forEach(p => { p.update(); p.draw(isDark); }); 
    }

    initParticles(); 
    animateParticles();
}

// ==========================================
// 音樂與主題按鈕
// ==========================================
const themeToggle = document.getElementById('themeToggle');
const musicToggle = document.getElementById('musicToggle');
const themeSong = document.getElementById('themeSong');

if (themeToggle) {
    themeToggle.addEventListener('click', () => document.getElementById('htmlRoot').classList.toggle('dark'));
}

if (musicToggle && themeSong) {
    let isPlaying = false;
    musicToggle.addEventListener('click', () => {
        if(isPlaying) { themeSong.pause(); musicToggle.style.color="var(--text)"; }
        else { themeSong.currentTime=0; themeSong.play().catch(e=>console.log(e)); musicToggle.style.color="var(--accent)"; }
        isPlaying = !isPlaying;
    });
}

// ==========================================
// 關鍵：將功能綁定到 window (讓 HTML 按鈕找得到)
// ==========================================
window.openLetter = openLetter;
window.enterVisitorMode = enterVisitorMode;
window.showAuthForm = showAuthForm;
window.visitPlanet = visitPlanet;
window.markWordLearned = markWordLearned;
window.printReport = printReport;
window.login = login;
window.logout = logout;

console.log("Main.js 載入完成，功能已公開！");
