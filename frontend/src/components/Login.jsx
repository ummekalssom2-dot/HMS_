import React, { useState } from 'react';

export default function Login() {
  const [role, setRole] = useState('Patient');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    alert(`Logging in as ${role} with: ${identifier}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="bg-white flex flex-col lg:flex-row w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 items-stretch">

        {/* Left Brand Panel */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-teal-500 lg:w-1/2 p-5 sm:p-6 text-white flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="inline-flex items-center justify-center w-9 h-9 bg-white/15 rounded-2xl backdrop-blur-md mb-3 shadow-inner text-lg">
            🏥
          </div>
          <h2 className="text-lg font-black tracking-tight mb-1.5">Welcome Back!</h2>
          <p className="text-[11px] text-blue-100 leading-relaxed font-normal mb-4">
            MediCare Hospital Management System — Secure portal for staff and patients.
          </p>

          <div className="pt-3 border-t border-white/15">
            <p className="text-[10px] text-blue-100 mb-1.5 font-medium">Don't have an account?</p>
            <button
              type="button"
              className="w-full bg-white/10 hover:bg-white hover:text-blue-900 border border-white/30 text-white text-[11px] font-bold py-2 px-3 rounded-xl transition duration-300 backdrop-blur-sm cursor-pointer shadow-sm"
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:w-1/2 p-5 sm:p-6 flex flex-col justify-center bg-white">
          <div className="mb-3 text-center sm:text-left">
            <h1 className="text-lg font-black text-slate-800 tracking-tight">MediCare</h1>
            <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">Online Hospital Management System</p>
          </div>

          <div className="flex gap-1 mb-3 bg-slate-100/90 p-1 rounded-xl overflow-x-auto border border-slate-200/60">
            {['Patient', 'Doctor', 'Reception', 'Laboratory', 'Pharmacy'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${role === r ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'}`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                {role === 'Patient' ? 'Mobile Number / Email' : 'Email Address'}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={role === 'Patient' ? 'Enter mobile or email' : 'admin@gmail.com'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white font-medium transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white font-medium transition"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] uppercase tracking-wider py-2.5 rounded-lg shadow-lg shadow-blue-600/25 transition-all duration-200 cursor-pointer mt-1"
            >
              Sign In as {role}
            </button>
          </form>

          <div className="mt-3 bg-blue-50/60 border border-blue-100 p-2.5 rounded-lg text-[10px] text-blue-900 leading-relaxed font-medium flex items-start gap-2">
            <span className="text-blue-600 font-bold mt-0.5">ℹ️</span>
            <p>
              <strong>{role} Portal:</strong> Enter your credentials to access appointments, prescriptions, and reports securely.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}