import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from generate_user_manual_core import (
    setup_page_geometry, add_h1, add_h2, add_h3, add_h4,
    add_p, add_bullet, add_ui_callouts_table, add_mockup_box,
    set_cell_background, set_cell_margins, set_cell_borders, set_table_borders
)

def build_user_manual():
    doc = docx.Document()
    setup_page_geometry(doc)

    logo_path = r"c:\Users\gabri\OneDrive\Desktop\Capstone_Mobile\CapstoneMobile\assets\puac_logo.png"

    # =========================================================================
    # COVER PAGE (PAGE 1)
    # =========================================================================
    p_logo = doc.add_paragraph()
    p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_logo.paragraph_format.space_before = Pt(36)
    p_logo.paragraph_format.space_after = Pt(12)
    if os.path.exists(logo_path):
        doc.add_picture(logo_path, width=Inches(1.8))
        doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(20)
    p_title.paragraph_format.space_after = Pt(4)
    r_title = p_title.add_run("ISANGDIWA")
    r_title.font.name = "Arial"
    r_title.font.size = Pt(28)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(13, 31, 69) # Navy

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(16)
    r_sub = p_sub.add_run("USER'S MANUAL")
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(16)
    r_sub.font.bold = True
    r_sub.font.color.rgb = RGBColor(37, 99, 235) # Blue

    p_desc = doc.add_paragraph()
    p_desc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_desc.paragraph_format.space_before = Pt(0)
    p_desc.paragraph_format.space_after = Pt(50)
    r_desc = p_desc.add_run("A Web and Mobile Church Management and Financial Assistance System\nfor Presbyterian United Action Church (PUAC)")
    r_desc.font.name = "Arial"
    r_desc.font.size = Pt(11)
    r_desc.font.italic = True
    r_desc.font.color.rgb = RGBColor(71, 85, 105)

    # Metadata card table
    meta_table = doc.add_table(rows=4, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(meta_table, "CBD5E1")
    meta_data = [
        ("System Name:", "IsangDiwa (Web & Mobile Platform)"),
        ("Target Beneficiary:", "Presbyterian United Action Church (PUAC)"),
        ("Prepared By:", "Capstone Project Research Team"),
        ("Document Version / Date:", "Version 1.0 — Academic Year 2025–2026"),
    ]
    for row_idx, (k, v) in enumerate(meta_data):
        row = meta_table.rows[row_idx]
        cell_k, cell_v = row.cells[0], row.cells[1]
        cell_k.width, cell_v.width = Inches(2.2), Inches(4.3)
        set_cell_background(cell_k, "F1F5F9")
        set_cell_background(cell_v, "FFFFFF")
        set_cell_margins(cell_k, top=60, bottom=60, left=100, right=100)
        set_cell_margins(cell_v, top=60, bottom=60, left=100, right=100)
        
        pk = cell_k.paragraphs[0]
        pk.paragraph_format.space_after = Pt(0)
        rk = pk.add_run(k)
        rk.font.name = "Arial"
        rk.font.size = Pt(9)
        rk.font.bold = True
        rk.font.color.rgb = RGBColor(30, 41, 59)
        
        pv = cell_v.paragraphs[0]
        pv.paragraph_format.space_after = Pt(0)
        rv = pv.add_run(v)
        rv.font.name = "Arial"
        rv.font.size = Pt(9)
        rv.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_page_break()

    # =========================================================================
    # COPYRIGHT & DISCLAIMER (PAGE 2)
    # =========================================================================
    add_h2(doc, "COPYRIGHT INFORMATION & DISCLAIMER")
    add_p(doc, "The information contained in this document is subject to change without prior notice. The software and accompanying services described herein are furnished under a non-commercial educational license solely for capstone project documentation, system defense, and operational adoption by Presbyterian United Action Church (PUAC).", space_after=8)
    add_p(doc, "No part of this manual may be reproduced, stored in a retrieval system, or transmitted in any form or by any means—electronic, mechanical, photocopying, recording, or otherwise—without the prior written consent of the development team and the authorized leadership of Presbyterian United Action Church.", space_after=8)
    add_p(doc, "The only warranties for the IsangDiwa system and related services are set forth in the express warranty statements accompanying such products and services. Nothing herein should be construed as constituting an additional warranty. The developers shall not be liable for technical or editorial errors or omissions contained herein.", space_after=8)
    add_p(doc, "All trademarks, product names, logos, and brands cited in this manual (e.g., GCash, PayMongo, MongoDB, React, React Native, Expo, Render) are property of their respective owners.", space_after=20)

    # =========================================================================
    # TABLE OF CONTENTS (PAGE 3 - 4)
    # =========================================================================
    add_h2(doc, "TABLE OF CONTENTS")
    
    toc_items = [
        ("1.0 GENERAL INFORMATION", "1"),
        ("    1.1 System Overview", "1"),
        ("    1.2 Organizational Structure of the User's Manual", "1"),
        ("2.0 SYSTEM SUMMARY", "2"),
        ("    2.1 System Configuration & Architecture", "2"),
        ("    2.2 Software and Hardware Requirements", "2"),
        ("    2.3 User Access Levels & Roles", "3"),
        ("3.0 GETTING STARTED", "4"),
        ("    3.1 Installation & Access Process", "4"),
        ("        3.1.1 Mobile Application Installation (Android APK)", "4"),
        ("        3.1.2 Web System Installation & Browser Access", "4"),
        ("4.0 USING THE SYSTEM", "5"),
        ("    4.1 Web Application (Admin & Church Officers)", "5"),
        ("        4.1.1 Sign In / Authentication", "5"),
        ("        4.1.2 Password Recovery & Forgot Password", "6"),
        ("        4.1.3 Account Settings & Profile Management", "7"),
        ("        4.1.4 Dashboard Overview & Real-time KPIs", "8"),
        ("        4.1.5 Member Management & RFID Card Enrollment", "9"),
        ("        4.1.6 Community Branch Management", "10"),
        ("        4.1.7 Announcements & Church Bulletins Management", "11"),
        ("        4.1.8 Service Attendance Tracking & Active Sessions", "12"),
        ("        4.1.9 Loan Application Review & Decision Support System (DSS)", "13"),
        ("        4.1.10 Loan Repayments & Delinquency Management", "14"),
        ("        4.1.11 Member Savings & Deposit Verification", "15"),
        ("        4.1.12 Donations & Tithes Management", "16"),
        ("        4.1.13 Financial Reports & AI Analytics", "17"),
        ("        4.1.14 System Settings & Access Control", "18"),
        ("    4.2 Mobile Application (Congregation Members)", "19"),
        ("        4.2.1 Onboarding & Welcome Flow", "19"),
        ("        4.2.2 Member Sign Up & OTP Verification", "20"),
        ("        4.2.3 Member Sign In & Authentication", "21"),
        ("        4.2.4 Forgot Password & Account Recovery", "22"),
        ("        4.2.5 Mobile Home Screen Navigation", "23"),
        ("        4.2.6 Member Profile & Document/ID Verification", "24"),
        ("        4.2.7 Service Attendance QR Scanner", "25"),
        ("        4.2.8 Member Savings (Goals, Deposits, Withdrawals, Transfers)", "26"),
        ("        4.2.9 Loan Management (Eligibility, Application, Repayment Tracker)", "27"),
        ("        4.2.10 Church Donations & Tithes (Pledges, GCash QR, Receipt OCR Upload)", "28"),
        ("        4.2.11 Community Prayer Wall & Prayer Requests", "29"),
        ("        4.2.12 Daily Devotionals & Scripture Reading", "30"),
        ("        4.2.13 Church Announcements & Calendar Events RSVP", "31"),
        ("        4.2.14 Community Branch Directory & Interactive Maps", "32"),
        ("        4.2.15 FaithBot AI Interactive Assistant", "33"),
        ("        4.2.16 Offline Mode Support & Sync Banner", "34"),
        ("        4.2.17 Account Settings & Security", "35"),
    ]

    for title, pg in toc_items:
        p_toc = doc.add_paragraph()
        p_toc.paragraph_format.space_before = Pt(0)
        p_toc.paragraph_format.space_after = Pt(2)
        r_t = p_toc.add_run(title)
        r_t.font.name = "Arial"
        r_t.font.size = Pt(9.5)
        if title.strip().startswith(("1.0", "2.0", "3.0", "4.0", "4.1", "4.2")):
            r_t.font.bold = True
            r_t.font.color.rgb = RGBColor(15, 23, 42)
        else:
            r_t.font.color.rgb = RGBColor(71, 85, 105)

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 1.0: GENERAL INFORMATION
    # =========================================================================
    add_h1(doc, "1.0 GENERAL INFORMATION")
    add_p(doc, "This manual is created for administrators, church officers, and congregation members of Presbyterian United Action Church (PUAC) utilizing the IsangDiwa system: A Web and Mobile Church Management and Financial Assistance System. It provides clear, practical information about the system's purpose, scope, features, and workflows, along with step-by-step instructions for proper use across both web and mobile environments.")

    add_h2(doc, "1.1 System Overview")
    add_p(doc, "The IsangDiwa system consists of two primary operational platforms designed to address church administrative processes, attendance monitoring, and member welfare micro-financing:")
    add_bullet(doc, "The Web Application is utilized by Church Administrators, Secretaries, and Loan Officers. It centralizes member profiles, branch records, RFID attendance hardware monitoring, announcement scheduling, donation acknowledgments, loan credit evaluation using a Decision Support System (DSS), and AI-driven financial analytics.", "1. Web Application (Administrative Hub): ")
    add_bullet(doc, "The Mobile Application is utilized by congregation members across all PUAC branches. It allows members to scan attendance QR codes, save towards targeted personal funds, submit micro-loan applications with automated document verification, donate tithes and offerings via digital payment gateways, post prayer requests on the community wall, read daily devotionals, and consult the FaithBot AI assistant.", "2. Mobile Application (Member Portal): ")

    add_h2(doc, "1.2 Organizational Structure of the User's Manual")
    add_p(doc, "This user manual is divided into four (4) major sections:")
    add_bullet(doc, "Explains the purpose, scope, and high-level architectural integration of the system.", "Section 1.0 General Information: ")
    add_bullet(doc, "Outlines technical specifications, hardware and software dependencies, and role-based access control tiers.", "Section 2.0 System Summary: ")
    add_bullet(doc, "Details installation procedures for the Android mobile application and access protocols for the web portal.", "Section 3.0 Getting Started: ")
    add_bullet(doc, "Provides comprehensive, step-by-step visual guides with numbered callout breakdowns for every screen across the web and mobile interfaces.", "Section 4.0 Using the System: ")

    # =========================================================================
    # CHAPTER 2.0: SYSTEM SUMMARY
    # =========================================================================
    add_h1(doc, "2.0 SYSTEM SUMMARY")
    add_p(doc, "This section summarizes the system configuration, technical dependencies, and user access roles across the IsangDiwa platform.")

    add_h2(doc, "2.1 System Configuration & Architecture")
    add_p(doc, "The IsangDiwa system operates on a cloud-synchronized client-server architecture. The web client is built with React.js, Tailwind CSS, and SWR for rapid cached data retrieval. The mobile client is developed using React Native and Expo, featuring offline storage mechanisms via AsyncStorage. Both interfaces connect to an Express.js REST API backend hosted on Render, backed by a cloud MongoDB database, Google Gemini 2.0 Flash AI for document analysis and natural language insights, and PayMongo / GCash for payment validation.")

    add_h2(doc, "2.2 Software and Hardware Requirements")
    add_p(doc, "To ensure optimal system performance and reliable data synchronization, devices must meet the following minimum requirements:")

    # Table of Requirements
    req_table = doc.add_table(rows=6, cols=3)
    req_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(req_table, "CBD5E1")
    req_headers = ["Platform", "Component", "Minimum Requirement"]
    for i, h in enumerate(req_headers):
        cell = req_table.rows[0].cells[i]
        set_cell_background(cell, "1E293B")
        set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
        p = cell.paragraphs[0]
        run = p.add_run(h)
        run.font.bold = True
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(255, 255, 255)

    req_data = [
        ("Web Application", "Operating System", "Windows 10/11 (64-bit), macOS 11+, or modern Linux distribution"),
        ("Web Application", "Web Browser", "Google Chrome 110+, Microsoft Edge 110+, or Mozilla Firefox 115+"),
        ("Web Application", "Hardware", "Intel Core i3 / AMD Ryzen 3, 4 GB RAM, 1366x768 display resolution"),
        ("Mobile Application", "Operating System", "Android 9.0 (Pie) or higher (Target: Android 14 / API 34)"),
        ("Mobile Application", "Hardware", "2 GB RAM, 100 MB free storage, 8MP rear camera with autofocus"),
    ]
    for r_idx, (plat, comp, spec) in enumerate(req_data, start=1):
        row = req_table.rows[r_idx]
        bg = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate([plat, comp, spec]):
            cell = row.cells[c_idx]
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=60, bottom=60, left=100, right=100)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.name = "Arial"
            r.font.size = Pt(8.5)
            r.font.color.rgb = RGBColor(30, 41, 59)

    sp = doc.add_paragraph()
    sp.paragraph_format.space_after = Pt(8)

    add_h2(doc, "2.3 User Access Levels & Roles")
    add_p(doc, "The IsangDiwa system incorporates strict role-based access control (RBAC) to ensure financial privacy, data protection, and operational segregation of duties:")
    add_bullet(doc, "Maintains unrestricted system administration privileges. Configures global settings, manages community branches, creates officer accounts, reviews consolidated financial reports, and audits system activity logs.", "1. Super Administrator (Web): ")
    add_bullet(doc, "Responsible for congregation membership records, service attendance sessions, RFID card enrollment, event announcements, and verifying initial member registration documents.", "2. Secretary Admin (Web): ")
    add_bullet(doc, "Evaluates loan applications using the Decision Support System (DSS), manages amortization payment confirmations, monitors loan delinquency, and reconciles savings deposit requests.", "3. Loan Admin (Web): ")
    add_bullet(doc, "General church members accessing the mobile app to scan attendance QR codes, save funds toward goals, apply for emergency/personal loans, donate tithes, submit prayers, and view devotionals.", "4. Congregation Member (Mobile): ")

    # =========================================================================
    # CHAPTER 3.0: GETTING STARTED
    # =========================================================================
    add_h1(doc, "3.0 GETTING STARTED")
    add_p(doc, "This section provides clear instructions on how to install and access the IsangDiwa system across mobile and desktop devices.")

    add_h2(doc, "3.1 Installation Process")
    add_h3(doc, "3.1.1 Mobile Application Installation (Android)")
    add_p(doc, "The IsangDiwa mobile application is distributed as an Android APK package (com.puac.app). Follow these steps to install the app on your Android smartphone:")
    add_bullet(doc, "Obtain the official IsangDiwa APK file through the secure church download link or QR code provided by church leadership.", "Step 1: Download APK — ")
    add_bullet(doc, "If installing an application outside Google Play for the first time, navigate to Settings > Security (or Apps > Special App Access) and enable 'Install Unknown Apps' for your web browser or file manager.", "Step 2: Enable Permissions — ")
    add_bullet(doc, "Open your device's Downloads folder, locate the downloaded APK, tap on it, and select 'Install'.", "Step 3: Complete Installation — ")
    add_bullet(doc, "Open the IsangDiwa app. When prompted, grant Camera permission (required for scanning service QR codes and capturing verification IDs) and Notification permission (for real-time loan and savings updates).", "Step 4: Grant App Permissions — ")

    add_h3(doc, "3.1.2 Web System Access")
    add_p(doc, "The IsangDiwa Web Portal does not require local desktop installation. It is hosted as a responsive web application accessible on any modern web browser:")
    add_bullet(doc, "Launch Google Chrome, Microsoft Edge, or Mozilla Firefox on your computer.", "Step 1: Open Browser — ")
    add_bullet(doc, "Navigate to the official production URL: https://puacfaithly.com (or admin portal URL: https://puacfaithly.com/admin/login).", "Step 2: Navigate to URL — ")
    add_bullet(doc, "Enter your assigned officer email and password credentials to access your designated role portal.", "Step 3: Sign In — ")

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 4.0: USING THE SYSTEM
    # =========================================================================
    add_h1(doc, "4.0 USING THE SYSTEM")
    add_p(doc, "This section serves as the comprehensive user manual, presenting detailed descriptions of interface elements, numbered UI callouts, and step-by-step procedures for every screen in the IsangDiwa Web and Mobile applications.")

    # -------------------------------------------------------------------------
    # 4.1 WEB APPLICATION (ADMIN & OFFICERS)
    # -------------------------------------------------------------------------
    add_h2(doc, "4.1 Web Application (Admin & Church Officers)")
    add_p(doc, "The web application delivers administrative and financial control to church leadership. It is partitioned into distinct portals for the Super Admin, Secretary, and Loan Officer.")

    # 4.1.1 SIGN IN
    add_h3(doc, "4.1.1 Sign In / Authentication")
    add_p(doc, "Allows authorized church administrators and officers to authenticate into the system using their registered email and encrypted credentials.")
    add_mockup_box(doc, "Web Officer Sign In", "web", "[1] Email Field, [2] Password Field, [3] Password Visibility Eye Toggle, [4] Role Selector Dropdown, [5] Sign In Button, [6] Forgot Password Link")
    add_ui_callouts_table(doc, [
        ("1", "Email Input Field", "Text Box", "Enter the registered administrative email address (e.g., admin@puacfaithly.com)."),
        ("2", "Password Input Field", "Password Box", "Enter the encrypted administrative account password."),
        ("3", "Eye Toggle Icon", "Button", "Toggle to show or conceal the typed password characters for verification."),
        ("4", "Role Selector", "Dropdown", "Optional: Select intended administrative role (Super Admin, Secretary, Loan Officer) for verification."),
        ("5", "Sign In Button", "Primary Action", "Submits credentials to backend API for JWT token generation and role authorization."),
        ("6", "Forgot Password? Link", "Hyperlink", "Navigates to the administrative password recovery and reset workflow."),
    ])
    add_p(doc, "Step-by-Step Procedure:", bold_prefix="Instructions: ")
    add_bullet(doc, "Enter your registered administrative email address in Field [1].")
    add_bullet(doc, "Enter your password in Field [2]. Click the Eye Toggle [3] to verify accurate character entry.")
    add_bullet(doc, "Click the 'Sign In' Button [5].")
    add_bullet(doc, "If credentials match: The system stores your secure JWT session token and redirects you to the corresponding dashboard.")
    add_bullet(doc, "If credentials fail: A red toast notification displays 'Invalid credentials' or 'Unauthorized role'. Ensure Caps Lock is off and retry.")

    # 4.1.2 FORGOT PASSWORD
    add_h3(doc, "4.1.2 Password Recovery & Forgot Password")
    add_p(doc, "Facilitates secure account recovery for church administrators who have forgotten their authentication credentials.")
    add_mockup_box(doc, "Web Password Recovery", "web", "[1] Recovery Email Input, [2] Send Reset Code Button, [3] Back to Login Link")
    add_ui_callouts_table(doc, [
        ("1", "Email Field", "Text Box", "Enter your registered administrative email address."),
        ("2", "Send Code Button", "Button", "Generates and sends a secure 6-digit One-Time Password (OTP) to your email."),
        ("3", "Back to Login", "Hyperlink", "Returns to the primary officer login screen without resetting password."),
    ])

    # 4.1.3 DASHBOARD
    add_h3(doc, "4.1.3 Admin Dashboard Overview & Real-time KPIs")
    add_p(doc, "The command center for church leadership, providing real-time statistics, pending approvals, and financial health metrics.")
    add_mockup_box(doc, "Admin Overview Dashboard", "web", "[1] Top Navigation & Officer Profile, [2] Total Members KPI, [3] Active Loans Summary, [4] Total Savings Pool, [5] Recent Activities Log, [6] Quick Action Buttons")
    add_ui_callouts_table(doc, [
        ("1", "Profile & Branch Header", "Status Bar", "Displays the active officer email, assigned branch, and quick logout button."),
        ("2", "Total Active Members Card", "Stat Metric", "Shows the total registered congregation count with growth trend indicator."),
        ("3", "Active Loans Card", "Stat Metric", "Displays total outstanding principal amount and pending loan application count."),
        ("4", "Total Savings Pool Card", "Stat Metric", "Aggregates all active member savings balances across church goals."),
        ("5", "Quick Navigation Shortcuts", "Icon Grid", "One-click access to Members, Branches, Attendance, and Loan Underwriting."),
        ("6", "Recent Activity Feed", "Log Table", "Real-time audit log of member registrations, donations, and loan payments."),
    ])

    # 4.1.4 MEMBER MANAGEMENT & RFID
    add_h3(doc, "4.1.4 Member Records Management & RFID Card Enrollment")
    add_p(doc, "Centralized directory of all church members across all PUAC communities, including digital RFID card pairing.")
    add_mockup_box(doc, "Member Records & RFID Management", "web", "[1] Search & Filter Bar, [2] Add Member Button, [3] Member Directory Table, [4] Edit Profile Action, [5] Enroll RFID Card Modal, [6] Delete Member Action")
    add_ui_callouts_table(doc, [
        ("1", "Search & Filter Bar", "Search Input", "Filter members by name, email, phone number, or community branch."),
        ("2", "Add Member Button", "Action Button", "Opens modal to manually register a new member with contact details."),
        ("3", "Members Table", "Data Grid", "Displays full name, email, mobile number, branch, and RFID status."),
        ("4", "Edit Member Button", "Action Icon", "Opens edit dialog to update member contact info, address, or branch."),
        ("5", "Link RFID Card Button", "Action Icon", "Opens RFID enrollment dialog to capture RFID UID from USB scanner."),
        ("6", "Delete Member Button", "Destructive Action", "Permanently deletes or archives member record with confirmation prompt."),
    ])

    # 4.1.5 COMMUNITY BRANCH MANAGEMENT
    add_h3(doc, "4.1.5 Community Branch Management")
    add_p(doc, "Allows Super Administrators to maintain the official directory of PUAC church branches across CAR, Region I, and other territories.")
    add_mockup_box(doc, "Community Branch Management", "web", "[1] Search Branches Input, [2] Add Community Modal Trigger, [3] Community Cards Grid, [4] Edit Branch Button, [5] Delete Branch Button")
    add_ui_callouts_table(doc, [
        ("1", "Search Input", "Search Box", "Real-time search across community branch names, cities, and pastors."),
        ("2", "Add Community Button", "Action Button", "Opens modal to create a new church branch with address and assigned pastor."),
        ("3", "Community Cards", "Content Cards", "Displays branch name, region, province, complete address, and lead pastor."),
        ("4", "Edit Branch Button", "Action Icon", "Allows updating the branch address, province, or lead pastor details."),
        ("5", "Delete Branch Button", "Destructive Button", "Removes branch from active directory if no active members are linked."),
    ])

    # 4.1.6 ANNOUNCEMENTS
    add_h3(doc, "4.1.6 Announcements & Church Bulletins Management")
    add_p(doc, "Enables administrators and secretaries to broadcast urgent church notices, pastoral letters, and service advisories.")
    add_mockup_box(doc, "Church Announcements Manager", "web", "[1] Announcement Creation Form, [2] Category & Branch Visibility Selector, [3] Auto-Expiration Date Picker, [4] Template Selector, [5] Post Button, [6] Active Announcements Table")
    add_ui_callouts_table(doc, [
        ("1", "Title & Message Fields", "Form Inputs", "Input announcement headline and formatted descriptive body."),
        ("2", "Visibility Dropdown", "Select Box", "Select whether notice is broadcast to 'All Branches' or specific branches."),
        ("3", "Auto-Expire Date", "Date Picker", "Sets date when announcement automatically archives from member feeds."),
        ("4", "Template Selector", "Visual Picker", "Choose presentation layout: Banner, Card with Image, or Text Notice."),
        ("5", "Post Announcement Button", "Action Button", "Publishes notice to web and triggers push notifications to mobile devices."),
        ("6", "Manage Bulletins Table", "Data Grid", "Table of active bulletins with Edit, Preview, and Delete actions."),
    ])

    # 4.1.7 SERVICE ATTENDANCE & RFID
    add_h3(doc, "4.1.7 Service Attendance Tracking & Active Sessions")
    add_p(doc, "Orchestrates Sunday worship and mid-week prayer service attendance using live QR code projection and hardware RFID card tap listeners.")
    add_mockup_box(doc, "Service Attendance Management", "web", "[1] Start New Session Button, [2] Projected Session QR Code, [3] RFID Tap Listener Input, [4] Real-time Attendance Feed, [5] Grace Period Config, [6] End Session Button")
    add_ui_callouts_table(doc, [
        ("1", "Start Session Button", "Action Button", "Initializes a service session with date, service type, and grace period."),
        ("2", "Projected QR Code", "QR Display", "Dynamic high-resolution QR code displayed on sanctuary screens for mobile scanning."),
        ("3", "RFID Tap Listener", "Input Listener", "Accepts instant keyboard-wedge input from USB RFID readers at church doors."),
        ("4", "Live Attendance Roster", "Table Feed", "Shows attendees, check-in timestamp, method (RFID/QR), and status (Present/Late)."),
        ("5", "End Session Button", "Action Button", "Closes session, locks check-ins, and calculates summary attendance statistics."),
    ])

    # 4.1.8 LOAN UNDERWRITING & DSS
    add_h3(doc, "4.1.8 Loan Application Review & Decision Support System (DSS)")
    add_p(doc, "Equips the Loan Administrator to evaluate member micro-loan requests using automated credit scoring and Decision Support System algorithms.")
    add_mockup_box(doc, "Loan Review & DSS Analysis", "web", "[1] Pending Loans Queue, [2] Member Verification Dossier, [3] DSS Risk Assessment Gauge, [4] Propose Counter-Terms Modal, [5] Approve Button, [6] Reject with Reason Button")
    add_ui_callouts_table(doc, [
        ("1", "Pending Loans Queue", "Table List", "Displays applicant name, loan type, requested amount, term, and submission date."),
        ("2", "Applicant Dossier", "Viewer Modal", "Previews applicant Government ID, selfie liveness, payslip, and active savings."),
        ("3", "DSS Risk Gauge", "Analytical Card", "Calculates max loanable limit (1.5x–2.0x savings) and repayment capacity score."),
        ("4", "Propose Terms Button", "Action Button", "Allows loan admin to offer adjusted loan amount or extended repayment term."),
        ("5", "Approve Button", "Action Button", "Formally approves loan and queues for disbursement via GCash/bank transfer."),
        ("6", "Reject Button", "Action Button", "Denies loan application and sends formal explanatory feedback to member."),
    ])

    # 4.1.9 LOAN REPAYMENTS & DELINQUENCY
    add_h3(doc, "4.1.9 Loan Repayments & Delinquency Management")
    add_p(doc, "Manages monthly amortization collections, payment verification, and delinquency alerts.")
    add_mockup_box(doc, "Loan Payments & Delinquency", "web", "[1] Payment Review Queue, [2] Proof of Payment Viewer, [3] Confirm Payment Button, [4] Reject Payment Button, [5] Delinquent Loans Tracker")
    add_ui_callouts_table(doc, [
        ("1", "Payment Queue", "Table Grid", "List of member submitted repayments awaiting manual confirmation."),
        ("2", "Receipt Viewer", "Image Modal", "High-res viewer for member-uploaded GCash or bank deposit transaction slips."),
        ("3", "Confirm Payment Button", "Action Button", "Credits payment against loan principal, updates remaining balance, and notifies member."),
        ("4", "Reject Payment Button", "Action Button", "Declines invalid or blurry receipts with a request for re-upload."),
        ("5", "Delinquency Tracker", "Aging Report", "Highlights loans past due date with aging analysis (30, 60, 90+ days overdue)."),
    ])

    # 4.1.10 SAVINGS & DEPOSIT VERIFICATION
    add_h3(doc, "4.1.10 Member Savings & Deposit Verification")
    add_p(doc, "Reconciles member savings deposits and approves withdrawal requests submitted from the mobile app.")
    add_mockup_box(doc, "Savings Verification Portal", "web", "[1] Deposits Tab, [2] Withdrawals Tab, [3] Transaction Review Table, [4] Approve Transaction, [5] Reject Transaction")
    add_ui_callouts_table(doc, [
        ("1", "Deposits Tab", "Tab Selector", "Views all member deposit requests with uploaded transaction receipts."),
        ("2", "Withdrawals Tab", "Tab Selector", "Views all member withdrawal requests for disbursement to member bank/e-wallet."),
        ("3", "Review Table", "Data Grid", "Shows member name, goal name, requested amount, payment method, and date."),
        ("4", "Approve Button", "Action Button", "Verifies transaction and updates the member's savings goal balance."),
        ("5", "Reject Button", "Action Button", "Rejects transaction with explanatory note (e.g., mismatched reference number)."),
    ])

    # 4.1.11 DONATIONS & TITHES
    add_h3(doc, "4.1.11 Donations & Tithes Management")
    add_p(doc, "Monitors incoming tithes, love offerings, and missions giving, providing donor transparency.")
    add_mockup_box(doc, "Donations & Giving Manager", "web", "[1] Category Summary Cards, [2] Incoming Giving Feed, [3] Receipt Verification Modal, [4] Mark Acknowledged Action")
    add_ui_callouts_table(doc, [
        ("1", "Giving Categories Cards", "Metric Cards", "Totals categorized by Tithes, Sunday Offerings, Building Fund, and Missions."),
        ("2", "Incoming Giving Table", "Data Grid", "List of donations with member name, pledge category, amount, and payment slip."),
        ("3", "Verify Receipt Modal", "Image Preview", "Inspects uploaded payment receipt for transaction authenticity."),
        ("4", "Acknowledge Button", "Action Button", "Confirms receipt and adds transaction to the public acknowledged donors feed."),
    ])

    # 4.1.12 FINANCIAL REPORTS & AI ANALYTICS
    add_h3(doc, "4.1.12 Financial Reports & AI Analytics")
    add_p(doc, "Empowers church leaders with comprehensive accounting balance sheets and Gemini AI conversational analytics.")
    add_mockup_box(doc, "Financial Reports & AI Analytics", "web", "[1] Date Range & Branch Filters, [2] Revenue vs Disbursement Charts, [3] Export Master CSV Button, [4] Gemini AI Chat Prompt, [5] AI Insights Response Box")
    add_ui_callouts_table(doc, [
        ("1", "Filter Bar", "Controls Bar", "Filter reports by fiscal quarter, specific branch, or giving category."),
        ("2", "Financial Charts", "Visual Charts", "Visual breakdown of monthly tithes, active loans disbursed, and savings deposits."),
        ("3", "Export Master CSV", "Export Button", "Downloads full accounting dataset in CSV format for audit compliance."),
        ("4", "Gemini AI Query Bar", "Natural Language Input", "Ask analytical questions (e.g., 'What is the projected loan recovery rate for Q4?')."),
        ("5", "AI Insights Box", "Markdown Display", "Displays AI-generated trend summaries, forecasting, and actionable advice."),
    ])

    # 4.1.13 SETTINGS
    add_h3(doc, "4.1.13 System Settings & Administrator Profiles")
    add_p(doc, "Configures global operational settings, payment approval workflows, and officer credentials.")
    add_mockup_box(doc, "System Settings Portal", "web", "[1] General Church Profile, [2] Payment Gateway Switches, [3] Officer Accounts Table, [4] Add Officer Button, [5] Save Configuration")
    add_ui_callouts_table(doc, [
        ("1", "Church Profile Info", "Form Inputs", "Configure official church name, contact email, and default currency symbol."),
        ("2", "Approval Mode Toggle", "Toggle Switch", "Switch between Manual Officer Approval and Automated Gateway Processing."),
        ("3", "Officer Accounts Table", "Data Grid", "Manage admin, secretary, and loan officer logins and active permissions."),
        ("4", "Add Officer Button", "Action Button", "Provisions a new administrative staff account with specific role rights."),
        ("5", "Save Changes Button", "Primary Action", "Saves and broadcasts updated configuration to backend servers."),
    ])

    doc.add_page_break()

    # -------------------------------------------------------------------------
    # 4.2 MOBILE APPLICATION (CONGREGATION MEMBERS)
    # -------------------------------------------------------------------------
    add_h2(doc, "4.2 Mobile Application (Congregation Members)")
    add_p(doc, "The IsangDiwa mobile application serves church members. It provides intuitive self-service features for worship attendance, personal savings goals, micro-loans, giving, and spiritual devotion.")

    # 4.2.1 ONBOARDING
    add_h3(doc, "4.2.1 Onboarding & Welcome Flow")
    add_p(doc, "Introduces new congregation members to the features and spiritual vision of the IsangDiwa mobile app.")
    add_mockup_box(doc, "Mobile Onboarding & Welcome", "mobile", "[1] Welcome Illustration, [2] Value Proposition Slides, [3] Pagination Indicator, [4] 'Get Started' Button, [5] 'Log In' Shortcut")
    add_ui_callouts_table(doc, [
        ("1", "Welcome Illustration", "Graphic", "Displays welcoming church and community artwork."),
        ("2", "Feature Highlights", "Slide Carousel", "Summarizes Church Attendance QR, Micro-Financing, and Member Savings."),
        ("3", "Dots Indicator", "Pagination", "Shows progress across the three onboarding introductory slides."),
        ("4", "Get Started Button", "Primary Action", "Proceeds directly to the new member registration (Sign Up) screen."),
        ("5", "Log In Link", "Text Button", "Navigates to the sign-in screen for existing members."),
    ])

    # 4.2.2 SIGN UP & OTP
    add_h3(doc, "4.2.2 Member Sign Up & OTP Verification")
    add_p(doc, "Registers a new congregation member, assigns their home PUAC branch, and validates identity via SMS/email OTP.")
    add_mockup_box(doc, "Member Registration & OTP", "mobile", "[1] Full Name Input, [2] Email Address Input, [3] Password Input, [4] Home Branch Picker, [5] Mobile Number Input, [6] Send OTP Button, [7] 6-Digit OTP Box")
    add_ui_callouts_table(doc, [
        ("1", "Full Name Field", "Text Input", "Enter legal first and last name."),
        ("2", "Email Address Field", "Email Input", "Enter valid email address for notifications and recovery."),
        ("3", "Password Field", "Password Box", "Create a secure password (min 6 characters with letters and numbers)."),
        ("4", "Home Branch Picker", "Dropdown", "Select local PUAC church branch (e.g., Baguio City, Benguet, La Union)."),
        ("5", "Mobile Number Field", "Phone Input", "Enter active Philippine mobile number (+63 format)."),
        ("6", "Request OTP Button", "Button", "Sends a 6-digit authentication PIN to the registered mobile number."),
        ("7", "OTP Code Inputs", "Pin Code Box", "Enter the 6-digit OTP received via SMS to activate account."),
    ])

    # 4.2.3 SIGN IN
    add_h3(doc, "4.2.3 Member Sign In & Authentication")
    add_p(doc, "Authenticates registered members into their personal church account.")
    add_mockup_box(doc, "Member Sign In", "mobile", "[1] Email/Mobile Field, [2] Password Field, [3] Eye Visibility Toggle, [4] Remember Me Checkbox, [5] Log In Button, [6] Forgot Password Link, [7] Sign Up Link")
    add_ui_callouts_table(doc, [
        ("1", "Email / Mobile Input", "Text Input", "Enter registered email address or mobile phone number."),
        ("2", "Password Input", "Password Box", "Enter account password."),
        ("3", "Eye Toggle Icon", "Icon Button", "Tap to view or hide password characters."),
        ("4", "Remember Me", "Checkbox", "Saves encrypted credentials locally for fast biometric/silent login."),
        ("5", "Log In Button", "Primary Action", "Authenticates credentials and loads the member Home dashboard."),
        ("6", "Forgot Password? Link", "Text Button", "Navigates to password recovery screen."),
        ("7", "Sign Up Link", "Text Button", "Navigates to account registration for new members."),
    ])

    # 4.2.4 FORGOT PASSWORD
    add_h3(doc, "4.2.4 Forgot Password & Account Recovery")
    add_p(doc, "Enables members to reset their account password via OTP verification.")
    add_mockup_box(doc, "Member Password Reset", "mobile", "[1] Registered Email Input, [2] Send OTP Button, [3] Enter New Password, [4] Confirm New Password, [5] Reset Password Button")
    add_ui_callouts_table(doc, [
        ("1", "Email Field", "Text Input", "Enter the email associated with your member profile."),
        ("2", "Send Code Button", "Action Button", "Dispatches password reset verification PIN."),
        ("3", "New Password Field", "Password Input", "Enter new secure password."),
        ("4", "Confirm Password", "Password Input", "Re-type new password to verify matching entries."),
        ("5", "Update Password Button", "Primary Button", "Confirms reset and redirects to login with new credentials."),
    ])

    # 4.2.5 HOME SCREEN
    add_h3(doc, "4.2.5 Mobile Home Screen Navigation")
    add_p(doc, "The primary dashboard for congregation members, featuring spiritual encouragement, quick actions, and financial summaries.")
    add_mockup_box(doc, "Mobile Home Dashboard", "mobile", "[1] Member Header & Profile Avatar, [2] Daily Verse Card, [3] Quick Action Hub (QR, Savings, Loans, Give), [4] Balance Summary Card, [5] Upcoming Church Events, [6] Bottom Navigation Bar")
    add_ui_callouts_table(doc, [
        ("1", "Member Header", "Status Bar", "Displays member name, home branch, notification bell, and profile icon."),
        ("2", "Daily Verse Card", "Scripture Card", "Daily biblical verse with scripture reference and share button."),
        ("3", "Quick Actions Hub", "Icon Grid", "Instant tap shortcuts: Attendance Scanner, Savings, Loans, and Give."),
        ("4", "My Balance Card", "Financial Card", "Shows total personal savings balance and current active loan status."),
        ("5", "Announcements Feed", "Horizontal List", "Carousel of recent church notices, bulletins, and event reminders."),
        ("6", "Bottom Navigation Bar", "Tab Bar", "Persistent tabs: Home, Attendance, Savings, Loans, and Profile."),
    ])

    # 4.2.6 PROFILE & ID VERIFICATION
    add_h3(doc, "4.2.6 Member Profile & Document/ID Verification")
    add_p(doc, "Allows members to manage contact details and submit government IDs required for micro-loan applications.")
    add_mockup_box(doc, "Profile & ID Verification", "mobile", "[1] Profile Avatar & Upload Button, [2] Personal Details Form, [3] Verification Status Badge, [4] Upload Gov ID Button, [5] Take Selfie Liveness Button, [6] Save Profile Button")
    add_ui_callouts_table(doc, [
        ("1", "Avatar Upload", "Image Picker", "Upload personal profile picture from camera or photo library."),
        ("2", "Profile Information", "Form Fields", "Update residential address, mobile number, and emergency contact."),
        ("3", "Verification Badge", "Status Pill", "Shows account verification status: Unverified, Pending Review, or Verified."),
        ("4", "Upload Valid ID", "Camera / Picker", "Capture clear photo of valid government ID (PhilID, UMID, Driver's License)."),
        ("5", "Selfie Liveness Check", "Camera Button", "Capture front selfie to verify identity match against uploaded ID."),
        ("6", "Save Changes Button", "Action Button", "Submits profile updates and queued verification documents."),
    ])

    # 4.2.7 ATTENDANCE QR SCANNER
    add_h3(doc, "4.2.7 Service Attendance QR Scanner")
    add_p(doc, "Scans the dynamic QR code projected during church services to log worship attendance in real time.")
    add_mockup_box(doc, "Attendance QR Scanner", "mobile", "[1] Camera Viewfinder Frame, [2] Flashlight / Torch Toggle, [3] Close Scanner Button, [4] Live Result Overlay Card, [5] Attendance History Tab")
    add_ui_callouts_table(doc, [
        ("1", "Viewfinder Frame", "Camera Feed", "Position camera frame over the service QR code projected on church screens."),
        ("2", "Torch Toggle", "Icon Button", "Activates device flashlight for dim sanctuary environments."),
        ("3", "Close Scanner", "Icon Button", "Exits camera mode and returns to Attendance home tab."),
        ("4", "Result Overlay Card", "Alert Banner", "Instant pop-up confirming: 'Present', 'Late', or 'Already Checked In'."),
        ("5", "Attendance History", "List Tab", "Chronological list of all attended services with service dates and times."),
    ])

    # 4.2.8 SAVINGS GOALS & TRANSACTIONS
    add_h3(doc, "4.2.8 Member Savings (Goals, Deposits, Withdrawals, Transfers)")
    add_p(doc, "Empowers members to build financial discipline by establishing targeted savings goals with digital deposit and withdrawal tracking.")
    add_mockup_box(doc, "Member Savings Hub", "mobile", "[1] Total Savings Display, [2] 'Create Goal' Button, [3] Goal Cards with Progress Bar, [4] Deposit via GCash/Bank Button, [5] Withdraw Funds Button, [6] Internal Transfer Button")
    add_ui_callouts_table(doc, [
        ("1", "Total Savings Card", "Balance Box", "Displays combined balance across all active savings goals."),
        ("2", "Create Goal Button", "Action Button", "Opens modal to define a new goal (e.g., Emergency, Education, Business)."),
        ("3", "Savings Goals List", "Card Grid", "Shows goal name, saved vs target amount, percentage bar, and icon."),
        ("4", "Deposit Button", "Action Button", "Submit deposit with GCash/bank slip upload and AI receipt OCR validation."),
        ("5", "Withdraw Button", "Action Button", "Request withdrawal of accumulated savings to registered bank/e-wallet."),
        ("6", "Transfer Button", "Action Button", "Move money seamlessly between two personal savings goals."),
    ])

    # 4.2.9 LOAN MANAGEMENT
    add_h3(doc, "4.2.9 Loan Management (Eligibility, Application, Repayment Tracker)")
    add_p(doc, "Provides church members access to benevolent micro-financing for emergency, educational, or personal needs.")
    add_mockup_box(doc, "Loan Management & Application", "mobile", "[1] Loan Limit & Eligibility Card, [2] 'Apply for Loan' Button, [3] Active Loan Tracker, [4] Repayment Schedule, [5] 'Pay Now' Installment Button, [6] Cancel Application Button")
    add_ui_callouts_table(doc, [
        ("1", "Loanable Limit Card", "Status Box", "Calculates maximum loanable limit based on active savings balance."),
        ("2", "Apply for Loan Button", "Action Button", "Launches multi-step loan wizard with document attachment checks."),
        ("3", "Active Loan Status Card", "Progress Card", "Shows loan ID, principal, paid months, and remaining balance."),
        ("4", "Repayment Schedule", "Table Modal", "Itemized breakdown of monthly due dates and amortization amounts."),
        ("5", "Pay Now Button", "Action Button", "Submit monthly amortization with GCash/bank receipt attachment."),
        ("6", "Cancel Application", "Action Link", "Cancel pending loan request prior to administrative approval."),
    ])

    # 4.2.10 TITHES & DONATIONS
    add_h3(doc, "4.2.10 Church Donations & Tithes (Giving & Receipt Upload)")
    add_p(doc, "Facilitates seamless giving of tithes and offerings with automatic receipt validation.")
    add_mockup_box(doc, "Church Giving & Tithes", "mobile", "[1] Giving Category Selector, [2] Amount Input, [3] GCash QR & Account Details, [4] Upload Payment Receipt Button, [5] Submit Donation, [6] Acknowledged Donors Feed")
    add_ui_callouts_table(doc, [
        ("1", "Category Selector", "Pill Buttons", "Select category: Tithes, Love Offering, Building Fund, Missions, Thanksgiving."),
        ("2", "Amount Input Field", "Currency Box", "Input monetary donation amount in Philippine Pesos (PHP)."),
        ("3", "Church Payment Details", "Info Box", "Displays church GCash QR code and bank account numbers with copy button."),
        ("4", "Upload Receipt Button", "Image Picker", "Upload screenshot of GCash receipt; auto-verifies reference number via OCR."),
        ("5", "Submit Donation Button", "Primary Action", "Submits pledge and receipt to church finance office for acknowledgement."),
        ("6", "Acknowledged Feed", "Public Feed", "Shows list of confirmed giving records with date and fund category."),
    ])

    # 4.2.11 PRAYER WALL
    add_h3(doc, "4.2.11 Community Prayer Wall & Prayer Requests")
    add_p(doc, "A digital fellowship space where church members share prayer intentions and spiritually support one another.")
    add_mockup_box(doc, "Community Prayer Wall", "mobile", "[1] 'Share Prayer Request' Input, [2] Anonymous Toggle Switch, [3] Post Prayer Button, [4] Prayer Requests Stream, [5] 'Pray for this' Counter Button")
    add_ui_callouts_table(doc, [
        ("1", "Prayer Request Input", "Text Area", "Write prayer petition, thanksgiving intention, or pastoral concern."),
        ("2", "Post Anonymously", "Toggle Switch", "Option to conceal member name and publish as 'Anonymous Prayer'."),
        ("3", "Post Prayer Button", "Action Button", "Publishes intention to the church-wide prayer stream."),
        ("4", "Prayer Stream", "Social Cards", "Scrollable cards of active member prayers with submission timestamps."),
        ("5", "Pray for this Button", "Heart Icon", "Tap to increment prayer intercession counter and notify petitioner."),
    ])

    # 4.2.12 DEVOTIONALS
    add_h3(doc, "4.2.12 Daily Devotionals & Scripture Reading")
    add_p(doc, "Nurtures spiritual growth with curated daily Bible reading plans, commentary, and prayer prompts.")
    add_mockup_box(doc, "Daily Devotionals", "mobile", "[1] Date & Scripture Reference, [2] Bible Text Reader, [3] Pastoral Reflection Commentary, [4] Reflection Journal Note, [5] Mark as Read Button")
    add_ui_callouts_table(doc, [
        ("1", "Scripture Reference", "Header Card", "Shows biblical book, chapter, and verses for today's reading."),
        ("2", "Bible Passage Reader", "Text View", "Full text of selected passage formatted for comfortable reading."),
        ("3", "Pastoral Reflection", "Commentary Box", "Devotional commentary written by PUAC pastors to guide contemplation."),
        ("4", "Reflection Notes", "Text Area", "Personal space to journal thoughts, insights, and personal prayers."),
        ("5", "Mark Completed", "Action Button", "Logs reading completion on member's personal spiritual streak."),
    ])

    # 4.2.13 ANNOUNCEMENTS & EVENTS RSVP
    add_h3(doc, "4.2.13 Church Announcements & Calendar Events RSVP")
    add_p(doc, "Keeps congregation members informed of worship schedules, fellowships, youth camps, and special conferences.")
    add_mockup_box(doc, "Announcements & Events RSVP", "mobile", "[1] Branch Filter Tab, [2] Bulletin Notice Cards, [3] Upcoming Events Calendar, [4] 'RSVP Going' Button, [5] Add to Phone Calendar")
    add_ui_callouts_table(doc, [
        ("1", "Filter Tabs", "Tab Bar", "Filter notices between 'My Branch' and 'General Church Announcements'."),
        ("2", "Bulletin Cards", "Expandable Card", "Displays headline, full text, attached graphic, and author pastor."),
        ("3", "Events Calendar", "Event Cards", "Chronological list of church activities with venue, date, and time."),
        ("4", "RSVP Going Button", "Action Button", "Registers member attendance headcount for event planning."),
        ("5", "Add to Calendar", "System Action", "Exports event details to Google Calendar or Apple Calendar."),
    ])

    # 4.2.14 BRANCH DIRECTORY
    add_h3(doc, "4.2.14 Community Branch Directory & Interactive Maps")
    add_p(doc, "Interactive directory of all PUAC sister church locations across northern and central Luzon.")
    add_mockup_box(doc, "Community Branch Directory", "mobile", "[1] Search Branches Bar, [2] Interactive Map View, [3] Branch Card, [4] Call Pastor Button, [5] Get Driving Directions")
    add_ui_callouts_table(doc, [
        ("1", "Search Bar", "Search Input", "Search branches by municipality, province, or pastor name."),
        ("2", "Interactive Map", "Google Maps View", "Visual map markers indicating verified church sanctuaries."),
        ("3", "Branch Info Card", "Details Card", "Shows complete sanctuary address, service hours, and lead pastor."),
        ("4", "Call Pastor Button", "Phone Action", "Initiates direct phone call to church branch office."),
        ("5", "Get Directions", "Navigation Action", "Opens Google Maps / Waze with GPS routing to church location."),
    ])

    # 4.2.15 FAITHBOT AI
    add_h3(doc, "4.2.15 FaithBot AI Interactive Assistant")
    add_p(doc, "An AI-powered church chatbot built on Google Gemini to assist members 24/7 with inquiries regarding church doctrines, service schedules, and loan qualification rules.")
    add_mockup_box(doc, "FaithBot AI Chat Assistant", "mobile", "[1] AI Assistant Header, [2] Chat History Bubbles, [3] Suggested Prompt Chips, [4] Query Input Bar, [5] Send Message Button")
    add_ui_callouts_table(doc, [
        ("1", "Assistant Header", "Header Bar", "Displays FaithBot status and info button explaining AI capabilities."),
        ("2", "Conversation Feed", "Chat Bubbles", "Chronological dialogue between user questions and AI responses."),
        ("3", "Prompt Chips", "Quick Buttons", "Tappable suggestions: 'How to apply for loan?', 'Service schedule', 'How savings work'."),
        ("4", "Message Input Bar", "Text Input", "Type any inquiry in English, Tagalog, or Ilocano."),
        ("5", "Send Button", "Action Button", "Transmits question to Gemini AI engine with streaming response."),
    ])

    # 4.2.16 OFFLINE MODE
    add_h3(doc, "4.2.16 Offline Mode Support & Sync Banner")
    add_p(doc, "Ensures continuous app usability during internet outages in provincial or mountainous church locations.")
    add_mockup_box(doc, "Offline Mode Sync Banner", "mobile", "[1] Offline Indicator Banner, [2] Cached Balances, [3] Queued Offline Actions, [4] Auto-Sync Trigger")
    add_ui_callouts_table(doc, [
        ("1", "Offline Banner", "Warning Bar", "Alerts member: 'You are currently offline. Cached data is displayed'."),
        ("2", "Cached Balances", "Offline Data", "Displays last synchronized savings balances, loans, and scripture."),
        ("3", "Offline Queue", "Local Storage", "Caches pending prayer requests and drafted loan applications locally."),
        ("4", "Auto-Sync Mechanism", "Background Task", "Automatically transmits queued actions to server once connection restores."),
    ])

    # 4.2.17 SETTINGS & SECURITY
    add_h3(doc, "4.2.17 Account Settings & Security")
    add_p(doc, "Manages account preferences, payment disbursement accounts, and security settings.")
    add_mockup_box(doc, "Settings & Security", "mobile", "[1] Change Password Option, [2] Saved Payment Accounts (GCash/Bank), [3] Push Notification Switches, [4] Privacy Policy Link, [5] Delete Account Option, [6] Log Out Button")
    add_ui_callouts_table(doc, [
        ("1", "Change Password", "Menu Item", "Update existing password with current password verification."),
        ("2", "Saved Payment Accounts", "Sub-screen", "Save preferred GCash mobile number or bank account for faster loan disbursements."),
        ("3", "Notification Settings", "Toggles", "Enable or mute push alerts for announcements, savings milestones, and loan approvals."),
        ("4", "Privacy Policy", "Web Link", "View church data privacy policy compliant with the Data Privacy Act of 2012."),
        ("5", "Delete Account", "Destructive Action", "Request permanent deletion of member account and personal data."),
        ("6", "Log Out Button", "Destructive Button", "Clears authentication tokens and safely exits the session."),
    ])

    out_file = r"c:\Users\gabri\OneDrive\Desktop\Capstone_Mobile\ISANGDIWA_USER_MANUAL.docx"
    doc.save(out_file)
    print(f"SUCCESS: User Manual saved to {out_file}")

if __name__ == "__main__":
    build_user_manual()
