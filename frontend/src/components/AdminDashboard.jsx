import React, { useState } from 'react';

const AdminDashboard = () => {
  const [doctors, setDoctors] = useState([
    {
      id: 1,
      name: 'Dr. Ahmed',
      department: 'Cardiology',
      phone: '0300-1234567',
      email: 'ahmed@medicare.com',
      cnic: '36601-1234567-1',
      timing: '09:00 AM - 01:00 PM',
      gender: 'Male',
      fee: '1500',
      status: 'Active',
      availDay: 'Mon, Wed, Fri'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDocId, setCurrentDocId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    department: '',
    phone: '',
    email: '',
    cnic: '',
    timing: '',
    gender: 'Male',
    fee: '',
    status: 'Active',
    availDay: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      department: '',
      phone: '',
      email: '',
      cnic: '',
      timing: '',
      gender: 'Male',
      fee: '',
      status: 'Active',
      availDay: ''
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (doc) => {
    setIsEditing(true);
    setCurrentDocId(doc.id);
    setFormData({
      name: doc.name,
      department: doc.department,
      phone: doc.phone,
      email: doc.email,
      cnic: doc.cnic,
      timing: doc.timing,
      gender: doc.gender,
      fee: doc.fee,
      status: doc.status,
      availDay: doc.availDay
    });
    setIsModalOpen(true);
  };

  const handleSaveDoctor = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.department || !formData.phone || !formData.email || !formData.cnic || !formData.timing || !formData.fee || !formData.availDay) {
      alert('Please fill in all required fields!');
      return;
    }

    if (isEditing) {
      setDoctors(doctors.map(doc => doc.id === currentDocId ? { ...doc, ...formData } : doc));
    } else {
      const newDoc = {
        id: Date.now(),
        ...formData
      };
      setDoctors([...doctors, newDoc]);
    }

    setIsModalOpen(false);
  };

  const handleRemoveDoctor = (id) => {
    setDoctors(doctors.filter(doc => doc.id !== id));
  };

  const filteredDoctors = doctors.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <h2 style={styles.dashboardTitle}>Admin Dashboard</h2>

      {/* Main Box - Left Aligned, Compact Width */}
      <div style={styles.mainBox}>
        
        {/* Top Bar: Search & Add Button */}
        <div style={styles.topBar}>
          <input
            type="text"
            placeholder="Search by Name or Dept..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchBox}
          />
          <button onClick={handleOpenAddModal} style={styles.addBtn}>
            + Add Doctor
          </button>
        </div>

        <hr style={styles.divider} />

        {/* Doctors List */}
        <div style={styles.listContainer}>
          {filteredDoctors.length === 0 ? (
            <p style={styles.noDataText}>No doctors found.</p>
          ) : (
            filteredDoctors.map((doc) => (
              <div key={doc.id} style={styles.itemRow}>
                <div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap'}}>
                    <strong style={styles.docName}>{doc.name}</strong>
                    <span style={styles.deptBadge}>{doc.department}</span>
                    <span style={{
                      ...styles.statusBadge, 
                      backgroundColor: doc.status === 'Active' ? '#d1fae5' : '#fee2e2',
                      color: doc.status === 'Active' ? '#065f46' : '#991b1b'
                    }}>
                      {doc.status}
                    </span>
                  </div>

                  <div style={styles.docDetailsGrid}>
                    <span><strong>Phone:</strong> {doc.phone}</span>
                    <span><strong>Email:</strong> {doc.email}</span>
                    <span><strong>CNIC:</strong> {doc.cnic}</span>
                    <span><strong>Gender:</strong> {doc.gender}</span>
                    <span><strong>Timing:</strong> {doc.timing}</span>
                    <span><strong>Days:</strong> {doc.availDay}</span>
                    <span><strong>Fee:</strong> Rs. {doc.fee}</span>
                  </div>
                </div>

                <div style={styles.actionButtons}>
                  <button onClick={() => handleEditClick(doc)} style={styles.editBtn}>Edit</button>
                  <button onClick={() => handleRemoveDoctor(doc.id)} style={styles.removeBtn}>Remove</button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Pop-up Modal (2-Column Layout matching Image Style) */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>{isEditing ? 'Edit Doctor Details' : 'Add New Doctor'}</span>
              <button onClick={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>✕</button>
            </div>

            <form onSubmit={handleSaveDoctor} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              
              <div style={styles.modalGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Doctor Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Dr. Ali" style={styles.inputField} required />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Department</label>
                  <input type="text" name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Cardiology" style={styles.inputField} required />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="0300-0000000" style={styles.inputField} required />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="doctor@medicare.com" style={styles.inputField} required />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>CNIC Number</label>
                  <input type="text" name="cnic" value={formData.cnic} onChange={handleChange} placeholder="36601-0000000-0" style={styles.inputField} required />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} style={styles.inputField}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Sitting Timing</label>
                  <input type="text" name="timing" value={formData.timing} onChange={handleChange} placeholder="09:00 AM - 01:00 PM" style={styles.inputField} required />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Available Days</label>
                  <input type="text" name="availDay" value={formData.availDay} onChange={handleChange} placeholder="Mon, Tue, Wed" style={styles.inputField} required />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Consultation Fee (Rs.)</label>
                  <input type="number" name="fee" value={formData.fee} onChange={handleChange} placeholder="1500" style={styles.inputField} required />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} style={styles.inputField}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Modal Buttons Footer */}
              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  {isEditing ? 'Update Doctor' : 'Save Doctor'}
                </button>
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
    padding: '12px 16px',
    backgroundColor: '#f1f5f9',
    minHeight: '100vh',
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  dashboardTitle: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: '8px',
  },
  mainBox: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1.5px solid #93c5fd',
    padding: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
    width: '380px',
    boxSizing: 'border-box',
  },
  topBar: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    marginBottom: '8px',
  },
  searchBox: {
    flex: 1,
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '11px',
    outline: 'none',
    backgroundColor: '#f8fafc',
  },
  addBtn: {
    padding: '6px 10px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  divider: {
    border: '0',
    height: '1px',
    backgroundColor: '#e2e8f0',
    marginBottom: '8px',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '420px',
    overflowY: 'auto',
    paddingRight: '2px',
  },
  noDataText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '11px',
    padding: '15px 0',
  },
  itemRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '8px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  docName: {
    fontSize: '12px',
    color: '#1e293b',
  },
  deptBadge: {
    fontSize: '10px',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    padding: '1px 5px',
    borderRadius: '4px',
    fontWeight: '600',
  },
  statusBadge: {
    fontSize: '9.5px',
    padding: '1px 5px',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  docDetailsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '10px',
    color: '#475569',
  },
  actionButtons: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'flex-end',
    marginTop: '4px',
  },
  editBtn: {
    padding: '3px 8px',
    backgroundColor: '#d97706',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  removeBtn: {
    padding: '3px 8px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '10px',
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
    padding: '10px',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '18px',
    width: '650px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '8px',
    marginBottom: '12px',
  },
  modalTitle: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  modalCloseBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#64748b',
  },
  modalGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px 14px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#334155',
  },
  inputField: {
    padding: '7px 10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '11.5px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
    backgroundColor: '#f8fafc',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '16px',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '10px',
  },
  cancelBtn: {
    padding: '7px 16px',
    backgroundColor: '#e2e8f0',
    color: '#334155',
    border: 'none',
    borderRadius: '6px',
    fontSize: '11.5px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '7px 16px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '11.5px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

export default AdminDashboard;