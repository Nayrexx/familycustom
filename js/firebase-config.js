/* ============================================
   FAMILY CUSTOM - Firebase Configuration
   ============================================ */

console.log('firebase-config.js loading...');

const firebaseConfig = {
    apiKey: "AIzaSyCA6B5uZwUXAES0J_stFVXOQiPuhNl5CJU",
    authDomain: "family-custom.firebaseapp.com",
    databaseURL: "https://family-custom-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "family-custom",
    storageBucket: "family-custom.firebasestorage.app",
    messagingSenderId: "265539608218",
    appId: "1:265539608218:web:1b1a9806e402e971d54923"
};

try {
    // Initialize Firebase
    console.log('Initializing Firebase...');
    firebase.initializeApp(firebaseConfig);

    // Initialize Firestore
    const db = firebase.firestore();
    console.log('Firestore initialized:', !!db);
    window.FirebaseDB = db;

    // Initialize Auth (only if SDK is loaded - admin page only)
    if (typeof firebase.auth === 'function') {
        const auth = firebase.auth();
        window.FirebaseAuth = auth;
        console.log('Auth initialized:', !!auth);
    } else {
        console.log('Auth SDK not loaded (not needed on public pages)');
    }

    console.log('Firebase initialized - Family Custom');
} catch (error) {
    console.error('Firebase initialization error:', error);
}
