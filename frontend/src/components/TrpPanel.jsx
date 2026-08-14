import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const TrpPanel = () => {
  const [queuePatients, setQueuePatients] = useState([]);
  const [selectedQueuePatient, setSelectedQueuePatient] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [dropdownValue, setDropdownValue] = useState('');
  const [uploadingId, setUploadingId] = useState(null);
  const fileInputRefs = useRef({});

  // TRP Form State
  const [trpData, setTrpData] = useState({
    temp: '',
    weight: '',
    height: '',
    bp: '',
    pulse: ''
  });

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(() => {
      fetchQueueData();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchQueueData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/appointments');
      const paidOnly = response.data.filter(item => 
        item.paymentStatus === 'Paid' && 
        item.actionStatus === 'Pending' &&
        !(item.vitalsDone === true || item.vitalsDone === 1 || item.vitalsDone === '1')
      );
      setQueuePatients(paidOnly);

      setSelectedQueuePatient(prev => {
        if (prev) {
          const stillInQueue = paidOnly.find(p => (p.id || p._id) === (prev.id || prev._id));
          return stillInQueue || null;
        }
        return null;
      });
    } catch (err) {
      console.error('Error fetching queue for TRP:', err);
    }
  };

  const handleTrpChange = (e) => {
    setTrpData({ ...trpData, [e.target.name]: e.target.value });
  };

  const openVitals = (patient) => {
    setSelectedQueuePatient(patient);
  };

  const closeVitalsPanel = () => {
    setSelectedQueuePatient(null);
    setDropdownValue('');
    setTrpData({ temp: '', weight: '', height: '', bp: '', pulse: '' });
  };

  const handleDropdownChange = (e) => {
    const id = e.target.value;
    setDropdownValue(id);
    if (!id) return;
    const patient = queuePatients.find(p => String(p.id || p._id) === id);
    if (patient) openVitals(patient);
  };

  const handleTrpSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedQueuePatient) {
      alert('Pehle patient select karein!');
      return;
    }

    try {
      const patientId = selectedQueuePatient.id || selectedQueuePatient._id;

      await axios.put(`http://localhost:5000/api/appointments/action/${patientId}`, {
        ...selectedQueuePatient,
        ...trpData,
        actionStatus: 'Pending',
        vitalsDone: true
      });

      setSuccessMessage('Vitals submitted successfully! Sent to Doctor.');
      setTimeout(() => {
        setSuccessMessage('');
      }, 2000);

      closeVitalsPanel();
      fetchQueueData();
    } catch (err) {
      console.error('TRP Submit Error:', err);
      alert('Failed to submit TRP details');
    }
  };

  const triggerFilePicker = (patientId) => {
    if (fileInputRefs.current[patientId]) {
      fileInputRefs.current[patientId].click();
    }
  };

  const handleFileSelect = async (e, patient) => {
    const file = e.target.files[0];
    if (!file) return;

    const patientId = patient.id || patient._id;
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingId(patientId);
      await axios.post(`http://localhost:5000/api/appointments/attach/${patientId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccessMessage('File attached successfully!');
      setTimeout(() => setSuccessMessage(''), 2000);
      await fetchQueueData();
    } catch (err) {
      console.error('File attach error:', err);
      alert('File attach nahi ho saki.');
    } finally {
      setUploadingId(null);
      if (fileInputRefs.current[patientId]) fileInputRefs.current[patientId].value = '';
    }
  };

  const handleRemoveFile = async (patient) => {
    const patientId = patient.id || patient._id;
    try {
      setUploadingId(patientId);
      await axios.put(`http://localhost:5000/api/appointments/detach/${patientId}`);
      setSuccessMessage('File removed successfully!');
      setTimeout(() => setSuccessMessage(''), 2000);
      await fetchQueueData();
    } catch (err) {
      console.error('File remove error:', err);
      alert('File remove nahi ho saki.');
    } finally {
      setUploadingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    window.location.href = '/login';
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .auto-popup {
          animation: fadeInOut 2s ease-in-out forwards;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translate(-50%, -55%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>

      {successMessage && (
        <div className="auto-popup" style={styles.popupBox}>
          <span>✅ {successMessage}</span>
        </div>
      )}

      {/* Top Banner with dropdown + Logout button */}
      <div style={styles.topPanel}>
        <h2 style={styles.panelTitle}>TRP Panel</h2>
        <div style={styles.topRightControls}>
          <select
            style={styles.countDropdown}
            value={dropdownValue}
            onChange={handleDropdownChange}
          >
            <option value="">Total Paid Patients: {queuePatients.length}</option>
            {queuePatients.map((patient) => (
              <option key={patient.id || patient._id} value={patient.id || patient._id}>
                {patient.mrId ? `[${patient.mrId}] ` : ''}{patient.firstName} {patient.lastName} ({patient.doctorName})
              </option>
            ))}
          </select>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* Right Side: Paid Patient List */}
      <div style={styles.pageLayout}>
        <div style={styles.rightPatientList}>
          <div style={styles.sidebarHeader}>Paid Patients List</div>
          <div style={styles.patientListContainer}>
            {queuePatients.length === 0 ? (
              <p style={styles.noPatientText}>No paid patients available.</p>
            ) : (
              queuePatients.map((patient, index) => {
                const patientId = patient.id || patient._id;
                const isUploading = uploadingId === patientId;
                const hasFile = Boolean(patient.attachedFile);

                return (
                  <div key={patientId} style={styles.patientCard}>
                    <div style={styles.patientInfo}>
                      <span style={styles.patientIndex}>{index + 1}.</span>
                      <div>
                        <div style={styles.patientName}>
                          {patient.mrId ? `[${patient.mrId}] ` : ''}{patient.firstName} {patient.lastName}
                        </div>
                        <div style={styles.patientDoc}>Doc: {patient.doctorName}</div>
                        {hasFile && <div style={styles.fileTag}>📎 File Attached</div>}
                      </div>
                    </div>

                    <div style={styles.rowButtons}>
                      <input
                        type="file"
                        ref={(el) => (fileInputRefs.current[patientId] = el)}
                        onChange={(e) => handleFileSelect(e, patient)}
                        style={{ display: 'none' }}
                      />
                      
                      {hasFile ? (
                        <button
                          onClick={() => handleRemoveFile(patient)}
                          disabled={isUploading}
                          style={styles.removeFileButtonSmall}
                          title="Remove attached file"
                        >
                          {isUploading ? '...' : 'Remove File'}
                        </button>
                      ) : (
                        <button
                          onClick={() => triggerFilePicker(patientId)}
                          disabled={isUploading}
                          style={styles.attachButton}
                        >
                          {isUploading ? 'Uploading...' : '📎 Attach'}
                        </button>
                      )}

                      <button
                        onClick={() => openVitals(patient)}
                        style={styles.actionButton}
                      >
                        Add Vitals
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Vitals Slip Modal */}
      {selectedQueuePatient && (
        <div style={styles.modalOverlay} onClick={closeVitalsPanel}>
          <div style={styles.slipBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.slipHeader}>
              <span>Vitals Slip: <strong style={{ color: '#2563eb' }}>{selectedQueuePatient.firstName} {selectedQueuePatient.lastName}</strong></span>
              <button onClick={closeVitalsPanel} style={styles.closeBtn}>✕</button>
            </div>

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

              <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                <label style={styles.label}>Pulse (bpm)</label>
                <input type="text" name="pulse" value={trpData.pulse} onChange={handleTrpChange} placeholder="e.g. 72" style={styles.inputField} required />
              </div>

              <div style={{ gridColumn: 'span 2', marginTop: '4px', display: 'flex', gap: '8px' }}>
                <button type="button" onClick={closeVitalsPanel} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>Send to Doctor Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

const styles = {
  container: {
    padding: '8px 12px',
    backgroundColor: '#f1f5f9',
    height: '100vh',
    maxHeight: '100vh',
    boxSizing: 'border-box',
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflow: 'hidden',
  },
  topPanel: {
    backgroundColor: '#ffffff',
    padding: '8px 14px',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #bfdbfe',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    flexShrink: 0,
  },
  panelTitle: {
    margin: '0',
    fontSize: '14px',
    color: '#1e3a8a',
    fontWeight: 'bold',
  },
  topRightControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  countDropdown: {
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    padding: '5px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    border: '1px solid #bfdbfe',
    fontWeight: 'bold',
    maxWidth: '260px',
  },
  logoutBtn: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  pageLayout: {
    display: 'flex',
    justifyContent: 'flex-end',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  rightPatientList: {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1.5px solid #93c5fd',
    display: 'flex',
    flexDirection: 'column',
    padding: '8px',
    boxSizing: 'border-box',
    width: '360px',
    maxWidth: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  sidebarHeader: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    paddingBottom: '6px',
    marginBottom: '6px',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  patientListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    overflowY: 'auto',
    flex: 1,
  },
  noPatientText: {
    color: '#94a3b8',
    fontSize: '10.5px',
    textAlign: 'center',
    margin: 'auto',
  },
  patientCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    gap: '4px',
  },
  patientInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    overflow: 'hidden',
  },
  patientIndex: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#64748b',
  },
  patientName: {
    fontSize: '10.5px',
    fontWeight: 'bold',
    color: '#1e293b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '120px',
  },
  patientDoc: {
    fontSize: '9px',
    color: '#475569',
  },
  fileTag: {
    fontSize: '8.5px',
    color: '#059669',
    fontWeight: 'bold',
    marginTop: '2px',
  },
  rowButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    alignItems: 'flex-end',
  },
  actionButton: {
    padding: '4px 8px',
    borderRadius: '3px',
    border: 'none',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    backgroundColor: '#2563eb',
  },
  attachButton: {
    padding: '3px 8px',
    borderRadius: '3px',
    border: '1px solid #93c5fd',
    color: '#1e40af',
    backgroundColor: '#eff6ff',
    fontSize: '9.5px',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  removeFileButtonSmall: {
    padding: '3px 8px',
    borderRadius: '3px',
    border: '1px solid #fca5a5',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    fontSize: '9.5px',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    zIndex: 999,
  },
  slipBox: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1.5px solid #93c5fd',
    padding: '14px 16px',
    width: '380px',
    maxWidth: '90%',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
    zIndex: 1000,
    animation: 'modalFadeIn 0.15s ease-out',
  },
  slipHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    paddingBottom: '8px',
    marginBottom: '8px',
    borderBottom: '1px solid #e2e8f0',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '14px',
    color: '#64748b',
    cursor: 'pointer',
    lineHeight: 1,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginTop: '6px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  label: {
    fontSize: '10px',
    color: '#334155',
    fontWeight: 'bold',
  },
  inputField: {
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    padding: '5px 8px',
    color: '#000000',
    fontSize: '11px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    flex: 1,
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  cancelBtn: {
    backgroundColor: '#e2e8f0',
    color: '#334155',
    border: 'none',
    borderRadius: '4px',
    padding: '8px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    flex: 1,
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
  }
};

export default TrpPanel;