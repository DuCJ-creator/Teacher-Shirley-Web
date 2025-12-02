// 改用模組名稱引入，Vercel 會自動處理
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

// 使用環境變數 (這些變數我們等一下在 Vercel 後台設定)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let csvData = { words: [], quotes: [] };
let checkinHistory = [];
let activityLog = [];

// --- 以下貼上你原本的邏輯代碼，完全不用動，除了最後一段 Particle ---

// --- ENVELOPE LOGIC ---
window.openLetter = () => {
    // ... (保留你原本的代碼) ...
    const windchime = document.getElementById('windchime');
    windchime.volume = 0.5;
    windchime.play().catch(e => console.log("Audio play failed"));
    const container = document.querySelector('.envelope-container');
    container.classList.add('open');
    setTimeout(() => {
        const letterView = document.getElementById('letter-view');
        letterView.classList.add('show');
        const paragraphs = document.querySelectorAll('.letter-p');
        paragraphs.forEach((p, index) => { setTimeout(() => { p.classList.add('visible'); }, index * 800); });
        setTimeout(() => { document.getElementById('choice-buttons').classList.add('visible'); }, paragraphs.length * 800 + 400);
    }, 800);
};

// ... (請將你原本 script 標籤內的所有函數都複製過來：window.enterVisitorMode, window.showAuthForm 等等) ...
// ... (包含 onAuthStateChanged, visitPlanet, trackActivity 等等) ...

// --- 最後的粒子特效 (Particle System) ---
// 確保 canvas 元素已經存在再執行
const canvas = document.getElementById('particle-canvas');
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

// 啟動粒子
initParticles(); 
animateParticles();

// 主題切換與音樂
const html = document.getElementById('htmlRoot');
document.getElementById('themeToggle').addEventListener('click', () => html.classList.toggle('dark'));
const musicToggle = document.getElementById('musicToggle');
const themeSong = document.getElementById('themeSong');
let isPlaying = false;
musicToggle.addEventListener('click', () => {
    if(isPlaying) { themeSong.pause(); musicToggle.style.color="var(--text)"; }
    else { themeSong.currentTime=0; themeSong.play(); musicToggle.style.color="var(--accent)"; }
    isPlaying = !isPlaying;
});