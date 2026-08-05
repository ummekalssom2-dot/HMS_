import React, { useState, useEffect } from 'react';

export default function LabDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  const fetchLabOrders = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/lab/orders');
      const data = await response.json();
      if (response.ok) {
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch lab orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabOrders();
    const interval = setInterval(fetchLabOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCompleteAndPrint = async (order) => {
    const orderId = order._id || order.id;
    try {
      const response = await fetch(`http://localhost:5000/api/lab/complete/${orderId}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Generate Lab Report & Bill text file download
        const labReportContent = `
          ========================================
                     HOSPITAL LABORATORY REPORT
          ========================================
          Order ID: #${orderId}
          Patient Name: ${order.patient_name || order.patientName}
          Doctor: ${order.doctor_name || order.doctorName}
          ----------------------------------------
          TESTS / INSTRUCTIONS PRESCRIBED:
          ${order.instructions}
          ----------------------------------------
          LAB TEST BILL: Rs. 2000
          TEST STATUS: COMPLETED & VERIFIED
          ========================================
          Thank you for choosing our laboratory services!
        `;

        const blob = new Blob([labReportContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const patientName = order.patient_name || order.patientName || 'Patient';
        a.download = `Lab_Report_${patientName.replace(/\s+/g, '_')}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        setNotification(`Lab report completed and bill generated for ${patientName}`);
        fetchLabOrders();
        setTimeout(() => setNotification(''), 5000);
      } else {
        alert('Error: ' + (data.error || 'Could not complete lab order'));
      }
    } catch (err) {
      console.error('Error completing lab order:', err);
      alert('Server connection failed.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto my-8 p-6 bg-slate-50 min-h-screen font-sans">
      
      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl mb-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-blue-500/35 text-blue-200 border border-blue-400/30 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Laboratory Portal</span>
          <h1 className="text-2xl font-black mt-2">Diagnostic Tests & Billing Counter</h1>
          <p className="text-xs text-slate-300 mt-1">Manage lab test instructions, calculate bills, and generate reports.</p>
        </div>

        <div className="bg-white/15 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
          <p className="text-[10px] text-slate-300 uppercase font-bold tracking-wider">Pending Lab Tests</p>
          <p className="text-2xl font-black text-blue-400">{orders.length}</p>
        </div>
      </div>

      {notification && (
        <div className="p-4 mb-6 text-sm text-blue-900 bg-blue-100 border-2 border-blue-400 rounded-2xl font-bold shadow-lg">
          {notification}
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
        <h3 className="text-md font-extrabold text-slate-800 mb-6 flex justify-between items-center">
          <span>Active Lab Queue & Bills</span>
        </h3>

        {loading ? (
          <p className="text-xs text-slate-400 text-center py-10">Loading lab orders...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-sm font-bold text-slate-600">No pending lab tests found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {orders.map((order) => {
              const orderId = order._id || order.id;
              const patientName = order.patient_name || order.patientName;
              const doctorName = order.doctor_name || order.doctorName;

              return (
                <div key={orderId} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md uppercase font-mono">Lab Order #{orderId.slice(-6)}</span>
                        <h4 className="font-extrabold text-slate-900 text-base mt-2">{patientName}</h4>
                      </div>
                      <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">{doctorName}</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 my-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recommended Tests / Instructions:</p>
                      <p className="text-sm font-semibold text-slate-800 leading-relaxed">{order.instructions}</p>
                    </div>

                    <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 flex justify-between items-center mb-4">
                      <span className="text-xs font-bold text-blue-900 uppercase">Lab Test Bill:</span>
                      <span className="text-base font-black text-blue-700">Rs. 2000</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleCompleteAndPrint(order)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    Complete Test & Download Report
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}