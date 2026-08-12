import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ReceptionDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastRegisteredMrId, setLastRegisteredMrId] = useState('');

  // ---- Logout Modal State ----
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ---- Calculator State ----
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('0');

  // ---- Single Dropdown Selection & Popup State ----
  const [selectedReportType, setSelectedReportType] = useState('appt'); 
  const [activePaymentModal, setActivePaymentModal] = useState(null); 

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
    address: '',
    doctorName: 'Dr. Ahmed',
    department: 'General Medicine',
    fee: 1500,
    discount: '',
    cashGiven: '',
    bookingType: 'Walk-in',
    callReference: ''
  });

  const generateNextMrIdFromList = (currentPatientsList) => {
    if (!currentPatientsList || currentPatientsList.length === 0) {
      return 'MR-2026-0001';
    }

    let maxNum = 0;
    currentPatientsList.forEach(p => {
      if (p.mrId && typeof p.mrId === 'string') {
        const parts = p.mrId.split('-');
        const numStr = parts[parts.length - 1];
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    return `MR-2026-${String(nextNum).padStart(4, '0')}`;
  };

  // Calculator Functions
  const handleCalcClick = (val) => {
    if (calcInput === '0' || calcInput === 'Error') {
      setCalcInput(val);
    } else {
      setCalcInput(calcInput + val);
    }
  };

  const handleCalcClear = () => {
    setCalcInput('0');
  };

  const handleCalcEvaluate = () => {
    try {
      // eslint-disable-next-line no-eval
      const result = eval(calcInput);
      setCalcInput(String(result));
    } catch (err) {
      setCalcInput('Error');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const firstNameInput = document.getElementById('rc-firstname-input');
        if (firstNameInput) {
          firstNameInput.focus();
          firstNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('rc-search-input');
        if (searchInput) searchInput.focus();
      }

      if (e.key === 'Escape') {
        closeLabSlip();
        setShowLogoutModal(false);
        setActivePaymentModal(null);
        setShowCalculator(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

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
      
      setFormData(prev => {
        if (!prev.mrId) {
          return { ...prev, mrId: generateNextMrIdFromList(updatedData) };
        }
        return prev;
      });
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
      const netFee = (Number(formData.fee) || 0) - (Number(formData.discount) || 0);
      const cashGivenNum = formData.cashGiven !== '' && !isNaN(formData.cashGiven) ? Number(formData.cashGiven) : netFee;
      const returnChange = cashGivenNum > netFee ? cashGivenNum - netFee : 0;

      const registrationData = {
        ...formData,
        mobileNumber: formData.phone,
        appointmentDate: allPatientsDate,
        netFee: netFee,
        cashGiven: cashGivenNum,
        returnChange: returnChange
      };

      const res = await axios.post('http://localhost:5000/api/appointments/register', registrationData);

      const generatedMrId =
        res.data.mrId ||
        (res.data.patient && res.data.patient.mrId) ||
        formData.mrId ||
        'N/A';

      const newPatientItem = {
        ...(res.data.patient || res.data),
        ...formData,
        netFee,
        cashGiven: cashGivenNum,
        returnChange,
        mrId: generatedMrId,
        appointmentDate: allPatientsDate,
        paymentStatus: 'Unpaid',
        actionStatus: 'Pending',
        _id: res.data._id || res.data.id || Date.now()
      };

      const updatedPatientsList = [newPatientItem, ...patients];
      setPatients(updatedPatientsList);

      setLastRegisteredMrId(generatedMrId);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      const nextId = generateNextMrIdFromList(updatedPatientsList);
      setFormData({
        mrId: nextId,
        firstName: '',
        lastName: '',
        gender: 'Male',
        cnic: '',
        age: '',
        phone: '',
        address: '',
        doctorName: 'Dr. Ahmed',
        department: 'General Medicine',
        fee: 1500,
        discount: '',
        cashGiven: '',
        bookingType: 'Walk-in',
        callReference: ''
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
      console.error('Failed to update status:', err);
    }
  };

  const matchesSelectedDate = (p) => {
    const rawDate = p.appointmentDate;
    if (!rawDate) return false;
    return String(rawDate).split('T')[0] === allPatientsDate;
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

  const datePatients = patients.filter(p => matchesSelectedDate(p));
  const paidDatePatients = datePatients.filter(p => p.paymentStatus === 'Paid');

  const totalAppointmentRevenue = paidDatePatients.reduce((sum, p) => {
    const fee = Number(p.fee) || 0;
    const discount = Number(p.discount) || 0;
    return sum + (fee - discount);
  }, 0);

  const labPaidPatients = datePatients.filter(p => p.labTests && String(p.labTests).trim() !== '' && p.labFee !== undefined && p.labFee !== null && p.labFee !== '');
  const totalLabRevenue = labPaidPatients.reduce((sum, p) => sum + (Number(p.labFee) || 0), 0);

  const totalReturnChangeAmount = paidDatePatients.reduce((sum, p) => {
    const net = (Number(p.fee) || 0) - (Number(p.discount) || 0);
    const given = p.cashGiven !== undefined && p.cashGiven !== null && p.cashGiven !== '' ? Number(p.cashGiven) : net;
    const change = p.returnChange !== undefined && p.returnChange !== null ? Number(p.returnChange) : (given > net ? given - net : 0);
    return sum + change;
  }, 0);

  const getSelectedDropdownAmount = () => {
    if (selectedReportType === 'appt') return totalAppointmentRevenue;
    if (selectedReportType === 'lab') return totalLabRevenue;
    if (selectedReportType === 'return') return totalReturnChangeAmount;
    return 0;
  };

  const calcNetFee = (Number(formData.fee) || 0) - (Number(formData.discount) || 0);
  const calcCashGiven = formData.cashGiven !== '' && !isNaN(formData.cashGiven) ? Number(formData.cashGiven) : calcNetFee;
  const calcReturnChange = calcCashGiven > calcNetFee ? calcCashGiven - calcNetFee : 0;

  const openLabSlip = (p) => {
    setSelectedLabPatient(p);
    setLabFormData({
      fee: p.labFee !== undefined && p.labFee !== null && p.labFee !== '' ? p.labFee : '',
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
          }
          .rd-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {showSuccessToast && (
        <div style={styles.toast}>
          ✅ Patient Registered! MR ID: {lastRegisteredMrId}
        </div>
      )}

      {/* Top Banner */}
      <div style={styles.topBanner}>
        <div>
          <h2 style={styles.bannerTitle}>Reception Dashboard</h2>
          <p style={styles.bannerSubtitle}>
            Manage patient registrations and billing seamlessly. 
            <span style={{color: '#2563eb', marginLeft: '8px'}}>💡 Shortcuts: Alt+N (New Entry), Ctrl+F (Search)</span>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Dropdown Report Box */}
          <div style={styles.dropdownReportBox}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={styles.reportLabel}>Select Report Type:</span>
              <select 
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
                style={styles.reportDropdown}
              >
                <option value="appt">📋 Total Appointment Revenue</option>
                <option value="lab">🧪 Lab Slip / Fees</option>
                <option value="return">💸 Return Change Amount</option>
              </select>
            </div>

            <span style={styles.reportAmount}>
              Rs. {getSelectedDropdownAmount()}
            </span>

            <button 
              onClick={() => setActivePaymentModal(selectedReportType)}
              style={styles.viewAllBtn}
            >
              🔍 View All
            </button>
          </div>

          {/* Calculator Button */}
          <button 
            onClick={() => setShowCalculator(true)} 
            style={styles.calcTriggerBtn}
          >
            🧮 Calculator
          </button>

          {/* Clean Logout Button */}
          <button 
            onClick={() => setShowLogoutModal(true)} 
            style={styles.logoutBtn}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="rd-grid">
        {/* Column 1 */}
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
                placeholder="Search Name, MR, Phone..."
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
                  const net = (Number(p.fee) || 0) - (Number(p.discount) || 0);
                  const given = p.cashGiven !== undefined && p.cashGiven !== null && p.cashGiven !== '' ? Number(p.cashGiven) : net;
                  const change = p.returnChange !== undefined && p.returnChange !== null ? Number(p.returnChange) : (given > net ? given - net : 0);

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
                          {isPaid && (
                            <div style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold' }}>
                              Given: Rs. {given} | Return: Rs. {change}
                            </div>
                          )}
                        </div>
                      </div>

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
                  );
                })
              )}
            </div>
          </div>

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
                        🧪 {l.labTests} {l.labFee !== undefined && l.labFee !== null && l.labFee !== '' ? `(Fee: Rs. ${l.labFee})` : ''}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Column 2 */}
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
                  const net = (Number(q.fee) || 0) - (Number(q.discount) || 0);
                  const given = q.cashGiven !== undefined && q.cashGiven !== null && q.cashGiven !== '' ? Number(q.cashGiven) : net;
                  const change = q.returnChange !== undefined && q.returnChange !== null ? Number(q.returnChange) : (given > net ? given - net : 0);

                  return (
                    <div key={index} style={{ ...styles.itemCard, flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <strong>{tokenNum}</strong> - {q.mrId ? `[${q.mrId}] ` : ''}{q.firstName}
                        <span style={styles.badgeQueue}>{q.doctorName}</span>
                      </div>
                      <div style={{ fontSize: '9.5px', color: '#166534' }}>
                        Paid: Rs. {given} | Return: <strong>Rs. {change}</strong>
                      </div>
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

        {/* Column 3 */}
        <div className="rd-column">
          <div style={styles.cardBoxForm}>
            <div style={styles.cardHeader}>
              <span style={styles.headerText}>Data Entry</span>
            </div>
            <form onSubmit={handleRegister} style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Booking Type</label>
                <select name="bookingType" value={formData.bookingType} onChange={handleInputChange} style={styles.inputField}>
                  <option value="Walk-in">Walk-in</option>
                  <option value="On-Call">On-Call</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>MR ID (Auto / Edit)</label>
                <input 
                  type="text" 
                  name="mrId" 
                  value={formData.mrId} 
                  onChange={handleInputChange} 
                  placeholder="MR ID" 
                  style={styles.inputField} 
                />
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
                <label style={styles.label}>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Patient ka address..."
                  style={styles.inputField}
                />
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
                <label style={styles.label}>Fee (Auto)</label>
                <input type="number" name="fee" value={formData.fee} readOnly style={{ ...styles.inputField, backgroundColor: '#f1f5f9', color: '#64748b' }} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Discount</label>
                <input type="number" name="discount" value={formData.discount} onChange={handleInputChange} placeholder="Discount" style={styles.inputField} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Cash Given</label>
                <input 
                  type="number" 
                  name="cashGiven" 
                  value={formData.cashGiven} 
                  onChange={handleInputChange} 
                  placeholder={`Net: ${calcNetFee}`} 
                  style={styles.inputField} 
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Return Change</label>
                <div style={{ ...styles.inputField, backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  Rs. {calcReturnChange}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2', marginTop: '6px' }}>
                <button type="submit" style={styles.submitBtn}>Register Patient</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ---- Calculator Modal ---- */}
      {showCalculator && (
        <div style={styles.modalOverlay} onClick={() => setShowCalculator(false)}>
          <div style={styles.calcModalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>🧮 Quick Calculator</span>
              <button onClick={() => setShowCalculator(false)} style={styles.modalCloseBtn}>✕</button>
            </div>
            
            <div style={styles.calcDisplay}>{calcInput}</div>

            <div style={styles.calcKeypad}>
              <button onClick={handleCalcClear} style={styles.calcBtnClear}>C</button>
              <button onClick={() => handleCalcClick('(')} style={styles.calcBtnOp}>(</button>
              <button onClick={() => handleCalcClick(')')} style={styles.calcBtnOp}>)</button>
              <button onClick={() => handleCalcClick('/')} style={styles.calcBtnOp}>÷</button>

              <button onClick={() => handleCalcClick('7')} style={styles.calcBtnNum}>7</button>
              <button onClick={() => handleCalcClick('8')} style={styles.calcBtnNum}>8</button>
              <button onClick={() => handleCalcClick('9')} style={styles.calcBtnNum}>9</button>
              <button onClick={() => handleCalcClick('*')} style={styles.calcBtnOp}>×</button>

              <button onClick={() => handleCalcClick('4')} style={styles.calcBtnNum}>4</button>
              <button onClick={() => handleCalcClick('5')} style={styles.calcBtnNum}>5</button>
              <button onClick={() => handleCalcClick('6')} style={styles.calcBtnNum}>6</button>
              <button onClick={() => handleCalcClick('-')} style={styles.calcBtnOp}>-</button>

              <button onClick={() => handleCalcClick('1')} style={styles.calcBtnNum}>1</button>
              <button onClick={() => handleCalcClick('2')} style={styles.calcBtnNum}>2</button>
              <button onClick={() => handleCalcClick('3')} style={styles.calcBtnNum}>3</button>
              <button onClick={() => handleCalcClick('+')} style={styles.calcBtnOp}>+</button>

              <button onClick={() => handleCalcClick('0')} style={{...styles.calcBtnNum, gridColumn: 'span 2'}}>0</button>
              <button onClick={() => handleCalcClick('.')} style={styles.calcBtnNum}>.</button>
              <button onClick={handleCalcEvaluate} style={styles.calcBtnEquals}>=</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- View All Popup Modal ---- */}
      {activePaymentModal && (
        <div style={styles.modalOverlay} onClick={() => setActivePaymentModal(null)}>
          <div style={styles.paymentModalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>
                {activePaymentModal === 'appt' && '📋 View All Paid Appointments'}
                {activePaymentModal === 'lab' && '🧪 View All Lab Tests & Fees'}
                {activePaymentModal === 'return' && '💸 View All Return Changes'}
              </span>
              <button onClick={() => setActivePaymentModal(null)} style={styles.modalCloseBtn}>✕</button>
            </div>

            <div style={styles.modalBodyList}>
              {activePaymentModal === 'appt' && (
                paidDatePatients.length === 0 ? <p style={styles.placeholderText}>No paid appointments for this date.</p> :
                paidDatePatients.map((p, idx) => {
                  const net = (Number(p.fee) || 0) - (Number(p.discount) || 0);
                  return (
                    <div key={idx} style={styles.paymentModalRow}>
                      <div>
                        <strong>{idx + 1}. {p.firstName} {p.lastName}</strong>
                        <div style={{ fontSize: '9.5px', color: '#64748b' }}>MR: {p.mrId} | Dr: {p.doctorName}</div>
                      </div>
                      <div style={{ fontWeight: 'bold', color: '#1e40af' }}>Rs. {net}</div>
                    </div>
                  );
                })
              )}

              {activePaymentModal === 'lab' && (
                labPaidPatients.length === 0 ? <p style={styles.placeholderText}>No lab tests found for this date.</p> :
                labPaidPatients.map((p, idx) => {
                  const lFee = Number(p.labFee) || 0;
                  return (
                    <div key={idx} style={styles.paymentModalRow}>
                      <div>
                        <strong>{idx + 1}. {p.firstName} {p.lastName}</strong>
                        <div style={{ fontSize: '9.5px', color: '#1e3a8a', fontWeight: '600' }}>
                          🧪 Test: {p.labTests || 'N/A'} {p.labRemarks ? `(${p.labRemarks})` : ''}
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748b' }}>MR: {p.mrId || 'N/A'}</div>
                      </div>
                      <div style={{ fontWeight: 'bold', color: '#059669', fontSize: '11.5px' }}>
                        Rs. {lFee}
                      </div>
                    </div>
                  );
                })
              )}

              {activePaymentModal === 'return' && (
                paidDatePatients.filter(p => {
                  const net = (Number(p.fee) || 0) - (Number(p.discount) || 0);
                  const given = p.cashGiven !== undefined && p.cashGiven !== null && p.cashGiven !== '' ? Number(p.cashGiven) : net;
                  const change = p.returnChange !== undefined && p.returnChange !== null ? Number(p.returnChange) : (given > net ? given - net : 0);
                  return change > 0;
                }).length === 0 ? <p style={styles.placeholderText}>No return changes recorded for this date.</p> :
                paidDatePatients.map((p, idx) => {
                  const net = (Number(p.fee) || 0) - (Number(p.discount) || 0);
                  const given = p.cashGiven !== undefined && p.cashGiven !== null && p.cashGiven !== '' ? Number(p.cashGiven) : net;
                  const change = p.returnChange !== undefined && p.returnChange !== null ? Number(p.returnChange) : (given > net ? given - net : 0);
                  if (change <= 0) return null;
                  return (
                    <div key={idx} style={styles.paymentModalRow}>
                      <div>
                        <strong>{idx + 1}. {p.firstName} {p.lastName}</strong>
                        <div style={{ fontSize: '9.5px', color: '#64748b' }}>Given: Rs. {given} | Net Fee: Rs. {net}</div>
                      </div>
                      <div style={{ fontWeight: 'bold', color: '#d97706' }}>Rs. {change}</div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: '12px', textAlign: 'right' }}>
              <button onClick={() => setActivePaymentModal(null)} style={styles.modalCloseActionBtn}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Logout Modal ---- */}
      {showLogoutModal && (
        <div style={styles.modalOverlay} onClick={() => setShowLogoutModal(false)}>
          <div style={styles.logoutModalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px 0', color: '#1e3a8a', fontSize: '15px' }}>Confirm Logout</h3>
            <p style={{ fontSize: '11px', color: '#475569', marginBottom: '14px' }}>Kya aap waqai dashboard se logout karna chahte hain?</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowLogoutModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={() => { alert('Logged out successfully!'); setShowLogoutModal(false); }} style={styles.confirmLogoutBtn}>Yes, Logout</button>
            </div>
          </div>
        </div>
      )}

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
              <div style={styles.testsBox}>🧪 {selectedLabPatient.labTests || 'N/A'}</div>
            </div>

            <div style={styles.modalSection}>
              <label style={styles.label}>Lab Fee </label>
              <input type="number" name="fee" value={labFormData.fee} onChange={handleLabFormChange} placeholder="Enter lab fee..." style={styles.inputField} />
            </div>

            <div style={styles.modalSection}>
              <label style={styles.label}>Remarks </label>
              <textarea name="remarks" value={labFormData.remarks} onChange={handleLabFormChange} placeholder="Remarks..." rows="3" style={styles.textareaField} />
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
  dropdownReportBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#f8fafc',
    padding: '4px 8px',
    borderRadius: '5px',
    border: '1px solid #cbd5e1',
  },
  reportLabel: {
    fontSize: '9px',
    fontWeight: '600',
    color: '#64748b',
  },
  reportDropdown: {
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    fontSize: '10.5px',
    backgroundColor: '#ffffff',
    color: '#1e3a8a',
    fontWeight: 'bold',
    cursor: 'pointer',
    outline: 'none',
  },
  reportAmount: {
    fontSize: '11.5px',
    fontWeight: 'bold',
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #bbf7d0',
    minWidth: '65px',
    textAlign: 'center',
  },
  viewAllBtn: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  calcTriggerBtn: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '5px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  logoutBtn: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '5px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: 'none',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
  },
  calcModalBox: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '14px',
    width: '260px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  },
  calcDisplay: {
    backgroundColor: '#1e293b',
    color: '#38bdf8',
    fontSize: '20px',
    fontWeight: 'bold',
    textAlign: 'right',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '10px',
    overflowX: 'auto',
  },
  calcKeypad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
  },
  calcBtnNum: {
    padding: '10px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: '#334155',
  },
  calcBtnOp: {
    padding: '10px',
    backgroundColor: '#e0f2fe',
    border: '1px solid #bae6fd',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: '#0369a1',
  },
  calcBtnClear: {
    padding: '10px',
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: '#991b1b',
  },
  calcBtnEquals: {
    padding: '10px',
    backgroundColor: '#16a34a',
    border: '1px solid #15803d',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: '#fff',
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
    overflowY: 'auto',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '6px',
    marginBottom: '6px',
    borderBottom: '1px solid #e2e8f0',
  },
  cardHeaderClean: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '2px',
    marginBottom: '6px',
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
    color: '#000',
    fontSize: '10px',
    outline: 'none',
  },
  contentListTall: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    overflowY: 'auto',
    flex: 1,
  },
  contentListShort: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    overflowY: 'auto',
    flex: 1,
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
  logoutModalBox: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    width: '280px',
    textAlign: 'center',
  },
  cancelBtn: {
    flex: 1,
    padding: '6px',
    backgroundColor: '#e2e8f0',
    color: '#334155',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  confirmLogoutBtn: {
    flex: 1,
    padding: '6px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  paymentModalBox: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    width: '380px',
    maxWidth: '92vw',
    maxHeight: '82vh',
    overflowY: 'auto',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  },
  modalBodyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '50vh',
    overflowY: 'auto',
  },
  paymentModalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    backgroundColor: '#f8fafc',
    borderRadius: '5px',
    border: '1px solid #e2e8f0',
    fontSize: '11px',
  },
  modalCloseActionBtn: {
    padding: '6px 14px',
    backgroundColor: '#1e3a8a',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    width: '340px',
    maxHeight: '88vh',
    overflowY: 'auto',
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
    fontSize: '13px',
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