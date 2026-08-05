import React, { useState } from 'react';

export default function PatientDashboard() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [records, setRecords] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!mobileNumber.trim()) {
      alert('Please enter your mobile number.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/patient-portal/search?mobile=${encodeURIComponent(mobileNumber.trim())}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setPatientData(data.patient);
        setRecords(data.records);
      } else {
        setPatientData(null);
        setRecords([]);
      }
      setSearched(true);
    } catch (err) {
      console.error('Failed to search patient:', err);
      alert('Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (record) => {
    const content = `
      HOSPITAL MANAGEMENT SYSTEM - MEDICAL REPORT
      ------------------------------------------
      Patient Name: ${patientData.firstName} ${patientData.lastName || ''}
      MR ID: ${patientData.mrId}
      Mobile: ${patientData.mobileNumber}
      ------------------------------------------
      Doctor: ${record.doctor_name || 'N/A'}
      Department: ${record.department || 'N/A'}
      
      PRESCRIBED MEDICINES:
      ${record.medicines || 'No medicines prescribed.'}
      
      LAB INSTRUCTIONS / TESTS:
      ${record.instructions || 'No lab tests recommended.'}
      
      Pharmacy Status: ${record.pharmacy_status || 'Pending'}
      Lab Status: ${record.lab_status || 'Pending'}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${patientData.mrId}_Prescription_Report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto my-8 p-6 bg-slate-50 min-h-screen">
      
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-8 rounded-3xl mb-8 shadow-xl">
        <span className="bg-blue-500/35 text-blue-200 border border-blue-400/30 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Patient Portal</span>
        <h1 className="text-2xl font-black mt-2">Check Your Prescriptions & Reports</h1>
        <p className="text-xs text-slate-300 mt-1">Enter your registered mobile number to view medical history and download reports.</p>

        <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl">
          <input 
            type="text" 
            placeholder="Enter Mobile Number (e.g. 03001234567)" 
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <button 
            type="submit" 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer whitespace-nowrap"
          >
            {loading ? 'Searching...' : 'Search Records'}
          </button>
        </form>
      </div>

      {searched && !patientData && (
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 text-center">
          <p className="text-sm font-bold text-slate-600">No records found for mobile number: {mobileNumber}</p>
          <p className="text-xs text-slate-400 mt-1">Make sure you entered the correct number used during registration.</p>
        </div>
      )}

      {patientData && (
        <div className="space-y-6">
          
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-lg font-mono">{patientData.mrId}</span>
              <h2 className="text-xl font-black text-slate-900 mt-2">{patientData.firstName} {patientData.lastName}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Mobile: {patientData.mobileNumber} | Age: {patientData.age}y | Gender: {patientData.gender} | Blood Group: {patientData.bloodGroup}</p>
            </div>
            <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200 text-right">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Consultations</p>
              <p className="text-xl font-black text-slate-800">{records.length}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
            <h3 className="text-md font-extrabold text-slate-800 mb-6">Medical Prescriptions & Lab Reports</h3>

            {records.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No prescriptions or lab reports available yet.</p>
            ) : (
              <div className="space-y-4">
                {records.map((rec, index) => (
                  <div key={index} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded">Doctor: {rec.doctor_name}</span>
                        <span className="text-xs text-slate-500 font-semibold">Dept: {rec.department}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rec.pharmacy_status === 'Dispensed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          Pharmacy: {rec.pharmacy_status || 'Pending'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rec.lab_status === 'Completed' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                          Lab: {rec.lab_status || 'Pending'}
                        </span>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 mt-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prescribed Medicines:</p>
                        <p className="text-sm font-mono text-slate-900 whitespace-pre-line mt-1">{rec.medicines || 'No medicines'}</p>
                      </div>

                      {rec.instructions && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lab Instructions / Tests:</p>
                          <p className="text-xs text-slate-800 font-semibold mt-1">{rec.instructions}</p>
                        </div>
                      )}
                    </div>

                    {rec.medicines && (
                      <button 
                        onClick={() => handleDownload(rec)}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer whitespace-nowrap"
                      >
                        Download Report
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}