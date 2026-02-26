import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDqEslr-J7vhKgcaH-Ugc20vB9Tj-YIsg8",
  authDomain: "iot-current-monitor.firebaseapp.com",
  databaseURL: "https://iot-current-monitor-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iot-current-monitor",
  storageBucket: "iot-current-monitor.firebasestorage.app",
  messagingSenderId: "250512408641",
  appId: "1:250512408641:web:112184c67889685da5c6c0",
  measurementId: "G-K4XYFQENE4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

// Interfaces adapted for Firebase and your C++ data structure

export interface AppUser {
  id?: string;
  "Device Name": string;
  "Mail": string;
  "Owner Name"?: string;
}

export interface OwnerSettings {
  id?: string;
  owner_name: string;
  email: string;
  updated_at?: string;
}

export interface PowerReading {
  id?: string;
  switch_id?: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  time: string | number; // Can be string "HH:MM:SS" or millis
  reading_time?: string;
  created_at?: string;
}

export interface Switch {
  id: string;
  name: string;
  device_type: string;
  is_on: boolean;
  switch_number: number;
  created_at: string;
  updated_at: string;
}

export interface EBTariffSlab {
  id: string;
  min_units: number;
  max_units: number | null;
  rate_per_unit: number;
  slab_order: number;
  created_at: string;
  updated_at: string;
}

export interface DailyUsageSummary {
  id: string;
  switch_id: string;
  usage_date: string;
  total_energy: number;
  total_hours: number;
  avg_power: number;
  cost: number;
  created_at: string;
}

export interface BillingSettings {
  id: string;
  billing_months: number;
  current_month_start: string;
  updated_at: string;
}