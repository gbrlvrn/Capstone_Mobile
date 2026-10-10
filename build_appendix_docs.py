import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex="F8FAFC"):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_cell_borders(cell, border_color="CBD5E1"):
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/>'
        f'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/>'
        f'<w:left w:val="single" w:sz="16" w:space="0" w:color="2563EB"/>'
        f'<w:right w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)

def setup_page(doc, header_title):
    for s in doc.sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.0)
        s.right_margin = Inches(1.0)
        
        # Header
        header = s.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run(header_title)
        hrun.font.name = "Arial"
        hrun.font.size = Pt(8.5)
        hrun.font.italic = True
        hrun.font.color.rgb = RGBColor(100, 116, 139)
        
        # Footer
        footer = s.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Appendix C: Relevant Source Code")
        frun.font.name = "Arial"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(100, 116, 139)

def add_title(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(14)
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(13.5)
    run.font.bold = True
    run.font.color.rgb = RGBColor(15, 23, 42)

def add_intro(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(14)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(10.5)
    run.font.color.rgb = RGBColor(51, 65, 85)

def add_h1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(15, 23, 42)

def add_h2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(11)
    run.font.bold = True
    run.font.color.rgb = RGBColor(30, 41, 59)

def add_h3(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(10)
    run.font.bold = True
    run.font.color.rgb = RGBColor(71, 85, 105)

def add_code(doc, code_str):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
    set_cell_borders(cell, "CBD5E1")
    
    lines = code_str.strip().split("\n")
    for idx, line in enumerate(lines):
        p = cell.paragraphs[0] if idx == 0 else cell.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.05
        
        run = p.add_run(line if line.strip() != "" else " ")
        run.font.name = "Consolas"
        run.font.size = Pt(8.5)
        run.font.color.rgb = RGBColor(30, 41, 59)
    
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(6)

def build_web_doc():
    doc = docx.Document()
    setup_page(doc, "IsangDiwa: Web and Mobile Church Management & Financial Assistance System")
    
    add_title(doc, "APPENDIX C. RELEVANT SOURCE CODE\n(WEB APPLICATION)")
    add_intro(doc, "This appendix presents the relevant source code for the core functional modules of the web application in the IsangDiwa system (Presbyterian United Action Church - PUAC). It covers Create, Retrieve, Update, and Delete (CRUD) operations across both frontend (React) and backend (Node.js/Express with MongoDB) implementations for Community Branch Management, Announcements Management, and Member Savings Goals Management.")
    
    # ── MODULE A: COMMUNITY BRANCHES ─────────────────────────────
    add_h1(doc, "A. Community Branch Management")
    
    add_h2(doc, "A.1 Create Function")
    add_h3(doc, "A.1.1 Frontend (AdminBranches.js)")
    add_code(doc, '''const handleSubmit = async (e) => {
  e.preventDefault();
  setTouched({ name: true, region: true, cityOrProvince: true, address: true, pastor: true });
  if (!name.trim()) return toast.error('Community Name is required');
  if (!region) return toast.error('Region is required');
  if (!cityOrProvince) return toast.error('City / Province is required');
  if (!address.trim()) return toast.error('Complete Address is required');
  if (!pastor.trim()) return toast.error('Lead Pastor is required');
  if (hasErrors) return toast.error('Please complete all required fields');

  setSaving(true);
  try {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API}/api/admin/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: name.trim(),
        region,
        province: cityOrProvince,
        address: address.trim(),
        pastor: pastor.trim()
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    toast.success('Community added successfully');
    onSave();
  } catch (err) {
    toast.error(err.message || 'Failed to add community');
  } finally {
    setSaving(false);
  }
};''')
    
    add_h3(doc, "A.1.2 Backend (admin.js)")
    add_code(doc, '''router.post('/branches', authenticateAdmin, async (req, res) => {
  try {
    const { name, address, pastor, province, region } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Branch name is required' });

    const exists = await branches.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (exists) return res.status(400).json({ success: false, message: 'Branch already exists' });

    const newBranch = {
      name,
      address: address || '',
      pastor: pastor || '',
      province: province || region || 'CAR',
      region: region || 'CAR',
      status: 'Active',
      createdAt: new Date()
    };

    await branches.insertOne(newBranch);
    res.status(201).json({ success: true, message: 'Branch added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add branch' });
  }
});''')

    add_h2(doc, "A.2 Retrieve Function")
    add_h3(doc, "A.2.1 Frontend (AdminBranches.js)")
    add_code(doc, '''const fetcherSingle = (url) => {
  const token = localStorage.getItem('adminToken');
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json());
};

const { data: branchesData, isValidating: loadingBranches, mutate: fetchBranches } = useSWR(
  token ? `${API}/api/admin/branches?${queryParams}` : null,
  fetcherSingle,
  { revalidateOnFocus: false, dedupingInterval: 30000, keepPreviousData: true }
);''')

    add_h3(doc, "A.2.2 Backend (admin.js)")
    add_code(doc, '''router.get('/branches', authenticateAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { pastor: { $regex: search, $options: 'i' } }
      ];
    }

    const branchesList = await branches.find(query).sort({ createdAt: -1 }).toArray();
    res.status(200).json({ success: true, branches: branchesList });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch branches' });
  }
});''')

    add_h2(doc, "A.3 Update Function")
    add_h3(doc, "A.3.1 Frontend (AdminBranches.js)")
    add_code(doc, '''const handleSubmit = async (e) => {
  e.preventDefault();
  setTouched({ name: true, address: true, pastor: true });
  if (!name.trim()) return toast.error('Community name is required');
  if (!address.trim()) return toast.error('Address is required');
  if (!pastor.trim()) return toast.error('Lead Pastor is required');
  if (hasErrors) return toast.error('Please complete all required fields');

  setSaving(true);
  try {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API}/api/admin/branches/${branch._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: name.trim(), address: address.trim(), pastor: pastor.trim() })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    toast.success('Community updated successfully');
    onSave();
  } catch (err) {
    toast.error(err.message || 'Failed to update community');
  } finally {
    setSaving(false);
  }
};''')

    add_h3(doc, "A.3.2 Backend (admin.js)")
    add_code(doc, '''router.put('/branches/:id', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { id } = req.params;
    const { name, address, pastor, province, region } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Branch name is required' });

    const updateData = {
      name,
      address: address || '',
      pastor: pastor || '',
      updatedAt: new Date()
    };
    if (province) updateData.province = province;
    if (region) updateData.region = region;

    const result = await branches.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Branch not found' });

    res.status(200).json({ success: true, message: 'Branch updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update branch' });
  }
});''')

    add_h2(doc, "A.4 Delete Function")
    add_h3(doc, "A.4.1 Frontend (AdminBranches.js)")
    add_code(doc, '''const handleDeleteBranch = async (id) => {
  try {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API}/api/admin/branches/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      toast.success('Community removed');
      setDeletingBranch(null);
      fetchBranches();
    }
  } catch (err) {
    toast.error('Failed to remove community');
  }
};''')

    add_h3(doc, "A.4.2 Backend (admin.js)")
    add_code(doc, '''router.delete('/branches/:id', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { id } = req.params;
    
    const result = await branches.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'Branch not found' });

    res.status(200).json({ success: true, message: 'Branch deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete branch' });
  }
});''')

    # ── MODULE B: ANNOUNCEMENTS ─────────────────────────────────
    add_h1(doc, "B. Announcements Management")
    
    add_h2(doc, "B.1 Create Function")
    add_h3(doc, "B.1.1 Frontend (AdminAnnouncements.js)")
    add_code(doc, '''const handleSubmit = async (e) => {
  e.preventDefault();
  if (!form.title.trim() || !form.body.trim()) {
    toast.error('Title and message are required');
    return;
  }
  if (form.visibility === 'branches' && form.targetBranches.length === 0) {
    toast.error('Please select at least one branch');
    return;
  }

  setSubmitting(true);
  try {
    const token = localStorage.getItem('adminToken');
    const payload = {
      ...form,
      category: form.category === 'Other' ? form.customCategory : form.category,
      template,
      eventDate: form.eventDate || null,
      expiresAt: form.expiresAt || null,
    };
    delete payload.customCategory;

    const res = await fetch(`${API}/api/admin/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      toast.success('Announcement posted!');
      cancelEdit();
      fetchAnnouncements();
    } else {
      toast.error(data.message || 'Failed to post');
    }
  } catch {
    toast.error('Network error');
  } finally {
    setSubmitting(false);
  }
};''')

    add_h3(doc, "B.1.2 Backend (admin.js)")
    add_code(doc, '''router.post('/announcements', authenticateAdmin, async (req, res) => {
  try {
    const { title, body, category, eventDate, expiresAt, visibility, targetBranches, imageBase64, images, template } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required' });
    }
    const doc = {
      title,
      body,
      category: category || 'General',
      eventDate: eventDate ? new Date(eventDate) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      visibility: visibility || 'all',
      targetBranches: Array.isArray(targetBranches) ? targetBranches : [],
      image: imageBase64 || (images && images.length > 0 ? images[0] : null),
      images: Array.isArray(images) ? images : (imageBase64 ? [imageBase64] : []),
      template: template || 'banner',
      createdBy: req.admin.email,
      createdAt: new Date(),
    };
    const result = await announcements.insertOne(doc);
    res.status(201).json({ success: true, message: 'Announcement created', id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
});''')

    add_h2(doc, "B.2 Retrieve Function")
    add_h3(doc, "B.2.1 Frontend (AdminAnnouncements.js)")
    add_code(doc, '''const fetcherSingle = (url) => {
  const token = localStorage.getItem('adminToken');
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json());
};

const { data: announcementsData, isValidating: loadingAnnouncements, mutate: fetchAnnouncements } = useSWR(
  token ? `${API}/api/admin/announcements?admin=true` : null,
  fetcherSingle,
  { revalidateOnFocus: false, dedupingInterval: 30000, keepPreviousData: true }
);''')

    add_h3(doc, "B.2.2 Backend (admin.js)")
    add_code(doc, '''router.get('/announcements', async (req, res) => {
  try {
    const { branch } = req.query;
    let isAdmin = false;

    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (['admin', 'loanAdmin', 'secretaryAdmin'].includes(decoded?.role)) {
          isAdmin = true;
        }
      } catch (e) {
        // Visitor or unverified token
      }
    }

    const query = {};
    if (!isAdmin) {
      query.$and = [
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
          ]
        },
        {
          $or: [
            { visibility: 'all' },
            { visibility: { $exists: false } },
            { visibility: null },
            { targetBranches: branch }
          ]
        }
      ];
    }

    const announcementsList = await announcements.find(query).sort({ createdAt: -1 }).toArray();
    res.status(200).json({ success: true, announcements: announcementsList });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
});''')

    add_h2(doc, "B.3 Update Function")
    add_h3(doc, "B.3.1 Frontend (AdminAnnouncements.js)")
    add_code(doc, '''const handleUpdate = async (editingId) => {
  setSubmitting(true);
  try {
    const token = localStorage.getItem('adminToken');
    const payload = {
      ...form,
      category: form.category === 'Other' ? form.customCategory : form.category,
      template,
      eventDate: form.eventDate || null,
      expiresAt: form.expiresAt || null,
    };
    delete payload.customCategory;

    const res = await fetch(`${API}/api/admin/announcements/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      toast.success('Announcement updated!');
      cancelEdit();
      fetchAnnouncements();
    } else {
      toast.error(data.message || 'Failed to update');
    }
  } catch {
    toast.error('Network error');
  } finally {
    setSubmitting(false);
  }
};''')

    add_h3(doc, "B.3.2 Backend (admin.js)")
    add_code(doc, '''router.put('/announcements/:id', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { id } = req.params;
    const { title, body, category, eventDate, expiresAt, visibility, targetBranches, imageBase64, images, template } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required' });
    }
    const updateDoc = {
      title,
      body,
      category: category || 'General',
      eventDate: eventDate ? new Date(eventDate) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      visibility: visibility || 'all',
      targetBranches: Array.isArray(targetBranches) ? targetBranches : [],
      image: imageBase64 || (images && images.length > 0 ? images[0] : null),
      images: Array.isArray(images) ? images : (imageBase64 ? [imageBase64] : []),
      template: template || 'banner',
      updatedAt: new Date(),
      updatedBy: req.admin.email,
    };
    const result = await announcements.updateOne({ _id: new ObjectId(id) }, { $set: updateDoc });
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    res.status(200).json({ success: true, message: 'Announcement updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update announcement' });
  }
});''')

    add_h2(doc, "B.4 Delete Function")
    add_h3(doc, "B.4.1 Frontend (AdminAnnouncements.js)")
    add_code(doc, '''const handleDelete = async (id) => {
  try {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API}/api/admin/announcements/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok && data.success) {
      toast.success('Announcement deleted');
      setDeletingAnnouncement(null);
      fetchAnnouncements();
    } else {
      toast.error(data.message || 'Failed to delete');
    }
  } catch {
    toast.error('Network error');
  }
};''')

    add_h3(doc, "B.4.2 Backend (admin.js)")
    add_code(doc, '''router.delete('/announcements/:id', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { id } = req.params;
    const result = await announcements.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    res.status(200).json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete announcement' });
  }
});''')

    # ── MODULE C: MEMBER SAVINGS GOALS (WEB) ────────────────────
    add_h1(doc, "C. Member Savings Goals Management")
    
    add_h2(doc, "C.1 Create Function")
    add_h3(doc, "C.1.1 Frontend (SavingsModal.js)")
    add_code(doc, '''const handleSubmit = async () => {
  if (!resolvedName) { setError('Goal name is required.'); return; }
  if (!targetAmount || parseFloat(targetAmount.replace(/,/g, '')) < 1000) {
    setError('Minimum target amount is ₱1,000.'); return;
  }
  setError('');
  setLoading(true);
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/savings/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: resolvedName,
        targetAmount: parseFloat(targetAmount.replace(/,/g, '')),
        color,
        iconType,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Could not create goal.');
    onClose();
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};''')

    add_h3(doc, "C.1.2 Backend (savings.js)")
    add_code(doc, '''router.post('/savings/goals', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { name, targetAmount, color, iconType } = req.body;

    if (!name || !targetAmount || Number(targetAmount) < 1000) {
      return res.status(400).json({ success: false, message: 'Name and a minimum target amount of ₱1,000 are required' });
    }

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const goal = {
      email,
      memberName: user.fullName,
      name,
      targetAmount: Number(targetAmount),
      savedAmount: 0,
      color: color || 'blue',
      iconType: iconType || 'default',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await savingsGoals.insertOne(goal);
    res.status(201).json({ success: true, message: 'Goal created', goalId: result.insertedId });
  } catch (err) {
    console.error('Create goal error:', err);
    res.status(500).json({ success: false, message: 'Failed to create goal' });
  }
});''')

    add_h2(doc, "C.2 Retrieve Function")
    add_h3(doc, "C.2.1 Frontend (SavingsModal.js / Savings.js)")
    add_code(doc, '''const fetchGoals = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/savings/goals?all=true`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      setGoals(data.goals);
    }
  } catch (err) {
    console.error('Failed to fetch savings goals:', err);
  }
};''')

    add_h3(doc, "C.2.2 Backend (savings.js)")
    add_code(doc, '''router.get('/savings/goals', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    
    if (req.query.all === 'true') {
      const goals = await savingsGoals.find({ email }).sort({ createdAt: -1 }).toArray();
      return res.json({ success: true, goals, totalCount: goals.length });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;
    const skip = (page - 1) * limit;

    const goals = await savingsGoals.find({ email }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
    const totalCount = await savingsGoals.countDocuments({ email });
    
    res.json({ success: true, goals, totalCount });
  } catch (err) {
    console.error('Savings goals error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch savings goals' });
  }
});''')

    add_h2(doc, "C.3 Update Function")
    add_h3(doc, "C.3.1 Frontend (SavingsModal.js)")
    add_code(doc, '''const handleSave = async () => {
  if (!resolvedName) { setError('Goal name is required.'); return; }
  if (parseFloat(target.replace(/,/g, '')) < 1000) { setError('Minimum target amount is ₱1,000.'); return; }
  setError('');
  setLoading(true);
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/savings/goals/${goal._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: resolvedName,
        targetAmount: parseFloat(target) || goal.targetAmount,
        color,
        iconType,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Could not update goal.');
    onClose();
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};''')

    add_h3(doc, "C.3.2 Backend (savings.js)")
    add_code(doc, '''router.put('/savings/goals/:id', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { id } = req.params;
    const { name, targetAmount, monthlyContribution, targetDate, color, iconType } = req.body;

    const goal = await savingsGoals.findOne({ _id: new ObjectId(id), email });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (targetAmount !== undefined) updates.targetAmount = Number(targetAmount);
    if (monthlyContribution !== undefined) updates.monthlyContribution = Number(monthlyContribution);
    if (targetDate !== undefined) updates.targetDate = targetDate ? new Date(targetDate) : null;
    if (color !== undefined) updates.color = color;
    if (iconType !== undefined) updates.iconType = iconType;
    updates.updatedAt = new Date();

    const saved = goal.savedAmount || 0;
    if (updates.targetAmount && saved >= updates.targetAmount) {
      updates.status = 'completed';
    }

    await savingsGoals.updateOne({ _id: new ObjectId(id) }, { $set: updates });
    res.json({ success: true, message: 'Goal updated' });
  } catch (err) {
    console.error('Update goal error:', err);
    res.status(500).json({ success: false, message: 'Failed to update goal' });
  }
});''')

    add_h2(doc, "C.4 Delete Function")
    add_h3(doc, "C.4.1 Frontend (SavingsModal.js)")
    add_code(doc, '''const handleDelete = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/savings/goals/${goal._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Could not delete goal.');
    setShowDeleteConfirm(false);
    onClose();
  } catch (err) {
    setError(err.message);
    setLoading(false);
  }
};''')

    add_h3(doc, "C.4.2 Backend (savings.js)")
    add_code(doc, '''router.delete('/savings/goals/:id', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { id } = req.params;

    const result = await savingsGoals.deleteOne({ _id: new ObjectId(id), email });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) {
    console.error('Delete goal error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete goal' });
  }
});''')

    out_path = r"c:\Users\gabri\OneDrive\Desktop\Capstone_Mobile\APPENDIX_C_Relevant_Source_Code_Web.docx"
    doc.save(out_path)
    print(f"Saved Web Doc: {out_path}")

def build_mobile_doc():
    doc = docx.Document()
    setup_page(doc, "IsangDiwa: Web and Mobile Church Management & Financial Assistance System")
    
    add_title(doc, "APPENDIX C. RELEVANT SOURCE CODE\n(MOBILE APPLICATION)")
    add_intro(doc, "This appendix presents the relevant source code for the core functional modules of the mobile application in the IsangDiwa system (Presbyterian United Action Church - PUAC). It covers Create, Retrieve, Update, and Delete (CRUD) operations across both the React Native/Expo frontend and Node.js/Express backend implementations for Member Savings Goals Management, Member Loan Application & Repayment Management, and QR Attendance Tracking.")

    # ── MODULE A: MEMBER SAVINGS GOALS (MOBILE) ─────────────────
    add_h1(doc, "A. Member Savings Goals Management")
    
    add_h2(doc, "A.1 Create Function")
    add_h3(doc, "A.1.1 Frontend (SavingsScreen.jsx & AuthService.js)")
    add_code(doc, '''// SavingsScreen.jsx
const handleCreateGoal = async () => {
  const resolvedGoalName = goalName === "Other" ? customGoalName.trim() : goalName;
  if (!resolvedGoalName) {
    setFormError("Please enter or select a goal name.");
    return;
  }
  const rawTarget = goalTarget.replace(/,/g, "");
  const target = parseFloat(rawTarget);
  if (isNaN(target) || target <= 0) {
    setFormError("Please enter a valid target amount.");
    return;
  }

  setSubmitting(true);
  try {
    const response = await createSavingsGoal({
      name: resolvedGoalName,
      targetAmount: target
    });

    setGoalModalOpen(false);
    setGoalName("");
    setCustomGoalName("");
    setGoalTarget("");
    loadSavingsData();

    if (userEmail) {
      addNotification(
        userEmail,
        "transaction",
        "Savings Goal Added",
        `Your savings goal "${resolvedGoalName}" with target ₱${_safeFmtNum(target)} has been successfully created.`,
        "goal-added"
      ).catch((err) => console.log("Failed to add notification:", err));
    }

    setTimeout(() => {
      showAlert("Success", "Savings goal created successfully!");
    }, 350);
  } catch (e) {
    console.log("Failed to create goal:", e);
    setFormError(e.message || "Failed to create savings goal.");
  } finally {
    setSubmitting(false);
  }
};

// AuthService.js
export function createSavingsGoal(goalData) {
  return webPost("/savings/goals", goalData);
}''')

    add_h3(doc, "A.1.2 Backend (savings.js)")
    add_code(doc, '''router.post('/savings/goals', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { name, targetAmount, color, iconType } = req.body;

    if (!name || !targetAmount || Number(targetAmount) < 1000) {
      return res.status(400).json({ success: false, message: 'Name and a minimum target amount of ₱1,000 are required' });
    }

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const goal = {
      email,
      memberName: user.fullName,
      name,
      targetAmount: Number(targetAmount),
      savedAmount: 0,
      color: color || 'blue',
      iconType: iconType || 'default',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await savingsGoals.insertOne(goal);
    res.status(201).json({ success: true, message: 'Goal created', goalId: result.insertedId });
  } catch (err) {
    console.error('Create goal error:', err);
    res.status(500).json({ success: false, message: 'Failed to create goal' });
  }
});''')

    add_h2(doc, "A.2 Retrieve Function")
    add_h3(doc, "A.2.1 Frontend (SavingsScreen.jsx & AuthService.js)")
    add_code(doc, '''// SavingsScreen.jsx
const loadSavingsData = async () => {
  try {
    setLoading(true);
    const response = await getSavingsGoals(true);
    const goalsList = response?.goals || [];
    setGoals(goalsList);
  } catch (err) {
    console.log("Failed to load savings data:", err);
  } finally {
    setLoading(false);
  }
};

// AuthService.js
export function getSavingsGoals(all = false, page = 1, limit = 20) {
  const query = all ? "?all=true" : `?page=${page}&limit=${limit}`;
  return webGet(`/savings/goals${query}`);
}''')

    add_h3(doc, "A.2.2 Backend (savings.js)")
    add_code(doc, '''router.get('/savings/goals', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    
    if (req.query.all === 'true') {
      const goals = await savingsGoals.find({ email }).sort({ createdAt: -1 }).toArray();
      return res.json({ success: true, goals, totalCount: goals.length });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;
    const skip = (page - 1) * limit;

    const goals = await savingsGoals.find({ email }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
    const totalCount = await savingsGoals.countDocuments({ email });
    
    res.json({ success: true, goals, totalCount });
  } catch (err) {
    console.error('Savings goals error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch savings goals' });
  }
});''')

    add_h2(doc, "A.3 Update Function")
    add_h3(doc, "A.3.1 Frontend (SavingsScreen.jsx & AuthService.js)")
    add_code(doc, '''// SavingsScreen.jsx
const handleUpdateGoal = async (goalId, targetAmount) => {
  try {
    setLoading(true);
    await updateSavingsGoal(goalId, { targetAmount: parseFloat(targetAmount) });
    showAlert("Success", "Savings goal updated successfully!");
    loadSavingsData();
  } catch (err) {
    console.log("Failed to update goal:", err);
    showAlert("Error", err.message || "Failed to update savings goal.");
  } finally {
    setLoading(false);
  }
};

// AuthService.js
export async function updateSavingsGoal(goalId, fields) {
  return webPut(`/savings/goals/${goalId}`, fields);
}''')

    add_h3(doc, "A.3.2 Backend (savings.js)")
    add_code(doc, '''router.put('/savings/goals/:id', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { id } = req.params;
    const { name, targetAmount, monthlyContribution, targetDate, color, iconType } = req.body;

    const goal = await savingsGoals.findOne({ _id: new ObjectId(id), email });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (targetAmount !== undefined) updates.targetAmount = Number(targetAmount);
    if (monthlyContribution !== undefined) updates.monthlyContribution = Number(monthlyContribution);
    if (targetDate !== undefined) updates.targetDate = targetDate ? new Date(targetDate) : null;
    if (color !== undefined) updates.color = color;
    if (iconType !== undefined) updates.iconType = iconType;
    updates.updatedAt = new Date();

    const saved = goal.savedAmount || 0;
    if (updates.targetAmount && saved >= updates.targetAmount) {
      updates.status = 'completed';
    }

    await savingsGoals.updateOne({ _id: new ObjectId(id) }, { $set: updates });
    res.json({ success: true, message: 'Goal updated' });
  } catch (err) {
    console.error('Update goal error:', err);
    res.status(500).json({ success: false, message: 'Failed to update goal' });
  }
});''')

    add_h2(doc, "A.4 Delete Function")
    add_h3(doc, "A.4.1 Frontend (SavingsScreen.jsx & AuthService.js)")
    add_code(doc, '''// SavingsScreen.jsx
const handleDeleteGoal = (goalId) => {
  showAlert(
    "Remove Goal",
    "Are you sure you want to remove this savings goal? This action cannot be undone.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const goalToRemove = goals.find((g) => g.id === goalId);
          const goalTitle = goalToRemove?.name || "Savings Goal";
          const updatedGoals = goals.filter((g) => g.id !== goalId);
          setGoals(updatedGoals);

          try {
            await AsyncStorage.setItem(`faithly_savings_goals_${userEmail}`, JSON.stringify(updatedGoals));
          } catch (e) {
            console.log("Failed to update cached goals:", e);
          }

          try {
            if (goalId) {
              await deleteSavingsGoal(goalId);
            }
          } catch (e) {
            console.log("Failed to delete goal on backend:", e);
          }

          if (userEmail) {
            addNotification(
              userEmail,
              "transaction",
              "Savings Goal Removed",
              `The savings goal "${goalTitle}" has been successfully removed.`,
              "goal-removed"
            ).catch((err) => console.log("Failed to add notification:", err));
          }
        },
      },
    ]
  );
};

// AuthService.js
export async function deleteSavingsGoal(goalId) {
  return webDelete(`/savings/goals/${goalId}`);
}''')

    add_h3(doc, "A.4.2 Backend (savings.js)")
    add_code(doc, '''router.delete('/savings/goals/:id', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { id } = req.params;

    const result = await savingsGoals.deleteOne({ _id: new ObjectId(id), email });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) {
    console.error('Delete goal error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete goal' });
  }
});''')

    # ── MODULE B: LOAN APPLICATION & REPAYMENT ───────────────────
    add_h1(doc, "B. Member Loan Application & Repayment Management")
    
    add_h2(doc, "B.1 Create Function (Apply for Loan)")
    add_h3(doc, "B.1.1 Frontend (LoansScreen.jsx & AuthService.js)")
    add_code(doc, '''// LoansScreen.jsx
const handleSubmitApplication = async () => {
  if (docVerification.coe.verifying || docVerification.itr.verifying || docVerification.payslip.verifying) {
    return showError("Please wait — one or more documents are still being verified.");
  }
  let multiplier = loanType === "Emergency" ? 1.5 : (loanType === "Personal" ? 2 : 1);
  const maxLoanable = totalSavings * multiplier;
  const availableLimit = Math.max(0, maxLoanable - existingLoanBalance);

  if (principal > availableLimit) {
    return showError(`Insufficient Limit: Maximum Loanable Amount is ${fmtCurrency(maxLoanable)}.`);
  }

  setSubmitting(true);
  try {
    let rate = loanType === "Emergency" ? 0.015 : (loanType === "Personal" ? 0.02 : 0.01);
    const backendPayload = {
      amount: principal,
      loanType: loanType.toLowerCase().replace(" ", "-"),
      purpose: finalPurpose,
      termMonths: parseInt(monthsToPay),
      interestRate: rate,
      monthlyPayment: monthlyInstallment,
      disbursementMethod: disbursementMethod === "GCash" ? "e-wallet" : disbursementMethod === "Bank Transfer" ? "bank" : "cash",
      accountNumber: (disbursementMethod === "GCash" || disbursementMethod === "Bank Transfer") ? accountNumber.trim() : "",
      phoneNumber: phoneNumber.trim(),
      selfieData: selfie?.base64 ? `data:image/jpeg;base64,${selfie.base64}` : "",
      idData: validId?.base64 ? `data:image/jpeg;base64,${validId.base64}` : "",
      coeData: coeDoc?.base64 ? `data:image/jpeg;base64,${coeDoc.base64}` : "",
      itrData: itrDoc?.base64 ? `data:image/jpeg;base64,${itrDoc.base64}` : "",
      payslipData: payslipDoc?.base64 ? `data:image/jpeg;base64,${payslipDoc.base64}` : "",
    };

    const result = await createLoan(backendPayload);
    if (userEmail) {
      addNotification(
        userEmail,
        "loan",
        "Loan Application Received",
        `Your application for a ${loanType} loan of ${fmtCurrency(principal)} is being processed.`
      );
    }
    await clearLoanDraft();
    showAlert("Application Submitted", "Your loan application has been submitted for review.");
  } catch (err) {
    showError(err.message || "Loan submission failed.");
  } finally {
    setSubmitting(false);
  }
};

// AuthService.js
export function createLoan(loanData) {
  return webPost("/loans/apply", loanData);
}''')

    add_h3(doc, "B.1.2 Backend (loans.js)")
    add_code(doc, '''router.post('/loans/apply', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const {
      amount, loanType, purpose, termMonths,
      interestRate, totalInterest, totalRepayment, monthlyPayment,
      disbursementMethod, disbursementAccount,
      selfieFileName, idFileName, selfieData, idData,
      coeData, coeFileName, itrData, payslipData
    } = req.body;

    if (!amount || (!loanType && !purpose)) {
      return res.status(400).json({ success: false, message: 'Amount and loan type are required' });
    }

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const now = new Date();
    const year = now.getFullYear();
    const counterDoc = await counters.findOneAndUpdate(
      { _id: `loans-${year}` },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    const loanId = `LN-${year}-${String(counterDoc.seq).padStart(3, '0')}`;

    const newLoan = {
      loanId, email, memberName: user.fullName, amount: Number(amount),
      loanType: loanType || 'personal',
      purpose: purpose || loanType || 'Personal Loan',
      termMonths: Number(termMonths) || 12,
      interestRate: Number(interestRate) || 0,
      totalInterest: Number(totalInterest) || 0,
      totalRepayment: Number(totalRepayment) || Number(amount),
      monthlyPayment: Number(monthlyPayment) || 0,
      remainingBalance: Number(totalRepayment) || Number(amount),
      paidMonths: 0,
      status: 'pending',
      disbursementMethod: disbursementMethod || null,
      disbursementAccount: disbursementAccount || null,
      selfieData: selfieData || null,
      idData: idData || null,
      coeData: coeData || null,
      appliedDate: now,
      createdAt: now,
    };

    await loans.insertOne(newLoan);
    res.status(201).json({ success: true, message: 'Loan application submitted', loan: newLoan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to submit loan application' });
  }
});''')

    add_h2(doc, "B.2 Retrieve Function (My Loans & Schedule)")
    add_h3(doc, "B.2.1 Frontend (LoansScreen.jsx & AuthService.js)")
    add_code(doc, '''// LoansScreen.jsx
const loadLoansFromAPI = useCallback(async () => {
  if (!userEmail) return;
  try {
    const response = await getLoans();
    const serverLoans = response?.loans || response?.data || [];
    const mapped = serverLoans.map(loan => {
      const rawAmt = typeof loan.amount === 'number' ? loan.amount : parseFloat(loan.amount) || 0;
      const rawRem = typeof loan.remainingBalance === 'number' ? loan.remainingBalance : parseFloat(loan.remainingBalance) || 0;
      return {
        ...loan,
        id: loan.loanId || loan._id,
        amount: rawAmt,
        remainingBalance: rawRem,
        status: loan.status
      };
    });
    setLoans(mapped);
  } catch (err) {
    console.log("[Loans] Failed to fetch loans:", err);
  }
}, [userEmail]);

// AuthService.js
export function getLoans(page = 1, limit = 50) {
  return webGet(`/loans/my-loans?page=${page}&limit=${limit}`);
}''')

    add_h3(doc, "B.2.2 Backend (loans.js)")
    add_code(doc, '''router.get('/loans/my-loans', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { search } = req.query;
    const page  = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const findQuery = { email };
    if (search) {
      findQuery.$or = [
        { loanId:  { $regex: search, $options: 'i' } },
        { purpose: { $regex: search, $options: 'i' } },
        { status:  { $regex: search, $options: 'i' } }
      ];
    }

    const totalCount = await loans.countDocuments(findQuery);
    const userLoans = await loans.find(findQuery)
      .sort({ appliedDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const allUserLoans = await loans.find(findQuery).toArray();
    const totalBorrowed = allUserLoans
      .filter(l => l.disbursed || l.status === 'completed')
      .reduce((sum, l) => sum + l.amount, 0);
    const activeLoans = allUserLoans.filter(l => l.status === 'active');
    const remainingBalance = activeLoans.reduce((sum, l) => sum + (l.remainingBalance || l.amount), 0);

    res.status(200).json({
      success: true,
      loans: userLoans.map(enrichLoanWithNextPayment),
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      stats: { totalBorrowed, remainingBalance, activeCount: activeLoans.length }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch loans' });
  }
});''')

    add_h2(doc, "B.3 Update Function (Submit Loan Repayment)")
    add_h3(doc, "B.3.1 Frontend (LoansScreen.jsx & AuthService.js)")
    add_code(doc, '''// LoansScreen.jsx
const handlePaymentSubmit = async () => {
  try {
    const payload = {
      paymentMethod: payMethod,
      paymentType: payType,
      amount: parseFloat(payAmount),
      monthsCovered: payMonths,
      accountName: payAccountName.trim(),
      accountNumber: payAccountNumber.trim(),
    };
    if (payProof?.base64) {
      payload.proofData = `data:image/jpeg;base64,${payProof.base64}`;
      payload.proofFileName = payProof?.fileName || "receipt.jpg";
    }

    const loanId = payNowLoan._id || payNowLoan.id;
    const response = await submitLoanPayment(loanId, payload);

    setPayNowModalOpen(false);
    showAlert("Payment Submitted", "Your payment has been submitted and is pending confirmation.");
    await loadLoansFromAPI();
  } catch (err) {
    setPayError(err.message || "Payment submission failed.");
  }
};

// AuthService.js
export function submitLoanPayment(loanId, paymentData) {
  return webPost(`/loans/${loanId}/pay`, paymentData);
}''')

    add_h3(doc, "B.3.2 Backend (loans.js)")
    add_code(doc, '''router.post('/loans/:id/pay', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentType = 'regular', amount: reqAmount, monthsCovered, accountName, accountNumber, proofData, proofFileName } = req.body;
    const email = req.user.email;

    let query = { loanId: id, email };
    if (ObjectId.isValid(id)) {
      query = { $or: [{ loanId: id }, { _id: new ObjectId(id) }], email };
    }

    const dbLoan = await loans.findOne(query);
    if (!dbLoan) return res.status(404).json({ success: false, message: 'Loan not found' });
    if (dbLoan.status !== 'active') return res.status(400).json({ success: false, message: 'Only active loans can receive payments' });

    const paymentRecord = {
      loanId: dbLoan.loanId,
      email,
      amount: Number(reqAmount),
      paymentMethod,
      paymentType,
      monthsCovered: Number(monthsCovered) || 1,
      accountName: accountName || '',
      accountNumber: accountNumber || '',
      proofOfPayment: proofData || null,
      status: 'pending_confirmation',
      submittedAt: new Date()
    };

    await loanPayments.insertOne(paymentRecord);
    res.status(200).json({ success: true, message: 'Payment recorded successfully and is pending review' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to process payment' });
  }
});''')

    add_h2(doc, "B.4 Delete / Cancel Function (Cancel Application)")
    add_h3(doc, "B.4.1 Frontend (AuthService.js & LoansScreen.jsx)")
    add_code(doc, '''// LoansScreen.jsx
const handleCancelLoan = async (loanId, reason) => {
  try {
    await cancelLoan(loanId, reason);
    showAlert("Loan Cancelled", "Your loan application has been cancelled.");
    await loadLoansFromAPI();
  } catch (err) {
    showAlert("Error", err.message || "Failed to cancel loan.");
  }
};

// AuthService.js
export function cancelLoan(loanId, reason = "") {
  return webPut(`/loans/${loanId}/cancel`, { reason });
}''')

    add_h3(doc, "B.4.2 Backend (loans.js)")
    add_code(doc, '''router.put('/loans/:id/cancel', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const email = req.user.email;

    const loan = await loans.findOne({ _id: new ObjectId(id) });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    if (loan.email !== email) return res.status(403).json({ success: false, message: 'Unauthorized' });
    
    if (loan.status !== 'pending' && loan.status !== 'awaiting_member_approval' && loan.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Only pending or approved loans can be cancelled' });
    }

    const cancelReason = reason || 'Cancelled by user';

    await loans.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { status: 'cancelled', cancelledDate: new Date(), updatedAt: new Date(), cancellationReason: cancelReason },
        $push: { statusHistory: { status: 'cancelled', date: new Date(), reason: cancelReason } }
      }
    );

    res.status(200).json({ success: true, message: 'Loan cancelled successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to cancel loan' });
  }
});''')

    # ── MODULE C: ATTENDANCE QR TRACKING ────────────────────────
    add_h1(doc, "C. Attendance QR Tracking")
    
    add_h2(doc, "C.1 Create Function (QR Check-In)")
    add_h3(doc, "C.1.1 Frontend (AttendanceScreen.jsx & AuthService.js)")
    add_code(doc, '''// AttendanceScreen.jsx
const handleBarcodeScanned = useCallback(async ({ type, data }) => {
  if (isScanningRef.current) return;
  isScanningRef.current = true;
  setScanning(true);
  
  try {
    const sessionId = (data || "").trim().replace(/^"|"$/g, "");
    if (!sessionId || !sessionId.startsWith("SESS-")) {
      setScanResult({ type: "error", title: "Invalid QR Code", message: "This QR code is not a valid service session." });
      return;
    }

    const result = await scanQRAttendance(sessionId);

    if (result?.alreadyLogged) {
      setScanResult({ type: "warning", title: "Already Checked In", message: "You have already checked in for this session." });
    } else {
      setScanResult({ type: "success", title: "Checked In Successfully!", message: "Your attendance has been recorded." });
    }
    fetchAttendanceData();
  } catch (error) {
    setScanResult({ type: "error", title: "Check-In Failed", message: error?.message || "Something went wrong." });
  } finally {
    setTimeout(() => {
      isScanningRef.current = false;
      setScanning(false);
    }, 2000);
  }
}, [fetchAttendanceData]);

// AuthService.js
export function scanQRAttendance(sessionId) {
  return webPost("/attendance/scan-qr", { sessionId });
}''')

    add_h3(doc, "C.1.2 Backend (attendance.js)")
    add_code(doc, '''router.post('/attendance/scan-qr', authenticateUser, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    const session = await attendanceSessions.findOne({ sessionId: sessionId, status: 'active' });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Active session not found or has ended.' });
    }

    let user = await users.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const existing = await attendance.findOne({ sessionId: session.sessionId, email: user.email });
    if (existing) {
      return res.status(200).json({ success: true, alreadyLogged: true, message: 'You have already checked in for this session.' });
    }

    const now = new Date();
    const sessionDate = session.startDateTime || new Date(`${session.date}T${session.time || '00:00'}:00`);
    const startPlusGrace = new Date(session.startDateTime.getTime() + (session.gracePeriodMinutes * 60000));
    const status = now > startPlusGrace ? 'Late' : 'Present';

    const count = await attendance.countDocuments();
    const recordId = `A-${now.getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const newRecord = {
      recordId, 
      sessionId: session.sessionId,
      email: user.email, 
      member: user.fullName || user.name, 
      service: session.serviceType, 
      branch: session.branch,
      userBranch: user.branch,
      method: 'QR Scan',
      rfidCardId: user.rfidCardId || null,
      status,
      date: sessionDate.toLocaleDateString('en-US'),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      createdAt: sessionDate
    };

    await attendance.insertOne(newRecord);
    res.status(201).json({ success: true, message: `Checked in as ${status} successfully!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to record check-in.' });
  }
});''')

    add_h2(doc, "C.2 Retrieve Function (Attendance History & Stats)")
    add_h3(doc, "C.2.1 Frontend (AttendanceScreen.jsx & AuthService.js)")
    add_code(doc, '''// AttendanceScreen.jsx
const fetchAttendanceData = useCallback(async () => {
  try {
    setLoading(true);
    const [historyRes, statsRes] = await Promise.all([
      getAttendanceHistory(1, 50),
      getAttendanceStats(),
    ]);

    if (historyRes?.records) {
      setAttendanceHistory(historyRes.records);
      setTotalAttendance(historyRes.total || historyRes.records.length);
    }
    if (statsRes) {
      setAttendanceStats(statsRes);
    }
  } catch (error) {
    console.log("Failed to fetch attendance:", error);
  } finally {
    setLoading(false);
  }
}, []);

// AuthService.js
export async function getAttendanceHistory(page = 1, limit = 50) {
  return webGet(`/attendance/my-attendance?page=${page}&limit=${limit}`);
}

export async function getAttendanceStats() {
  return webGet("/attendance/visited-stats");
}''')

    add_h3(doc, "C.2.2 Backend (attendance.js)")
    add_code(doc, '''router.get('/attendance/my-attendance', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const page  = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const query = { email };
    const total = await attendance.countDocuments(query);
    const records = await attendance.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.status(200).json({
      success: true,
      records,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance history' });
  }
});''')

    out_path = r"c:\Users\gabri\OneDrive\Desktop\Capstone_Mobile\APPENDIX_C_Relevant_Source_Code_Mobile.docx"
    doc.save(out_path)
    print(f"Saved Mobile Doc: {out_path}")

def build_complete_doc():
    doc = docx.Document()
    setup_page(doc, "IsangDiwa: Web and Mobile Church Management & Financial Assistance System")
    
    add_title(doc, "APPENDIX C. RELEVANT SOURCE CODE\n(WEB & MOBILE APPLICATIONS)")
    add_intro(doc, "This appendix presents the relevant source code for the core functional modules of both the web and mobile applications in the IsangDiwa system (Presbyterian United Action Church - PUAC). It covers Create, Retrieve, Update, and Delete (CRUD) operations across both frontend (React and React Native) and backend (Node.js/Express with MongoDB) implementations.")

    # We can combine both by calling sections
    print("Building complete combined doc...")
    # Add Web section
    p_web = doc.add_paragraph()
    r_web = p_web.add_run("PART I: WEB APPLICATION CRUD MODULES")
    r_web.font.name = "Arial"
    r_web.font.size = Pt(13)
    r_web.font.bold = True
    r_web.font.color.rgb = RGBColor(37, 99, 235)
    p_web.paragraph_format.space_before = Pt(16)
    p_web.paragraph_format.space_after = Pt(8)

    # Branches
    add_h1(doc, "A. Community Branch Management (Web Admin)")
    add_h2(doc, "A.1 Create Function")
    add_h3(doc, "A.1.1 Frontend (AdminBranches.js)")
    add_code(doc, '''const handleSubmit = async (e) => {
  e.preventDefault();
  setTouched({ name: true, region: true, cityOrProvince: true, address: true, pastor: true });
  if (!name.trim()) return toast.error('Community Name is required');
  if (!region) return toast.error('Region is required');
  if (!cityOrProvince) return toast.error('City / Province is required');
  if (!address.trim()) return toast.error('Complete Address is required');
  if (!pastor.trim()) return toast.error('Lead Pastor is required');
  if (hasErrors) return toast.error('Please complete all required fields');

  setSaving(true);
  try {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API}/api/admin/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: name.trim(),
        region,
        province: cityOrProvince,
        address: address.trim(),
        pastor: pastor.trim()
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    toast.success('Community added successfully');
    onSave();
  } catch (err) {
    toast.error(err.message || 'Failed to add community');
  } finally {
    setSaving(false);
  }
};''')
    add_h3(doc, "A.1.2 Backend (admin.js)")
    add_code(doc, '''router.post('/branches', authenticateAdmin, async (req, res) => {
  try {
    const { name, address, pastor, province, region } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Branch name is required' });

    const exists = await branches.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (exists) return res.status(400).json({ success: false, message: 'Branch already exists' });

    const newBranch = {
      name,
      address: address || '',
      pastor: pastor || '',
      province: province || region || 'CAR',
      region: region || 'CAR',
      status: 'Active',
      createdAt: new Date()
    };

    await branches.insertOne(newBranch);
    res.status(201).json({ success: true, message: 'Branch added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add branch' });
  }
});''')

    add_h2(doc, "A.2 Retrieve Function")
    add_h3(doc, "A.2.1 Frontend (AdminBranches.js)")
    add_code(doc, '''const fetcherSingle = (url) => {
  const token = localStorage.getItem('adminToken');
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json());
};

const { data: branchesData, isValidating: loadingBranches, mutate: fetchBranches } = useSWR(
  token ? `${API}/api/admin/branches?${queryParams}` : null,
  fetcherSingle,
  { revalidateOnFocus: false, dedupingInterval: 30000, keepPreviousData: true }
);''')
    add_h3(doc, "A.2.2 Backend (admin.js)")
    add_code(doc, '''router.get('/branches', authenticateAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { pastor: { $regex: search, $options: 'i' } }
      ];
    }

    const branchesList = await branches.find(query).sort({ createdAt: -1 }).toArray();
    res.status(200).json({ success: true, branches: branchesList });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch branches' });
  }
});''')

    add_h2(doc, "A.3 Update Function")
    add_h3(doc, "A.3.1 Frontend (AdminBranches.js)")
    add_code(doc, '''const handleSubmit = async (e) => {
  e.preventDefault();
  setTouched({ name: true, address: true, pastor: true });
  if (!name.trim()) return toast.error('Community name is required');
  if (!address.trim()) return toast.error('Address is required');
  if (!pastor.trim()) return toast.error('Lead Pastor is required');
  if (hasErrors) return toast.error('Please complete all required fields');

  setSaving(true);
  try {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API}/api/admin/branches/${branch._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: name.trim(), address: address.trim(), pastor: pastor.trim() })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    toast.success('Community updated successfully');
    onSave();
  } catch (err) {
    toast.error(err.message || 'Failed to update community');
  } finally {
    setSaving(false);
  }
};''')
    add_h3(doc, "A.3.2 Backend (admin.js)")
    add_code(doc, '''router.put('/branches/:id', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { id } = req.params;
    const { name, address, pastor, province, region } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Branch name is required' });

    const updateData = {
      name,
      address: address || '',
      pastor: pastor || '',
      updatedAt: new Date()
    };
    if (province) updateData.province = province;
    if (region) updateData.region = region;

    const result = await branches.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Branch not found' });

    res.status(200).json({ success: true, message: 'Branch updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update branch' });
  }
});''')

    add_h2(doc, "A.4 Delete Function")
    add_h3(doc, "A.4.1 Frontend (AdminBranches.js)")
    add_code(doc, '''const handleDeleteBranch = async (id) => {
  try {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API}/api/admin/branches/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      toast.success('Community removed');
      setDeletingBranch(null);
      fetchBranches();
    }
  } catch (err) {
    toast.error('Failed to remove community');
  }
};''')
    add_h3(doc, "A.4.2 Backend (admin.js)")
    add_code(doc, '''router.delete('/branches/:id', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { id } = req.params;
    
    const result = await branches.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'Branch not found' });

    res.status(200).json({ success: true, message: 'Branch deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete branch' });
  }
});''')

    # Announcements
    add_h1(doc, "B. Announcements Management (Web Admin)")
    add_h2(doc, "B.1 Create Function")
    add_h3(doc, "B.1.1 Frontend (AdminAnnouncements.js)")
    add_code(doc, '''const handleSubmit = async (e) => {
  e.preventDefault();
  if (!form.title.trim() || !form.body.trim()) {
    toast.error('Title and message are required');
    return;
  }
  setSubmitting(true);
  try {
    const token = localStorage.getItem('adminToken');
    const payload = {
      ...form,
      category: form.category === 'Other' ? form.customCategory : form.category,
      template,
      eventDate: form.eventDate || null,
      expiresAt: form.expiresAt || null,
    };
    delete payload.customCategory;

    const res = await fetch(`${API}/api/admin/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      toast.success('Announcement posted!');
      cancelEdit();
      fetchAnnouncements();
    }
  } catch {
    toast.error('Network error');
  } finally {
    setSubmitting(false);
  }
};''')
    add_h3(doc, "B.1.2 Backend (admin.js)")
    add_code(doc, '''router.post('/announcements', authenticateAdmin, async (req, res) => {
  try {
    const { title, body, category, eventDate, expiresAt, visibility, targetBranches, imageBase64, images, template } = req.body;
    if (!title || !body) return res.status(400).json({ success: false, message: 'Title and body are required' });
    
    const doc = {
      title, body, category: category || 'General',
      eventDate: eventDate ? new Date(eventDate) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      visibility: visibility || 'all',
      targetBranches: Array.isArray(targetBranches) ? targetBranches : [],
      images: Array.isArray(images) ? images : (imageBase64 ? [imageBase64] : []),
      template: template || 'banner',
      createdBy: req.admin.email,
      createdAt: new Date(),
    };
    const result = await announcements.insertOne(doc);
    res.status(201).json({ success: true, message: 'Announcement created', id: result.insertedId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
});''')

    add_h2(doc, "B.2 Retrieve Function")
    add_h3(doc, "B.2.1 Frontend (AdminAnnouncements.js)")
    add_code(doc, '''const { data: announcementsData, mutate: fetchAnnouncements } = useSWR(
  token ? `${API}/api/admin/announcements?admin=true` : null,
  fetcherSingle,
  { revalidateOnFocus: false, dedupingInterval: 30000, keepPreviousData: true }
);''')
    add_h3(doc, "B.2.2 Backend (admin.js)")
    add_code(doc, '''router.get('/announcements', async (req, res) => {
  try {
    const announcementsList = await announcements.find({}).sort({ createdAt: -1 }).toArray();
    res.status(200).json({ success: true, announcements: announcementsList });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
});''')

    add_h2(doc, "B.3 Update Function")
    add_h3(doc, "B.3.1 Frontend (AdminAnnouncements.js)")
    add_code(doc, '''const handleUpdate = async (editingId) => {
  const token = localStorage.getItem('adminToken');
  const res = await fetch(`${API}/api/admin/announcements/${editingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (res.ok && data.success) {
    toast.success('Announcement updated!');
    fetchAnnouncements();
  }
};''')
    add_h3(doc, "B.3.2 Backend (admin.js)")
    add_code(doc, '''router.put('/announcements/:id', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { id } = req.params;
    const { title, body, category } = req.body;
    const result = await announcements.updateOne(
      { _id: new ObjectId(id) },
      { $set: { title, body, category, updatedAt: new Date(), updatedBy: req.admin.email } }
    );
    res.status(200).json({ success: true, message: 'Announcement updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update announcement' });
  }
});''')

    add_h2(doc, "B.4 Delete Function")
    add_h3(doc, "B.4.1 Frontend (AdminAnnouncements.js)")
    add_code(doc, '''const handleDelete = async (id) => {
  const token = localStorage.getItem('adminToken');
  const res = await fetch(`${API}/api/admin/announcements/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (res.ok && data.success) {
    toast.success('Announcement deleted');
    fetchAnnouncements();
  }
};''')
    add_h3(doc, "B.4.2 Backend (admin.js)")
    add_code(doc, '''router.delete('/announcements/:id', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { id } = req.params;
    await announcements.deleteOne({ _id: new ObjectId(id) });
    res.status(200).json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete announcement' });
  }
});''')

    # Part II Mobile
    doc.add_page_break()
    p_mob = doc.add_paragraph()
    r_mob = p_mob.add_run("PART II: MOBILE APPLICATION CRUD MODULES")
    r_mob.font.name = "Arial"
    r_mob.font.size = Pt(13)
    r_mob.font.bold = True
    r_mob.font.color.rgb = RGBColor(16, 185, 129)
    p_mob.paragraph_format.space_before = Pt(16)
    p_mob.paragraph_format.space_after = Pt(8)

    # Mobile Savings Goals
    add_h1(doc, "A. Member Savings Goals Management (Mobile)")
    add_h2(doc, "A.1 Create Function")
    add_h3(doc, "A.1.1 Frontend (SavingsScreen.jsx & AuthService.js)")
    add_code(doc, '''// SavingsScreen.jsx
const handleCreateGoal = async () => {
  const target = parseFloat(goalTarget.replace(/,/g, ""));
  if (isNaN(target) || target <= 0) return setFormError("Invalid target amount.");
  setSubmitting(true);
  try {
    await createSavingsGoal({ name: resolvedGoalName, targetAmount: target });
    setGoalModalOpen(false);
    loadSavingsData();
    showAlert("Success", "Savings goal created successfully!");
  } catch (e) {
    setFormError(e.message || "Failed to create savings goal.");
  } finally {
    setSubmitting(false);
  }
};

// AuthService.js
export function createSavingsGoal(goalData) {
  return webPost("/savings/goals", goalData);
}''')
    add_h3(doc, "A.1.2 Backend (savings.js)")
    add_code(doc, '''router.post('/savings/goals', authenticateUser, async (req, res) => {
  try {
    const { name, targetAmount, color, iconType } = req.body;
    const user = await users.findOne({ email: req.user.email });
    const goal = {
      email: req.user.email,
      memberName: user.fullName,
      name,
      targetAmount: Number(targetAmount),
      savedAmount: 0,
      color: color || 'blue',
      iconType: iconType || 'default',
      status: 'active',
      createdAt: new Date(),
    };
    const result = await savingsGoals.insertOne(goal);
    res.status(201).json({ success: true, message: 'Goal created', goalId: result.insertedId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create goal' });
  }
});''')

    add_h2(doc, "A.2 Retrieve Function")
    add_h3(doc, "A.2.1 Frontend (SavingsScreen.jsx & AuthService.js)")
    add_code(doc, '''// SavingsScreen.jsx
const loadSavingsData = async () => {
  const response = await getSavingsGoals(true);
  setGoals(response?.goals || []);
};

// AuthService.js
export function getSavingsGoals(all = false, page = 1, limit = 20) {
  const query = all ? "?all=true" : `?page=${page}&limit=${limit}`;
  return webGet(`/savings/goals${query}`);
}''')
    add_h3(doc, "A.2.2 Backend (savings.js)")
    add_code(doc, '''router.get('/savings/goals', authenticateUser, async (req, res) => {
  try {
    const goals = await savingsGoals.find({ email: req.user.email }).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, goals, totalCount: goals.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch savings goals' });
  }
});''')

    add_h2(doc, "A.3 Update Function")
    add_h3(doc, "A.3.1 Frontend (SavingsScreen.jsx & AuthService.js)")
    add_code(doc, '''// SavingsScreen.jsx
const handleUpdateGoal = async (goalId, targetAmount) => {
  await updateSavingsGoal(goalId, { targetAmount: parseFloat(targetAmount) });
  showAlert("Success", "Savings goal updated successfully!");
  loadSavingsData();
};

// AuthService.js
export async function updateSavingsGoal(goalId, fields) {
  return webPut(`/savings/goals/${goalId}`, fields);
}''')
    add_h3(doc, "A.3.2 Backend (savings.js)")
    add_code(doc, '''router.put('/savings/goals/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, targetAmount } = req.body;
    await savingsGoals.updateOne(
      { _id: new ObjectId(id), email: req.user.email },
      { $set: { name, targetAmount: Number(targetAmount), updatedAt: new Date() } }
    );
    res.json({ success: true, message: 'Goal updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update goal' });
  }
});''')

    add_h2(doc, "A.4 Delete Function")
    add_h3(doc, "A.4.1 Frontend (SavingsScreen.jsx & AuthService.js)")
    add_code(doc, '''// SavingsScreen.jsx
const handleDeleteGoal = async (goalId) => {
  await deleteSavingsGoal(goalId);
  setGoals(prev => prev.filter(g => g.id !== goalId));
  showAlert("Success", "Savings goal removed.");
};

// AuthService.js
export async function deleteSavingsGoal(goalId) {
  return webDelete(`/savings/goals/${goalId}`);
}''')
    add_h3(doc, "A.4.2 Backend (savings.js)")
    add_code(doc, '''router.delete('/savings/goals/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    await savingsGoals.deleteOne({ _id: new ObjectId(id), email: req.user.email });
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete goal' });
  }
});''')

    out_path = r"c:\Users\gabri\OneDrive\Desktop\Capstone_Mobile\APPENDIX_C_Relevant_Source_Code_Complete.docx"
    doc.save(out_path)
    print(f"Saved Complete Doc: {out_path}")

if __name__ == "__main__":
    build_web_doc()
    build_mobile_doc()
    build_complete_doc()
    print("All docx files generated successfully!")
