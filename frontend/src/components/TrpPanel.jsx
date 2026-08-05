import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TrpPanel = () => {
  const [queuePatients, setQueuePatients] = useState([]);
  const [selectedQueuePatient, setSelectedQueuePatient] = useState(null);
  const [disposedPatients, setDisposedPatients] = useState([]);
  
  // Auto-dismiss popup state
  const [successMessage, setSuccessMessage] = useState('');

  // TRP Form State
  const [trpData, setTrpData] = useState({
    temp: '',
    weight: '',
    height: '',
    bp: '',
    pulse: '',
    allergies: '',
    symptoms: ''
  });

  useEffect(() => {
    fetchQueueData();
    loadDisposedFromStorage();

    const interval = setInterval(() => {
      fetchQueueData();
      loadDisposedFromStorage();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const loadDisposedFromStorage = () => {
    try {
      const saved = localStorage.getItem('disposedPatients');
      if (saved) {
        setDisposedPatients(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Error loading disposed patients:', err);
    }
  };

  const fetchQueueData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/appointments');
      const paidOnly = response.data.filter(item => item.paymentStatus === 'Paid' && item.actionStatus === 'Pending');

      setQueuePatients(paidOnly);

      setSelectedQueuePatient(prev => {
        if (prev) {
          const stillInQueue = paidOnly.find(p => (p.id || p._id) === (prev.id || prev._id));
          return stillInQueue || prev;
        }
        return paidOnly.length > 0 ? paidOnly[0] : null;
      });
    } catch (err) {
      console.error('Error fetching queue for TRP:', err);
    }
  };

  const handleTrpChange = (e) => {
    setTrpData({ ...trpData, [e.target.name]: e.target.value });
  };

  const handleTrpSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedQueuePatient) {
      alert('Pehle queue mein koi paid patient mojood hona chahiye!');
      return;
    }

    try {
      const patientId = selectedQueuePatient.id || selectedQueuePatient._id;

      await axios.put(`http://localhost:5000/api/appointments/action/${patientId}`, {
        ...selectedQueuePatient,
        ...trpData,
        actionStatus: 'Pending'
      });

      setSuccessMessage('Vitals submitted successfully! Patient sent to Doctor Room.');
      setTimeout(() => {
        setSuccessMessage('');
      }, 2000);

      setSelectedQueuePatient(null);
      setTrpData({ temp: '', weight: '', height: '', bp: '', pulse: '', allergies: '', symptoms: '' });
      fetchQueueData();
    } catch (err) {
      console.error('TRP Submit Error:', err);
      alert('Failed to submit TRP details');
    }
  };

  const handleDispositionChange = (index, newDisposition) => {
    const updated = [...disposedPatients];
    updated[index].disposition = newDisposition;
    setDisposedPatients(updated);
    localStorage.setItem('disposedPatients', JSON.stringify(updated));
  };

  // File attachment handler per patient with preview URL support
  const handleFileAttach = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      const updated = [...disposedPatients];
      updated[index].attachedFileName = file.name;
      updated[index].attachedFileUrl = fileUrl;
      setDisposedPatients(updated);
      localStorage.setItem('disposedPatients', JSON.stringify(updated));
    }
  };

  // Function to delete attached file
  const handleRemoveFile = (index) => {
    const updated = [...disposedPatients];
    updated[index].attachedFileName = null;
    updated[index].attachedFileUrl = null;
    setDisposedPatients(updated);
    localStorage.setItem('disposedPatients', JSON.stringify(updated));
  };

  return (
    <div className="trp-container" style={styles.container}>
      <style>{`
        .trp-wrapper {
          width: 760px;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-sizing: border-box;
          padding-left: 10px;
        }
        .trp-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          box-sizing: border-box;
        }
        .trp-column {
          display: flex;
          flex-direction: column;
          height: 395px;
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .auto-popup {
          animation: fadeInOut 2s ease-in-out forwards;
        }
      `}</style>

      <div className="trp-wrapper">
        <div style={styles.topBanner}>
          <div>
            <h2 style={styles.bannerTitle}>TRP (Triage) & Disposal Management Panel</h2>
            <p style={styles.bannerSubtitle}>Record patient vitals and manage post-checkup dispositions.</p>
          </div>
        </div>

        {successMessage && (
          <div className="auto-popup" style={styles.popupBox}>
            <span>✅ {successMessage}</span>
          </div>
        )}

        <div className="trp-grid">
          {/* Left Column: Disposal Panel */}
          <div className="trp-column">
            <div style={styles.cardBoxTall}>
              <div style={styles.cardHeader}>
                <span style={styles.headerText}>Disposal Panel (Post-Doctor)</span>
              </div>
              <div style={styles.contentListTall}>
                {disposedPatients.length === 0 ? (
                  <p style={styles.placeholderText}>No patients sent to disposal yet.</p>
                ) : (
                  disposedPatients.map((p, idx) => (
                    <div key={idx} style={styles.itemCard}>
                      <div>
                        <strong>{p.mrId ? `[${p.mrId}] ` : ''}{p.firstName} {p.lastName}</strong>
                        <div style={{ fontSize: '9.5px', color: '#475569' }}>Doc: {p.doctorName}</div>
                        {p.medicines && <div style={{ fontSize: '9px', color: '#2563eb' }}>Med: {p.medicines}</div>}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end' }}>
                        <select
                          value={p.disposition || 'Pending'}
                          onChange={(e) => handleDispositionChange(idx, e.target.value)}
                          style={styles.statusSelect}
                        >
                          <option value="Pending">Select Action...</option>
                          <option value="Discharged / Go to Home">Discharged / Go to Home</option>
                          <option value="Referred">Refer to Specialist</option>
                          <option value="Admitted">Admit / Operation</option>
                        </select>
                        <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#0f766e' }}>
                          {p.disposition || 'Pending'}
                        </span>

                        {/* Attach File Section per patient with Delete option */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                          {!p.attachedFileName ? (
                            <label style={styles.fileUploadLabel}>
                              📎 Attach File
                              <input 
                                type="file" 
                                style={{ display: 'none' }} 
                                onChange={(e) => handleFileAttach(idx, e)} 
                              />
                            </label>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <a 
                                href={p.attachedFileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={styles.fileLink}
                                title="Click to view file"
                              >
                                {p.attachedFileName}
                              </a>
                              <button 
                                onClick={() => handleRemoveFile(idx)} 
                                style={styles.deleteFileBtn}
                                title="Remove file"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: TRP Form */}
          <div className="trp-column">
            <div style={styles.cardBoxForm}>
              <div style={styles.cardHeader}>
                <span style={styles.headerText}>Paid Patients Vitals Entry</span>
              </div>

              <div style={styles.formGroupSpacing}>
                <label style={styles.label}>Select Paid Patient ({queuePatients.length} Available)</label>
                <select
                  style={styles.inputField}
                  value={selectedQueuePatient ? (selectedQueuePatient.id || selectedQueuePatient._id) : ''}
                  onChange={(e) => {
                    const foundPatient = queuePatients.find(item => String(item.id || item._id) === e.target.value);
                    setSelectedQueuePatient(foundPatient || null);
                  }}
                >
                  <option value="" disabled>-- Choose Paid Patient --</option>
                  {queuePatients.map((q) => (
                    <option key={q.id || q._id} value={q.id || q._id}>
                      {q.mrId ? `[${q.mrId}] ` : ''}{q.firstName} {q.lastName} ({q.doctorName})
                    </option>
                  ))}
                </select>
              </div>

              {selectedQueuePatient && (
                <div style={styles.selectedInfoBox}>
                  <span>Selected: <strong>{selectedQueuePatient.firstName} {selectedQueuePatient.lastName}</strong></span>
                  <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: 'bold' }}>Doc: {selectedQueuePatient.doctorName}</span>
                </div>
              )}

              <form onSubmit={handleTrpSubmit} style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Temp (°F)</label>
                  <input type="text" name="temp" value={trpData.temp} onChange={handleTrpChange} placeholder="e.g. 98.6" style={styles.inputField} required />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Weight (kg)</label>
                  <input type="text" name="weight" value={trpData.weight} onChange={handleTrpChange} placeholder="e.g. 70" style={styles.inputField} required />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Height</label>
                  <input type="text" name="height" value={trpData.height} onChange={handleTrpChange} placeholder="e.g. 5'8" style={styles.inputField} required />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>BP (mmHg)</label>
                  <input type="text" name="bp" value={trpData.bp} onChange={handleTrpChange} placeholder="e.g. 120/80" style={styles.inputField} required />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Pulse (bpm)</label>
                  <input type="text" name="pulse" value={trpData.pulse} onChange={handleTrpChange} placeholder="e.g. 72" style={styles.inputField} required />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Allergies</label>
                  <input type="text" name="allergies" value={trpData.allergies} onChange={handleTrpChange} placeholder="e.g. Dust, Penicillin" style={styles.inputField} />
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={styles.label}>Symptoms</label>
                  <textarea name="symptoms" value={trpData.symptoms} onChange={handleTrpChange} placeholder="Enter symptoms..." style={styles.textareaField} rows="1" required />
                </div>

                <div style={{ gridColumn: 'span 2', marginTop: '2px' }}>
                  <button type="submit" style={styles.submitBtn}>Submit Vitals & Send to Doctor Room</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '6px 10px',
    backgroundColor: '#f1f5f9',
    height: '100vh',
    boxSizing: 'border-box',
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    overflowY: 'auto',
  },
  topBanner: {
    backgroundColor: '#ffffff',
    padding: '6px 12px',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #bfdbfe',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    width: '100%',
    boxSizing: 'border-box',
  },
  bannerTitle: {
    margin: '0 0 1px 0',
    fontSize: '13px',
    color: '#1e3a8a',
    fontWeight: 'bold',
  },
  bannerSubtitle: {
    margin: '0',
    fontSize: '9.5px',
    color: '#64748b',
  },
  popupBox: {
    position: 'fixed',
    top: '15px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#0f766e',
    color: '#fff',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '10.5px',
    fontWeight: 'bold',
    zIndex: 1000,
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  cardBoxTall: {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    padding: '8px 10px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    border: '1.5px solid #93c5fd',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  cardBoxForm: {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    padding: '8px 10px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    border: '1.5px solid #93c5fd',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    overflowY: 'auto',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '3px',
    marginBottom: '4px',
    borderBottom: '1px solid #e2e8f0',
  },
  headerText: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  contentListTall: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto',
    flex: 1,
    minHeight: 0,
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: '10px',
    textAlign: 'center',
    margin: 'auto',
  },
  itemCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '5px 6px',
    backgroundColor: '#f8fafc',
    borderRadius: '4px',
    fontSize: '10px',
    border: '1px solid #e2e8f0',
  },
  statusSelect: {
    padding: '2px 4px',
    borderRadius: '3px',
    fontSize: '9px',
    fontWeight: 'bold',
    border: '1px solid #cbd5e1',
    cursor: 'pointer',
    backgroundColor: '#fff',
  },
  fileUploadLabel: {
    fontSize: '8px',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    padding: '2px 5px',
    borderRadius: '3px',
    cursor: 'pointer',
    border: '1px solid #bae6fd',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fileLink: {
    fontSize: '8px',
    color: '#2563eb',
    textDecoration: 'underline',
    maxWidth: '60px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  deleteFileBtn: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fca5a5',
    borderRadius: '3px',
    fontSize: '9px',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: '0 4px',
  },
  formGroupSpacing: {
    marginBottom: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  selectedInfoBox: {
    backgroundColor: '#eff6ff',
    padding: '4px 6px',
    borderRadius: '4px',
    border: '1px solid #bfdbfe',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '9.5px',
    marginBottom: '4px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '5px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  label: {
    fontSize: '9.5px',
    color: '#334155',
    fontWeight: 'bold',
  },
  inputField: {
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    padding: '3px 5px',
    color: '#000000',
    fontSize: '10px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  },
  textareaField: {
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    padding: '3px 5px',
    color: '#000000',
    fontSize: '10px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'none',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '6px',
    fontSize: '10.5px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  }
};

export default TrpPanel;