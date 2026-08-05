import React, { useState } from 'react';

const PharmacyDashboard = () => {
  const [medicines, setMedicines] = useState([
    { id: 1, name: 'Panadol', category: 'Tablet', quantity: 50, price: 50, expiry: '2026-12-01', batch: 'B001' },
    { id: 2, name: 'Amoxil Syrup', category: 'Syrup', quantity: 30, price: 150, expiry: '2026-09-15', batch: 'B002' },
    { id: 3, name: 'Insulin', category: 'Injection', quantity: 20, price: 500, expiry: '2026-08-20', batch: 'B003' },
  ]);

  const [activeModal, setActiveModal] = useState(null);
  const [notification, setNotification] = useState(null);
  const [medicineSearch, setMedicineSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '', category: 'Tablet', quantity: '', price: '', expiry: '', batch: ''
  });

  const [prescriptions, setPrescriptions] = useState([]);
  const [bills, setBills] = useState([]);

  const [patientName, setPatientName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [selectedMedId, setSelectedMedId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [prescriptionItems, setPrescriptionItems] = useState([]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 2000);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddMedicineSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.quantity || !formData.price) {
      alert('Please fill all required fields!');
      return;
    }
    const newMed = {
      id: Date.now(),
      ...formData,
      quantity: Number(formData.quantity),
      price: Number(formData.price)
    };
    setMedicines(prev => [newMed, ...prev]);
    setFormData({ name: '', category: 'Tablet', quantity: '', price: '', expiry: '', batch: '' });
    setActiveModal(null);
    showNotification('Medicine added successfully!');
  };

  const handleAddPrescriptionItem = () => {
    if (!selectedMedId || selectedQty <= 0) return;
    const med = medicines.find(m => m.id === Number(selectedMedId));
    if (!med) return;

    setPrescriptionItems(prev => {
      const existingIndex = prev.findIndex(item => item.medicineId === med.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].qty += Number(selectedQty);
        return updated;
      } else {
        return [
          ...prev,
          { medicineId: med.id, medicineName: med.name, price: med.price, qty: Number(selectedQty) }
        ];
      }
    });

    setSelectedMedId('');
    setSelectedQty(1);
  };

  const handleSavePrescription = (e) => {
    e.preventDefault();
    if (!patientName || prescriptionItems.length === 0) {
      alert('Patient name aur kam se kam ek medicine add karna lazmi hai.');
      return;
    }

    const totalAmount = prescriptionItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const newPrescription = {
      id: `RX-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName,
      doctorName: doctorName || 'Self / Walk-in',
      items: prescriptionItems,
      total: totalAmount,
      status: 'Pending',
      paymentStatus: 'Unpaid',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString()
    };

    setPrescriptions(prev => [newPrescription, ...prev]);
    setPatientName('');
    setDoctorName('');
    setPrescriptionItems([]);
    setActiveModal(null);
    showNotification('Prescription added to queue successfully!');
  };

  const handleTogglePayment = (prescriptionId) => {
    setPrescriptions(prev => prev.map(p => {
      if (p.id === prescriptionId) {
        return { ...p, paymentStatus: p.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid' };
      }
      return p;
    }));
    showNotification('Payment status updated!');
  };

  const handleDispensePrescription = (prescriptionId) => {
    setPrescriptions(prev => prev.map(p => {
      if (p.id === prescriptionId && p.status === 'Pending') {
        setBills(bList => {
          const alreadyExists = bList.some(b => b.prescriptionId === p.id);
          if (alreadyExists) return bList;

          const newBill = {
            id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
            prescriptionId: p.id,
            patientName: p.patientName,
            date: p.date,
            items: p.items,
            total: p.total
          };
          return [newBill, ...bList];
        });

        return { ...p, status: 'Dispensed', paymentStatus: 'Paid' };
      }
      return p;
    }));
    showNotification('Medicine dispensed & bill generated!');
  };

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setActiveModal('inventory');
        setTimeout(() => {
          const searchBox = document.getElementById('medSearchBox');
          if (searchBox) searchBox.focus();
        }, 100);
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveModal('newPrescription');
      }
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setActiveModal('addMed');
      }
      if (e.key === 'Escape') {
        setActiveModal(null);
        setMedicineSearch('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredMedicines = medicines.filter(m =>
    m.name.toLowerCase().includes(medicineSearch.toLowerCase()) ||
    m.category.toLowerCase().includes(medicineSearch.toLowerCase())
  );

  const uniqueCustomers = new Set([
    ...bills.map(b => b.patientName),
    ...prescriptions.filter(p => p.paymentStatus === 'Paid' || p.status === 'Dispensed').map(p => p.patientName)
  ]);
  const totalCustomers = uniqueCustomers.size;
  const totalSales = bills.reduce((sum, b) => sum + b.total, 0);
  const totalBills = bills.length;
  const totalMedicinesDispensed = prescriptions.filter(p => p.status === 'Dispensed').length;

  return (
    <div style={styles.container}>
      <style>{`
        html, body, #root {
          margin: 0;
          padding: 0;
          height: 100vh;
          overflow: hidden;
          box-sizing: border-box;
          background: #f8fafc;
          font-family: Arial, sans-serif;
        }
        * { box-sizing: border-box; }
      `}</style>

      {notification && (
        <div style={styles.notificationBanner}>
          {notification}
        </div>
      )}

      <div style={styles.headerRow}>
        <div>
          <div style={styles.brandTitle}>Pharmacy Management System</div>
          <h2 style={styles.title}>Pharmacy Dashboard</h2>

        </div>
        <div style={styles.headerRight}>
          <span style={styles.dateBadge}>20 May 2025, Tuesday</span>
          <span style={styles.userBadge}>Pharmacist Admin</span>
        </div>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Customers</div>
          <div style={styles.statValue}>{totalCustomers}</div>
          <div style={styles.statTrendGreen}></div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Sales</div>
          <div style={styles.statValue}>Rs. {totalSales}</div>
          <div style={styles.statTrendGreen}></div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Bills Generated</div>
          <div style={styles.statValue}>{totalBills}</div>
          <div style={styles.statTrendGreen}></div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Medicine Dispensed</div>
          <div style={styles.statValue}>{totalMedicinesDispensed}</div>
          <div style={styles.statTrendGreen}></div>
        </div>
      </div>

      <div style={styles.actionRow}>
        <div style={styles.actionCard} onClick={() => setActiveModal('inventory')}>
          <div>
            <div style={styles.actionTitle}>Medicine Inventory</div>
            <div style={styles.actionSub}>View and manage medicine stock and inventory</div>
          </div>
          <span style={styles.actionLink}>View Inventory › <span style={styles.shortcutTag}></span></span>
        </div>
        <div style={styles.actionCard} onClick={() => setActiveModal('addMed')}>
          <div>
            <div style={styles.actionTitle}>Add Medicine</div>
            <div style={styles.actionSub}>Add new medicine to inventory</div>
          </div>
          <span style={styles.actionLink}>Add New Medicine › <span style={styles.shortcutTag}></span></span>
        </div>
        <div style={styles.actionCard} onClick={() => setActiveModal('newPrescription')}>
          <div>
            <div style={styles.actionTitle}>New Prescription</div>
            <div style={styles.actionSub}>Create a new prescription for a customer</div>
          </div>
          <span style={styles.actionLink}>Create Prescription › <span style={styles.shortcutTag}></span></span>
        </div>
      </div>

      <div style={styles.tablesGrid}>
        <div style={styles.tableCard}>
          <div style={styles.tableHeaderContainer}>
            <h3 style={styles.tableHeaderTitle}>Prescription Queue</h3>
            <span style={styles.viewAllText} onClick={() => setActiveModal('queue')}>View All</span>
          </div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.trHead}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Medicines</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Payment</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '15px', color: '#94a3b8' }}></td></tr>
              ) : (
                prescriptions.slice(0, 5).map((p) => (
                  <tr key={p.id} style={styles.trBody}>
                    <td style={styles.td}>{p.id}</td>
                    <td style={styles.td}>{p.patientName}</td>
                    <td style={styles.td}>
                      {p.items.map(i => `${i.medicineName} (x${i.qty})`).join(', ')}
                    </td>
                    <td style={styles.td}>
                      <span style={p.status === 'Dispensed' ? styles.badgeGreen : styles.badgeYellow} onClick={() => handleDispensePrescription(p.id)} title="Click to dispense">
                        {p.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={p.paymentStatus === 'Paid' ? styles.badgeGreen : styles.badgeRed} onClick={() => handleTogglePayment(p.id)} title="Click to toggle payment">
                        {p.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.tableCard}>
          <div style={styles.tableHeaderContainer}>
            <h3 style={styles.tableHeaderTitle}>Billing / Invoices</h3>
            <span style={styles.viewAllText} onClick={() => setActiveModal('bills')}>View All</span>
          </div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.trHead}>
                <th style={styles.th}>Invoice #</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Medicines Details</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '15px', color: '#94a3b8' }}></td></tr>
              ) : (
                bills.slice(0, 5).map((b) => (
                  <tr key={b.id} style={styles.trBody}>
                    <td style={styles.td}>{b.id}</td>
                    <td style={styles.td}>{b.patientName}</td>
                    <td style={styles.td}>
                      {b.items.map(i => `${i.medicineName} (${i.qty})`).join(', ')}
                    </td>
                    <td style={styles.td}>Rs. {b.total}</td>
                    <td style={styles.td}><span style={styles.badgeGreen}>Paid</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.tableCard}>
          <div style={styles.tableHeaderContainer}>
            <h3 style={styles.tableHeaderTitle}>Sales History</h3>
            <span style={styles.viewAllText} onClick={() => setActiveModal('sales')}>View All</span>
          </div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.trHead}>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Total Sales</th>
                <th style={styles.th}>Paid</th>
              
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '15px', color: '#94a3b8' }}></td></tr>
              ) : (
                <tr style={styles.trBody}>
                  <td style={styles.td}>Today</td>
                  <td style={styles.td}>Rs. {totalSales}</td>
                  <td style={styles.td}>Rs. {totalSales}</td>
                  <td style={styles.td}>Rs. 0</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>
                {activeModal === 'inventory' && 'Medicine Inventory List'}
                {activeModal === 'addMed' && 'Add New Medicine'}
                {activeModal === 'newPrescription' && 'Create New Prescription'}
                {activeModal === 'queue' && 'Prescription Queue Management'}
                {activeModal === 'bills' && 'All Billing Invoices'}
                {activeModal === 'sales' && 'Complete Sales History'}
              </h3>
              <button style={styles.closeBtn} onClick={() => { setActiveModal(null); setMedicineSearch(''); }}>×</button>
            </div>

            <div style={styles.modalBody}>
              {activeModal === 'inventory' && (
                <div>
                  <input
                    id="medSearchBox"
                    type="text"
                    placeholder="Search by medicine name or category..."
                    value={medicineSearch}
                    onChange={(e) => setMedicineSearch(e.target.value)}
                    style={{ ...styles.input, marginBottom: '10px' }}
                  />
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.trHead}>
                        <th style={styles.th}>Name</th>
                        <th style={styles.th}>Category</th>
                        <th style={styles.th}>Qty</th>
                        <th style={styles.th}>Price</th>
                        <th style={styles.th}>Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMedicines.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '15px', color: '#94a3b8' }}>No medicine found</td></tr>
                      ) : (
                        filteredMedicines.map(m => (
                          <tr key={m.id} style={styles.trBody}>
                            <td style={styles.td}>{m.name}</td>
                            <td style={styles.td}>{m.category}</td>
                            <td style={styles.td}>{m.quantity}</td>
                            <td style={styles.td}>Rs. {m.price}</td>
                            <td style={styles.td}>{m.expiry}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeModal === 'addMed' && (
                <form onSubmit={handleAddMedicineSubmit} style={styles.formGrid}>
                  <input type="text" name="name" placeholder="Medicine Name" value={formData.name} onChange={handleInputChange} style={styles.input} required />
                  <select name="category" value={formData.category} onChange={handleInputChange} style={styles.input}>
                    <option value="Tablet">Tablet</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Capsule">Capsule</option>
                  </select>
                  <input type="number" name="quantity" placeholder="Quantity" value={formData.quantity} onChange={handleInputChange} style={styles.input} required />
                  <input type="number" name="price" placeholder="Price per unit" value={formData.price} onChange={handleInputChange} style={styles.input} required />
                  <input type="date" name="expiry" value={formData.expiry} onChange={handleInputChange} style={styles.input} required />
                  <input type="text" name="batch" placeholder="Batch Number" value={formData.batch} onChange={handleInputChange} style={styles.input} />
                  <button type="submit" style={styles.submitBtn}>Save Medicine</button>
                </form>
              )}

            {activeModal === 'newPrescription' && (
                <div>
                  <input type="text" placeholder="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} style={styles.input} />
                  <input type="text" placeholder="Doctor Name (Optional)" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} style={{ ...styles.input, marginTop: '8px' }} />
                  
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <select value={selectedMedId} onChange={(e) => setSelectedMedId(e.target.value)} style={{ ...styles.input, flex: 2 }}>
                      <option value="">Select Medicine</option>
                      {medicines.map(m => (
                        <option key={m.id} value={m.id}>{m.name} (Stock: {m.quantity} - Rs.{m.price})</option>
                      ))}
                    </select>
                    <input type="number" min="1" value={selectedQty} onChange={(e) => setSelectedQty(e.target.value)} style={{ ...styles.input, flex: 1 }} placeholder="Qty" />
                    <button type="button" onClick={handleAddPrescriptionItem} style={styles.smallBtn}>Add</button>
                  </div>

                  <div style={{ marginTop: '10px', maxHeight: '100px', overflowY: 'auto' }}>
                    {prescriptionItems.map((item, idx) => (
                      <div key={idx} style={{ fontSize: '11px', padding: '4px', background: '#f1f5f9', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.medicineName} (Qty: {item.qty})</span>
                        <span>Rs. {item.price * item.qty}</span>
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={handleSavePrescription} style={{ ...styles.submitBtn, marginTop: '15px' }}>Save to Queue</button>
                </div>
              )}

              {activeModal === 'queue' && (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.trHead}>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>Patient</th>
                      <th style={styles.th}>Medicines</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map(p => (
                      <tr key={p.id} style={styles.trBody}>
                        <td style={styles.td}>{p.id}</td>
                        <td style={styles.td}>{p.patientName}</td>
                        <td style={styles.td}>{p.items.map(i => `${i.medicineName} (${i.qty})`).join(', ')}</td>
                        <td style={styles.td}>
                          <span style={p.status === 'Dispensed' ? styles.badgeGreen : styles.badgeYellow} onClick={() => handleDispensePrescription(p.id)}>
                            {p.status}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={p.paymentStatus === 'Paid' ? styles.badgeGreen : styles.badgeRed} onClick={() => handleTogglePayment(p.id)}>
                            {p.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeModal === 'bills' && (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.trHead}>
                      <th style={styles.th}>Invoice #</th>
                      <th style={styles.th}>Customer</th>
                      <th style={styles.th}>Medicines</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map(b => (
                      <tr key={b.id} style={styles.trBody}>
                        <td style={styles.td}>{b.id}</td>
                        <td style={styles.td}>{b.patientName}</td>
                        <td style={styles.td}>{b.items.map(i => `${i.medicineName} (${i.qty})`).join(', ')}</td>
                        <td style={styles.td}>{b.date}</td>
                        <td style={styles.td}>Rs. {b.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeModal === 'sales' && (
                <div>
                  <p style={{ fontSize: '12px' }}>Total Overall Sales Revenue: <b>Rs. {totalSales}</b></p>
                  <table style={{ ...styles.table, marginTop: '10px' }}>
                    <thead>
                      <tr style={styles.trHead}>
                        <th style={styles.th}>Invoice #</th>
                        <th style={styles.th}>Customer</th>
                        <th style={styles.th}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map(b => (
                        <tr key={b.id} style={styles.trBody}>
                          <td style={styles.td}>{b.id}</td>
                          <td style={styles.td}>{b.patientName}</td>
                          <td style={styles.td}>Rs. {b.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '12px 20px',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#f8fafc',
    position: 'relative'
  },
  notificationBanner: {
    position: 'absolute',
    top: '15px',
    right: '25px',
    background: '#10b981',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
    zIndex: 2000,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  brandTitle: { fontSize: '11px', color: '#64748b', fontWeight: 'bold' },
  title: { margin: 0, fontSize: '18px', color: '#0f172a' },
  subtitle: { margin: '2px 0 0', fontSize: '11px', color: '#64748b' },
  headerRight: { display: 'flex', gap: '10px', alignItems: 'center' },
  dateBadge: { fontSize: '11px', color: '#334155', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' },
  userBadge: { fontSize: '11px', color: '#1e3a8a', background: '#dbeafe', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' },
  
  statsRow: { display: 'flex', gap: '12px', marginBottom: '10px' },
  statCard: { flex: 1, background: '#fff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '10px 14px' },
  statLabel: { fontSize: '11px', color: '#64748b' },
  statValue: { fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '2px 0' },
  statTrendGreen: { fontSize: '9.5px', color: '#16a34a', fontWeight: 'bold' },

  actionRow: { display: 'flex', gap: '12px', marginBottom: '12px' },
  actionCard: { flex: 1, background: '#fff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s' },
  actionTitle: { fontSize: '12px', fontWeight: 'bold', color: '#0f172a' },
  actionSub: { fontSize: '10px', color: '#64748b', marginTop: '2px' },
  actionLink: { fontSize: '10.5px', color: '#2563eb', fontWeight: 'bold', whiteSpace: 'nowrap' },
  shortcutTag: { fontSize: '9px', color: '#94a3b8', fontWeight: 'normal', marginLeft: '4px' },

  tablesGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', flex: 1, minHeight: 0 },
  tableCard: { background: '#fff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' },
  tableHeaderContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' },
  tableHeaderTitle: { fontSize: '12px', fontWeight: 'bold', color: '#0f172a', margin: 0 },
  viewAllText: { fontSize: '10.5px', color: '#2563eb', cursor: 'pointer', fontWeight: 'bold' },
  
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' },
  trHead: { borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' },
  th: { padding: '5px 4px', fontSize: '10px', fontWeight: '600' },
  trBody: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '6px 4px', color: '#334155' },

  badgeGreen: { fontSize: '9.5px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' },
  badgeYellow: { fontSize: '9.5px', background: '#fef9c3', color: '#854d0e', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' },
  badgeRed: { fontSize: '9.5px', background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', width: '500px', maxWidth: '90%', borderRadius: '8px', padding: '15px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '10px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' },
  modalBody: { overflowY: 'auto', flex: 1 },
  formGrid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  input: { width: '100%', padding: '6px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' },
  submitBtn: { background: '#2563eb', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' },
  smallBtn: { background: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }
};

export default PharmacyDashboard;