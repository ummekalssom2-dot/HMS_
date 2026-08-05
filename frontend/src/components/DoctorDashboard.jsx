import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DoctorDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState('Dr. Ahmed');

  const [consultForm, setConsultForm] = useState({
    medicines: '',
    labTests: '',
    notes: ''
  });

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 4000);
    return () => clearInterval(interval);
  }, [selectedDoctor]);

  const fetchQueue = async () => {
    try {
      const url = `http://localhost:5000/api/appointments?doctor=${encodeURIComponent(selectedDoctor)}`;
      const response = await axios.get(url);

      const queueData = response.data.map(item => ({
        ...item,
        actionStatus: item.actionStatus || 'Pending'
      }));
      setPatients(queueData);
    } catch (err) {
      console.error('Error fetching queue:', err);
    }
  };

  const handleCallPatient = async (patient) => {
    try {
      const patientId = patient.id || patient._id;
      await axios.put(`http://localhost:5000/api/appointments/call/${patientId}`, {
        actionStatus: 'In Consultation'
      });

      setCurrentPatient(patient);
      setConsultForm({ medicines: '', labTests: '', notes: '' });
      fetchQueue();
    } catch (err) {
      console.error('Error calling patient:', err);
      alert('Could not call patient');
    }
  };

  const handleInputChange = (e) => {
    setConsultForm({ ...consultForm, [e.target.name]: e.target.value });
  };

  const handleActionUpdate = async (newAction) => {
    if (!currentPatient) return;
    try {
      const patientId = currentPatient.id || currentPatient._id;
      
      // Backend update (agar API exist karti hai)
      try {
        await axios.put(`http://localhost:5000/api/appointments/action/${patientId}`, {
          actionStatus: newAction,
          medicines: consultForm.medicines,
          labTests: consultForm.labTests,
          notes: consultForm.notes
        });
      } catch (apiErr) {
        console.warn('Backend action API warning:', apiErr);
      }

      // Sync to Disposed Patients in localStorage for TRP Disposal Panel
      const disposedItem = {
        ...currentPatient,
        doctorName: selectedDoctor,
        medicines: consultForm.medicines,
        labTests: consultForm.labTests,
        notes: consultForm.notes,
        disposition: newAction === 'Completed' ? 'Discharged / Go to Home' : newAction === 'Admit' ? 'Admitted' : 'Referred'
      };

      const existingDisposed = JSON.parse(localStorage.getItem('disposedPatients') || '[]');
      localStorage.setItem('disposedPatients', JSON.stringify([disposedItem, ...existingDisposed]));

      alert(`Patient status updated to: ${newAction} and sent to Disposal Panel.`);
      setCurrentPatient(null);
      setConsultForm({ medicines: '', labTests: '', notes: '' });
      fetchQueue();
    } catch (err) {
      console.error('Error updating action:', err);
      alert('Failed to update status');
    }
  };

  const queueList = patients.filter(p => p.paymentStatus === 'Paid' && p.actionStatus === 'Pending');

  return (
    <div style={styles.container}>
      <div style={styles.headerBanner}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={styles.headerTitle}>Doctor Dashboard</h2>
            <p style={styles.headerSubtitle}>Consultation Room · Select your room to manage your queue</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              style={styles.doctorSelect}
            >
              <option value="Dr. Ahmed">Dr. Ahmed — Room 1</option>
              <option value="Dr. Sara Khan">Dr. Sara Khan — Room 2</option>
              <option value="Dr. Bilal">Dr. Bilal — Room 3</option>
            </select>
            <button style={styles.logoutBtn}>Logout</button>
          </div>
        </div>
      </div>

      <div style={styles.gridContainer}>

        {/* Left Side: Patient Queue */}
        <div style={styles.column}>
          <div style={styles.boxMain}>
            <div style={styles.boxHeaderRow}>
              <h3 style={styles.boxTitle}>Queue</h3>
              <span style={styles.countPill}>{queueList.length}</span>
            </div>
            <div style={styles.contentList}>
              {queueList.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={styles.placeholderText}>No patients waiting in your room.</p>
                </div>
              ) : (
                queueList.map((q, index) => (
                  <div key={index} style={styles.queueItem}>
                    <div>
                      <div style={styles.queueTopRow}>
                        <span style={styles.queueNumber}>{q.queueNumber || `Q00${index + 1}`}</span>
                        {q.mrId && <span style={styles.mrTag}>{q.mrId}</span>}
                      </div>
                      <div style={styles.queueName}>{q.firstName} {q.lastName}</div>
                      <div style={styles.queuePhone}>{q.mobileNumber}</div>
                    </div>
                    <button onClick={() => handleCallPatient(q)} style={styles.callBtn}>Call</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Active Consultation Room */}
        <div style={styles.columnWide}>
          <div style={styles.boxMain}>
            <h3 style={styles.boxTitle}>Active Consultation — {selectedDoctor}</h3>

            {currentPatient ? (
              <div style={styles.consultBox}>

                <div style={styles.patientInfoCard}>
                  <p style={styles.patientName}>
                    {currentPatient.mrId ? `[${currentPatient.mrId}] ` : ''}{currentPatient.firstName} {currentPatient.lastName}
                  </p>
                  <p style={styles.patientMeta}>
                    CNIC: {currentPatient.cnic || 'N/A'}   ·   Phone: {currentPatient.mobileNumber}
                  </p>
                </div>

                <div style={styles.fieldsGrid}>
                  <div style={styles.subSection}>
                    <label style={styles.subSectionTitle}>Medicines / Prescription</label>
                    <textarea
                      rows="3"
                      name="medicines"
                      value={consultForm.medicines}
                      onChange={handleInputChange}
                      placeholder="Write medicines here..."
                      style={styles.textarea}
                    ></textarea>
                  </div>

                  <div style={styles.subSection}>
                    <label style={styles.subSectionTitle}>Lab Tests Recommendation</label>
                    <input
                      type="text"
                      name="labTests"
                      value={consultForm.labTests}
                      onChange={handleInputChange}
                      placeholder="e.g. CBC, Lipid Profile, Ultrasound"
                      style={styles.inputField}
                    />
                  </div>

                  <div style={styles.subSection}>
                    <label style={styles.subSectionTitle}>Doctor Notes / Advice</label>
                    <textarea
                      rows="3"
                      name="notes"
                      value={consultForm.notes}
                      onChange={handleInputChange}
                      placeholder="General advice or follow-up instructions..."
                      style={styles.textarea}
                    ></textarea>
                  </div>
                </div>

                <div style={styles.actionButtonsRow}>
                  <button onClick={() => handleActionUpdate('Completed')} style={styles.dischargeBtn}>Send Home / Discharge</button>
                  <button onClick={() => handleActionUpdate('Admit')} style={styles.admitBtn}>Admit Patient</button>
                  <button onClick={() => handleActionUpdate('Operation')} style={styles.opBtn}>Operation / Refer</button>
                </div>

              </div>
            ) : (
              <div style={styles.emptyState}>
                <p style={styles.placeholderText}>No patient currently called.<br />Click "Call" from the queue to start a consultation.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '14px 18px',
    backgroundColor: '#f1f5f9',
    height: '100vh',
    maxHeight: '100vh',
    boxSizing: 'border-box',
    fontFamily: "'Segoe UI', Arial, sans-serif",
    overflow: 'hidden',
  },
  headerBanner: {
    backgroundColor: '#1e3a8a',
    color: '#fff',
    padding: '12px 18px',
    borderRadius: '8px',
    marginBottom: '14px',
    boxShadow: '0 2px 6px rgba(30,58,138,0.25)',
  },
  headerTitle: {
    margin: '0',
    fontSize: '18px',
    fontWeight: '600',
  },
  headerSubtitle: {
    margin: '3px 0 0 0',
    fontSize: '12px',
    color: '#bfdbfe',
  },
  doctorSelect: {
    padding: '7px 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#fff',
    color: '#1e3a8a',
    cursor: 'pointer',
  },
  logoutBtn: {
    padding: '7px 14px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#dc2626',
    color: '#fff',
    cursor: 'pointer',
  },
  gridContainer: {
    display: 'flex',
    gap: '14px',
    height: 'calc(100vh - 84px)',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  column: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  columnWide: {
    flex: '1.4',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  boxMain: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '14px 16px',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  boxHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '8px',
    marginBottom: '10px',
  },
  boxTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '700',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '8px',
  },
  countPill: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 9px',
    borderRadius: '999px',
  },
  contentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflowY: 'auto',
    flex: 1,
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    textAlign: 'center',
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: '12.5px',
    lineHeight: '1.5',
    margin: 0,
  },
  queueItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '9px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '7px',
    fontSize: '12px',
    border: '1px solid #e2e8f0',
  },
  queueTopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  queueNumber: {
    color: '#1e3a8a',
    fontWeight: '700',
    fontSize: '11.5px',
  },
  mrTag: {
    fontSize: '10px',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    padding: '1px 6px',
    borderRadius: '4px',
    fontWeight: '600',
  },
  queueName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e293b',
    marginTop: '2px',
  },
  queuePhone: {
    fontSize: '10.5px',
    color: '#64748b',
    marginTop: '1px',
  },
  callBtn: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '5px',
    fontSize: '11.5px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  consultBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
    overflowY: 'auto',
  },
  patientInfoCard: {
    backgroundColor: '#eff6ff',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #bfdbfe',
  },
  patientName: {
    margin: 0,
    fontSize: '13.5px',
    color: '#1e3a8a',
    fontWeight: '700',
  },
  patientMeta: {
    margin: '3px 0 0 0',
    fontSize: '11px',
    color: '#475569',
  },
  fieldsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  subSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  subSectionTitle: {
    fontSize: '11.5px',
    color: '#334155',
    fontWeight: '600',
  },
  textarea: {
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '12px',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'none',
    fontFamily: 'inherit',
  },
  inputField: {
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '12px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  actionButtonsRow: {
    display: 'flex',
    gap: '8px',
    marginTop: 'auto',
    paddingTop: '6px',
  },
  dischargeBtn: {
    flex: '1',
    padding: '9px',
    backgroundColor: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  admitBtn: {
    flex: '1',
    padding: '9px',
    backgroundColor: '#d97706',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  opBtn: {
    flex: '1',
    padding: '9px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  }
};

export default DoctorDashboard;