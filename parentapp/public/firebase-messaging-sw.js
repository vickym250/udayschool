// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyC9W3ABpuVgmQP3WJtV00At7g3Qud0iQOU",
    projectId: "schooltest-b8ce2",
    authDomain: "schooltest-b8ce2.firebaseapp.com",
    messagingSenderId: "436336891260",
    appId: "1:436336891260:web:dc98f8ea6e51897f4300f9",
});

const messaging = firebase.messaging();

// Background mein notification handle karne ke liye
messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/brigh.png' // Aapka school logo
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});