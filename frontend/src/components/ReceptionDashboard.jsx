import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ReceptionDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // ---- Lab Slip modal state ----
  const [selectedLabPatient, setSelectedLabPatient] = useState(null);
  const [labFormData, setLabFormData] = useState({ fee: '', remarks: '' });
  const [labSaving, setLabSaving] = useState(false);

  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [allPatientsDate, setAllPatientsDate] = useState(getTodayDateStr());

  const doctorOptions = [
    { name: 'Dr. Ahmed', specialty: 'Cardiologist', fee: 1500 },
    { name: 'Dr. Sara Khan', specialty: 'Neurologist', fee: 2000 },
    { name: 'Dr. Bilal', specialty: 'Orthopedic Surgeon', fee: 1800 },
  ];

  const [formData, setFormData] = useState({
    mrId: '',
    firstName: '',
    lastName: '',
    gender: 'Male',
    cnic: '',
    age: '',
    phone: '',
    doctorName: 'Dr. Ahmed',
    department: 'General Medicine',
    fee: 1500,
    remark: ''
  });

  // ---- Keyboard Shortcuts Effect ----
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt + N: Focus on First Name field in Data Entry Form (Browser safe)
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const firstNameInput = document.getElementById('rc-firstname-input');
        if (firstNameInput) {
          firstNameInput.focus();
          firstNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return false;
      }

      // Ctrl + F: Focus on All Patients Search Box
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const searchInput = document.getElementById('rc-search-input');
        if (searchInput) {
          searchInput.focus();
        }
        return false;
      }

      // Escape: Close Lab Slip Modal if open
      if (e.key === 'Escape') {
        closeLabSlip();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [selectedLabPatient]);

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/appointments');

      const updatedData = response.data.map(item => ({
        ...item,
        appointmentDate: item.appointmentDate
          ? item.appointmentDate.split('T')[0]
          : (item.createdAt ? item.createdAt.split('T')[0] : null),
        paymentStatus: item.paymentStatus || 'Unpaid',
        actionStatus: item.actionStatus || 'Pending'
      }));
      setPatients(updatedData);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDoctorChange = (e) => {
    const selectedDoc = doctorOptions.find(d => d.name === e.target.value);
    setFormData({
      ...formData,
      doctorName: e.target.value,
      fee: selectedDoc ? selectedDoc.fee : formData.fee
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const registrationData = {
        ...formData,
        mobileNumber: formData.phone,
        appointmentDate: allPatientsDate
      };

      const res = await axios.post('http://localhost:5000/api/appointments/register', registrationData);

      const newPatientItem = {
        ...(res.data.patient || res.data),
        ...formData,
        appointmentDate: allPatientsDate,
        paymentStatus: 'Unpaid',
        actionStatus: 'Pending',
        _id: res.data._id || res.data.id || Date.now()
      };

      setPatients(prev => [newPatientItem, ...prev]);

      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2000);

      setFormData({
        mrId: '',
        firstName: '',
        lastName: '',
        gender: 'Male',
        cnic: '',
        age: '',
        phone: '',
        doctorName: 'Dr. Ahmed',
        department: 'General Medicine',
        fee: 1500,
        remark: ''
      });
    } catch (err) {
      console.error('Registration error:', err);
      alert('Failed to register patient');
    }
  };

  const handleStatusChange = async (patientId, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/appointments/status/${patientId}`, {
        paymentStatus: newStatus
      });

      setPatients(prev => prev.map(p => {
        if ((p.id || p._id) === patientId) {
          return { ...p, paymentStatus: newStatus };
        }
        return p;
      }));
    } catch (err) {
      console.error('Failed to update status in database:', err);
      alert('Could not update status');
    }
  };

  const matchesSelectedDate = (p) => {
    const rawDate = p.appointmentDate;
    if (!rawDate) return false;
    const pDateStr = String(rawDate).split('T')[0];
    return pDateStr === allPatientsDate;
  };

  const filteredPatients = patients
    .filter(p => matchesSelectedDate(p))
    .filter(p => {
      const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
      const mrId = (p.mrId || '').toLowerCase();
      const phone = (p.phone || p.mobileNumber || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return fullName.includes(query) || mrId.includes(query) || phone.includes(query);
    });

  const queueList = patients.filter(p => matchesSelectedDate(p) && p.paymentStatus === 'Paid' && (!p.actionStatus || p.actionStatus === 'Pending'));

  const labSlipList = patients
    .filter(p => p.labTests && String(p.labTests).trim() !== '')
    .filter(p => {
      const q = labSearchQuery.toLowerCase();
      if (!q) return true;
      const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
      const mrId = (p.mrId || '').toLowerCase();
      const phone = (p.phone || p.mobileNumber || '').toLowerCase();
      return fullName.includes(q) || mrId.includes(q) || phone.includes(q);
    });

  const openLabSlip = (p) => {
    setSelectedLabPatient(p);
    setLabFormData({
      fee: p.labFee !== undefined && p.labFee !== null && p.labFee !== '' ? p.labFee : (p.fee || ''),
      remarks: p.labRemarks || ''
    });
  };

  const closeLabSlip = () => {
    setSelectedLabPatient(null);
    setLabFormData({ fee: '', remarks: '' });
  };

  const handleLabFormChange = (e) => {
    setLabFormData({ ...labFormData, [e.target.name]: e.target.value });
  };

  const handleSaveLabSlip = async () => {
    if (!selectedLabPatient) return;
    const patientId = selectedLabPatient.id || selectedLabPatient._id;
    setLabSaving(true);
    try {
      await axios.put(`http://localhost:5000/api/appointments/lab/${patientId}`, {
        labFee: labFormData.fee,
        labRemarks: labFormData.remarks
      });
    } catch (err) {
      console.warn('Lab slip save failed:', err);
    }

    setPatients(prev => prev.map(p => {
      if ((p.id || p._id) === patientId) {
        return { ...p, labFee: labFormData.fee, labRemarks: labFormData.remarks };
      }
      return p;
    }));
    setLabSaving(false);
    closeLabSlip();
  };

  const formatPhone = (p) => {
    const num = p.phone || p.mobileNumber;
    if (!num || num === '0000000' || num === '0') return 'N/A';
    return num;
  };

  return (
    <div className="rd-container" style={styles.container}>
      <style>{`
        .rd-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          box-sizing: border-box;
          flex: 1;
          min-height: 0;
        }
        .rd-column {
          display: flex;
          flex-direction: column;
          gap: 8px;
          height: 100%;
          min-height: 0;
        }
        @media (max-width: 900px) {
          .rd-container {
            height: auto !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
          .rd-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
          .rd-column {
            height: auto;
          }
          .rd-column > div {
            height: auto !important;
            min-height: 220px;
          }
        }
      `}</style>

      {showSuccessToast && (
        <div style={styles.toast}>
          ✅ Patient Registered Successfully!
        </div>
      )}

      <div style={styles.topBanner}>
        <div>
          <h2 style={styles.bannerTitle}>Reception Dashboard</h2>
          <p style={styles.bannerSubtitle}>
            Manage patient registrations, queue flow, and billing seamlessly. 
            <span style={{color: '#2563eb', marginLeft: '8px'}}>💡 Shortcuts: Alt+N (New Entry), Ctrl+F (Search)</span>
          </p>
        </div>
      </div>

      <div className="rd-grid">
        {/* Column 1: All Patients & Lab Slip */}
        <div className="rd-column">
          <div style={styles.cardBoxTall}>
            <div style={styles.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={styles.headerText}>All Patients</span>
                <input
                  type="date"
                  value={allPatientsDate}
                  onChange={(e) => setAllPatientsDate(e.target.value)}
                  style={styles.boxDatePicker}
                />
              </div>
              <input
                id="rc-search-input"
                type="text"
                placeholder="Search Name, MR, Phone (Ctrl+F)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...styles.searchBoxInput, width: '135px' }}
              />
            </div>
            <div style={styles.contentListTall}>
              {filteredPatients.length === 0 ? (
                <p style={styles.placeholderText}>No patients found for this date.</p>
              ) : (
                filteredPatients.map((p, index) => {
                  const pId = p.id || p._id;
                  const isPaid = p.paymentStatus === 'Paid';

                  return (
                    <div key={pId} style={styles.itemCard}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#64748b', minWidth: '18px' }}>
                          {index + 1}.
                        </span>
                        <div>
                          <strong
                            style={{ cursor: 'pointer', color: '#1e40af' }}
                            onClick={() => setSelectedPatient(p)}
                          >
                            {p.mrId ? `[${p.mrId}] ` : ''}{p.firstName} {p.lastName}
                          </strong>
                          <div style={{ fontSize: '10px', color: '#475569' }}>
                            Phone: {formatPhone(p)} | {p.doctorName}
                          </div>
                          <div style={{ fontSize: '10px', color: '#475569' }}>
                            Status: <span style={{ color: '#0f766e', fontWeight: 'bold' }}>{p.actionStatus || 'Pending'}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <select
                          value={p.paymentStatus || 'Unpaid'}
                          onChange={(e) => handleStatusChange(pId, e.target.value)}
                          style={{
                            ...styles.statusDropdown,
                            backgroundColor: isPaid ? '#dcfce7' : '#fee2e2',
                            color: isPaid ? '#166534' : '#991b1b',
                            borderColor: isPaid ? '#86efac' : '#fca5a5',
                          }}
                        >
                          <option value="Paid">✓ Paid</option>
                          <option value="Unpaid">Unpaid</option>
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Lab Slip / Tests box */}
          <div style={styles.cardBoxShort}>
            <div style={styles.cardHeader}>
              <span style={styles.headerText}>Lab Slip / Tests</span>
              <input
                type="text"
                placeholder="MR / Name / Phone"
                value={labSearchQuery}
                onChange={(e) => setLabSearchQuery(e.target.value)}
                style={{ ...styles.searchBoxInput, width: '135px' }}
              />
            </div>
            <div style={styles.contentListShort}>
              {labSlipList.length === 0 ? (
                <p style={styles.placeholderText}>No lab tests found.</p>
              ) : (
                labSlipList.map((l, index) => {
                  const lId = l.id || l._id;
                  return (
                    <div
                      key={lId}
                      style={{ ...styles.itemCard, cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}
                      onClick={() => openLabSlip(l)}
                    >
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#64748b' }}>{index + 1}.</span>
                        <strong style={{ color: '#1e40af' }}>
                          {l.mrId ? `[${l.mrId}] ` : ''}{l.firstName} {l.lastName}
                        </strong>
                      </div>
                      <div style={{ fontSize: '10px', color: '#1e3a8a', fontWeight: '600', paddingLeft: '20px' }}>
                        🧪 {l.labTests}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Paid Queue & Extra Box */}
        <div className="rd-column">
          <div style={styles.cardBoxTallFull}>
            <div style={styles.cardHeader}>
              <span style={styles.headerText}>Paid Appointment + Queue</span>
            </div>
            <div style={styles.contentListTall}>
              {queueList.length === 0 ? (
                <p style={styles.placeholderText}>No active queue.</p>
              ) : (
                queueList.map((q, index) => {
                  const tokenNum = `Q${String(index + 1).padStart(4, '0')}`;
                  return (
                    <div key={index} style={styles.itemCard}>
                      <div><strong>{tokenNum}</strong> - {q.mrId ? `[${q.mrId}] ` : ''}{q.firstName}</div>
                      <span style={styles.badgeQueue}>{q.doctorName}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={styles.cardBoxShort}>
            <div style={styles.cardHeaderClean}>
              <span style={styles.headerText}>Extra</span>
            </div>
            <div style={styles.contentListShort}>
              <p style={styles.placeholderText}>No data yet.</p>
            </div>
          </div>
        </div>

        {/* Column 3: Data Entry Form */}
        <div className="rd-column">
          <div style={styles.cardBoxForm}>
            <div style={styles.cardHeader}>
              <span style={styles.headerText}>Data Entry</span>
            </div>
            <form onSubmit={handleRegister} style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>MR ID</label>
                <input type="text" name="mrId" value={formData.mrId} onChange={handleInputChange} placeholder="Auto" style={styles.inputField} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>First Name</label>
                <input 
                  id="rc-firstname-input"
                  type="text" 
                  name="firstName" 
                  value={formData.firstName} 
                  onChange={handleInputChange} 
                  placeholder="First name (Alt+N)" 
                  required 
                  style={styles.inputField} 
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Last Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Last name" style={styles.inputField} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Phone no" style={styles.inputField} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Gender</label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} style={styles.inputField}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Age</label>
                <input type="number" name="age" value={formData.age} onChange={handleInputChange} placeholder="Age" style={styles.inputField} />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={styles.label}>Assigned Doctor</label>
                <select name="doctorName" value={formData.doctorName} onChange={handleDoctorChange} style={styles.inputField}>
                  {doctorOptions.map((doc) => (
                    <option key={doc.name} value={doc.name}>
                      {doc.name} ({doc.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Fee</label>
                <input type="number" name="fee" value={formData.fee} onChange={handleInputChange} placeholder="Fee" style={styles.inputField} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Remarks</label>
                <input type="text" name="remark" value={formData.remark} onChange={handleInputChange} placeholder="Remarks" style={styles.inputField} />
              </div>

              <div style={{ gridColumn: 'span 2', marginTop: '6px' }}>
                <button type="submit" style={styles.submitBtn}>Register Patient</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ---- Lab Slip Modal ---- */}
      {selectedLabPatient && (
        <div style={styles.modalOverlay} onClick={closeLabSlip}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>Lab Slip</span>
              <button onClick={closeLabSlip} style={styles.modalCloseBtn}>✕</button>
            </div>

            <div style={styles.modalPatientInfo}>
              <strong>{selectedLabPatient.mrId ? `[${selectedLabPatient.mrId}] ` : ''}{selectedLabPatient.firstName} {selectedLabPatient.lastName}</strong>
              <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                Phone: {formatPhone(selectedLabPatient)} · Doctor: {selectedLabPatient.doctorName || 'N/A'}
              </div>
            </div>

            <div style={styles.modalSection}>
              <label style={styles.label}>Tests </label>
              <div style={styles.testsBox}>
                🧪 {selectedLabPatient.labTests || 'N/A'}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Fee </label>
              <input
                type="number"
                name="fee"
                value={labFormData.fee}
                onChange={handleLabFormChange}
                placeholder="Fee likhein..."
                style={styles.inputField}
              />
            </div>

            <div style={styles.modalSection}>
              <label style={styles.label}>Remarks </label>
              <textarea
                name="remarks"
                value={labFormData.remarks}
                onChange={handleLabFormChange}
                placeholder="Remarks..."
                rows="3"
                style={styles.textareaField}
              />
            </div>

            <div style={styles.modalActions}>
              <button onClick={handleSaveLabSlip} disabled={labSaving} style={styles.saveBtn}>
                {labSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
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
    boxSizing: 'border-box',
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  toast: {
    position: 'fixed',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#16a34a',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 'bold',
    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
    zIndex: 9999,
  },
  topBanner: {
    backgroundColor: '#ffffff',
    padding: '8px 14px',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    border: '1px solid #bfdbfe',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    flex: '0 0 auto',
  },
  bannerTitle: {
    margin: '0 0 2px 0',
    fontSize: '15px',
    color: '#1e3a8a',
    fontWeight: 'bold',
  },
  bannerSubtitle: {
    margin: '0',
    fontSize: '10.5px',
    color: '#64748b',
  },
  boxDatePicker: {
    padding: '1px 4px',
    borderRadius: '3px',
    border: '1px solid #cbd5e1',
    fontSize: '9.5px',
    backgroundColor: '#f8fafc',
    color: '#1e3a8a',
    fontWeight: 'bold',
    cursor: 'pointer',
    outline: 'none',
  },
  cardBoxTall: {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    padding: '10px',
    flex: '1.4 1 0%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    border: '1.5px solid #93c5fd',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  cardBoxTallFull: {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    padding: '10px',
    flex: '1.4 1 0%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    border: '1.5px solid #93c5fd',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  cardBoxShort: {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    padding: '10px',
    flex: '1 1 0%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    border: '1.5px solid #93c5fd',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  cardBoxForm: {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    padding: '12px',
    flex: '1 1 0%',
    minHeight: 0,
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
    paddingBottom: '6px',
    marginBottom: '6px',
    borderBottom: '1px solid #e2e8f0',
    flex: '0 0 auto',
  },
  cardHeaderClean: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '2px',
    marginBottom: '6px',
    borderBottom: 'none',
    flex: '0 0 auto',
  },
  headerText: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  searchBoxInput: {
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    padding: '2px 6px',
    color: '#000000',
    fontSize: '10px',
    width: '75px',
    outline: 'none',
  },
  contentListTall: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    overflowY: 'auto',
    flex: 1,
    minHeight: 0,
  },
  contentListShort: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    overflowY: 'auto',
    flex: 1,
    minHeight: 0,
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: '10.5px',
    textAlign: 'center',
    margin: 'auto',
  },
  itemCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    backgroundColor: '#f8fafc',
    borderRadius: '4px',
    fontSize: '10.5px',
    border: '1px solid #e2e8f0',
  },
  statusDropdown: {
    padding: '3px 5px',
    borderRadius: '4px',
    fontSize: '9.5px',
    fontWeight: 'bold',
    border: '1px solid',
    cursor: 'pointer',
    outline: 'none',
  },
  badgeQueue: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '9.5px',
    fontWeight: 'bold',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  label: {
    fontSize: '10.5px',
    fontWeight: '600',
    color: '#334155',
  },
  inputField: {
    padding: '5px 7px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    fontSize: '11px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textareaField: {
    padding: '5px 7px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    fontSize: '11px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
    fontFamily: 'inherit',
    resize: 'none',
  },
  submitBtn: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#1d4ed8',
    color: '#ffffff',
    border: 'none',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    width: '340px',
    maxWidth: '92vw',
    maxHeight: '88vh',
    overflowY: 'auto',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '8px',
    marginBottom: '10px',
  },
  modalTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  modalCloseBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#64748b',
  },
  modalPatientInfo: {
    backgroundColor: '#eff6ff',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #bfdbfe',
    marginBottom: '10px',
    fontSize: '12px',
    color: '#1e293b',
  },
  modalSection: {
    marginBottom: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  testsBox: {
    padding: '8px',
    backgroundColor: '#f8fafc',
    borderRadius: '5px',
    border: '1px solid #e2e8f0',
    fontSize: '11px',
    color: '#1e3a8a',
    fontWeight: '600',
  },
  modalActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  saveBtn: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    fontSize: '11.5px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

export default ReceptionDashboard;