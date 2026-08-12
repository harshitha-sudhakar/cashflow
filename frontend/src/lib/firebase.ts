import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyChiPTLwFZL4gzlIpfx9gUMMBLsUYWgYyo",
  authDomain: "cashflow-f0ab4.firebaseapp.com",
  projectId: "cashflow-f0ab4",
  storageBucket: "cashflow-f0ab4.appspot.com",
  messagingSenderId: "332188498814",
  appId: "1:332188498814:web:8b940382e5363d9f9ed12f",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

