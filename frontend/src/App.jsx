import React, { useState } from 'react';
import PatientsDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import ReceptionDashboard from './components/ReceptionDashboard';
import PharmacyDashboard from './components/PharmacyDashboard';
import LabortyDashboard from './components/LabDashboard';
import TrpPanel from './components/TrpPanel';
import AdminDashboard from './components/AdminDashboard.jsx';

// --- 1. Login Component ---
function Login({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState('Patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const roleInfoMap = {
    Patient: 'Patient: Enter your registered mobile number / email to view your dashboard, prescriptions, and reports.',
    Doctor: 'Doctor: Access your appointment schedules, patient diagnoses, and medical histories.',
    Reception: 'Reception: Manage patient registrations, OPD token queues, and front-desk operations.',
    Laboratory: 'Laboratory: View lab test requests, upload reports, and update diagnostic results.',
    Pharmacy: 'Pharmacy: Dispense prescribed medications and manage medical inventory.',
    'TRP Panel': 'TRP Panel: Manage paid patient queue vitals (Temp, BP, Weight, etc.) and handle post-checkup dispositions.',
    Admin: 'Admin: Manage hospital doctors, departments, timings, system configurations, and staff controls.'
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Please fill in all fields.');
      return;
    }
    onLogin(selectedRole);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        
        {/* Left Side: Gradient Panel */}
        <div className="bg-gradient-to-b from-blue-600 via-teal-500 to-teal-400 p-8 text-white flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 bg-white/25 rounded-full flex items-center justify-center mb-6 backdrop-blur-md shadow-inner">
            <span className="text-3xl">🫀</span>
          </div>
          <h2 className="text-3xl font-black mb-2">Welcome Back!</h2>
          <p className="text-xs text-blue-50 max-w-xs leading-relaxed">
            MediCare Hospital Management System — Secure portal for staff and patients.
          </p>
        </div>

        {/* Right Side: Form & Role Tabs */}
        <div className="p-6 md:p-8 flex flex-col justify-center">
          
          <div className="text-center mb-5">
            <div className="flex items-center justify-center gap-1.5 text-blue-900 font-black text-xl">
              MediCare
            </div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Online Hospital Management System</p>
          </div>

          {/* Role Selector Tabs */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5 mb-5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            {['Patient', 'Doctor', 'Reception', 'Laboratory', 'Pharmacy', 'TRP Panel', 'Admin'].map((roleName) => (
              <button
                key={roleName}
                type="button"
                onClick={() => setSelectedRole(roleName)}
                className={`py-2 text-[10px] font-bold rounded-xl transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  selectedRole === roleName 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-200/60'
                }`}
              >
                <span className="truncate w-full text-center px-0.5">{roleName}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input 
                type="email" 
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>➔</span> Sign In as {selectedRole}
            </button>
          </form>

          <div className="mt-4 p-3 bg-cyan-50/70 border border-cyan-100 rounded-xl text-[11px] text-cyan-900 flex items-start gap-2">
            <span className="font-bold text-blue-600">ℹ️</span>
            <p className="leading-relaxed">{roleInfoMap[selectedRole]}</p>
          </div>

        </div>

      </div>
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const [currentRole, setCurrentRole] = useState(null);

  if (!currentRole) {
    return <Login onLogin={(role) => setCurrentRole(role)} />;
  }

  return (
    <div className="relative min-h-screen bg-slate-50">
      {/* Role-based exact Dashboard components mapping.
          Each dashboard (e.g. ReceptionDashboard) has its own Logout button
          with a confirmation modal, so no floating logout button is needed here. */}
      {currentRole === 'Patient' && <PatientsDashboard />}
      {currentRole === 'Doctor' && <DoctorDashboard />}
      {currentRole === 'Reception' && <ReceptionDashboard />}
      {currentRole === 'Laboratory' && <LabortyDashboard />}
      {currentRole === 'Pharmacy' && <PharmacyDashboard />}
      {currentRole === 'TRP Panel' && <TrpPanel />}
      {currentRole === 'Admin' && <AdminDashboard />}
    </div>
  );
}