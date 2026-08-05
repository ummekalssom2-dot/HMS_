import React, { useState, useEffect } from 'react';

export default function QueueManagement() {
  const [queueList, setQueueList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch live queue from backend
  const fetchQueue = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/appointments');
      const data = await response.json();
      setQueueList(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching queue:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Refresh queue every 5 seconds for live updates
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 p-4 rounded-2xl font-sans text-white border border-slate-800 shadow-lg">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-700/60">
        <div>
          <h2 className="text-sm font-black tracking-tight text-blue-400">Live Queue Management</h2>
          <p className="text-[11px] text-slate-400">Real-time patient queue tracking</p>
        </div>
        <button 
          onClick={fetchQueue}
          className="bg-blue-600 hover:bg-blue-700 text-[11px] font-bold px-3 py-1.5 rounded-lg transition shadow cursor-pointer"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Queue Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/60 overflow-hidden shadow-inner">
        {loading ? (
          <div className="p-6 text-center text-xs text-slate-400">Loading queue...</div>
        ) : queueList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No patients currently in the waiting queue.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-700/50 text-[10px] uppercase tracking-wider text-slate-300 border-b border-slate-700 sticky top-0">
                  <th className="p-3">Queue #</th>
                  <th className="p-3">MR ID</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Age / Gender</th>
                  <th className="p-3">Doctor</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-xs font-medium">
                {queueList.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-700/20 transition">
                    <td className="p-3 font-bold text-blue-400 text-xs">{item.queueNumber}</td>
                    <td className="p-3 text-slate-300 font-mono text-[11px]">{item.mrId}</td>
                    <td className="p-3 font-bold text-white">{item.firstName} {item.lastName}</td>
                    <td className="p-3 text-slate-300">{item.age} yrs / {item.gender}</td>
                    <td className="p-3 text-slate-300">{item.doctorName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        item.status === 'Waiting' 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}