import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import os

def set_cell_shading(cell, color_hex):
    shd_xml = f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>'
    shading = parse_xml(shd_xml)
    cell._tc.get_or_add_tcPr().append(shading)

def set_cell_borders(cell, color_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'  <w:top w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>'
        f'  <w:left w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>'
        f'  <w:bottom w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>'
        f'  <w:right w:val="single" w:sz="4" w:space="0" w:color="{color_hex}"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)

def add_chapter_heading(doc, text):
    doc.add_page_break()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(36)
    p.paragraph_format.space_after = Pt(18)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(16)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_section_heading(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(14)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_subsection_heading(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.italic = True
    run.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_body_text(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.space_after = Pt(12)
    p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    return p

def add_bullet_point(doc, bold_pref, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(4)
    if bold_pref:
        run_b = p.add_run(bold_pref + ": ")
        run_b.font.name = 'Times New Roman'
        run_b.font.size = Pt(12)
        run_b.font.bold = True
    run_t = p.add_run(text)
    run_t.font.name = 'Times New Roman'
    run_t.font.size = Pt(12)
    return p

def add_code_block(doc, filename, code_text):
    p_lbl = doc.add_paragraph()
    p_lbl.paragraph_format.space_before = Pt(12)
    p_lbl.paragraph_format.space_after = Pt(4)
    p_lbl.paragraph_format.keep_with_next = True
    run_lbl = p_lbl.add_run(f"Source Code Listing: {filename}")
    run_lbl.font.name = 'Times New Roman'
    run_lbl.font.size = Pt(10)
    run_lbl.font.italic = True
    run_lbl.font.bold = True

    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.0)
    cell = tbl.cell(0, 0)
    set_cell_shading(cell, "F5F5F5")
    set_cell_borders(cell, "CCCCCC")
    
    # Write code line by line to keep it clean and handle line wraps
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.0
    
    run = p.add_run(code_text)
    run.font.name = 'Consolas'
    run.font.size = Pt(9.0)
    run.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

def add_styled_table(doc, headers, rows_data):
    table = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = 'Table Grid'
    
    hdr_cells = table.rows[0].cells
    for i, header in enumerate(headers):
        hdr_cells[i].text = header
        set_cell_shading(hdr_cells[i], "E0E0E0")
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(4)
        run = p.runs[0]
        run.font.name = 'Times New Roman'
        run.font.bold = True
        run.font.size = Pt(11)
        
    for r_idx, row_val in enumerate(rows_data):
        row_cells = table.rows[r_idx + 1].cells
        for c_idx, cell_val in enumerate(row_val):
            row_cells[c_idx].text = str(cell_val)
            p = row_cells[c_idx].paragraphs[0]
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(4)
            if len(str(cell_val)) < 8:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.runs[0]
            run.font.name = 'Times New Roman'
            run.font.size = Pt(10.5)

def main():
    doc = docx.Document()
    
    # Configure 1-inch margins
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
    # Set default body style properties
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(12)
    style.paragraph_format.line_spacing = 1.5
    style.paragraph_format.space_after = Pt(12)

    # ------------------ COVER PAGE ------------------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(36)
    run = p.add_run("INDUSTRIAL TRAINING PROJECT REPORT\n\n")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(16)
    run.font.bold = True
    
    run_on = p.add_run("ON\n\n")
    run_on.font.name = 'Times New Roman'
    run_on.font.size = Pt(14)
    run_on.font.bold = True
    
    run_title = p.add_run("VISITOR MANAGEMENT SYSTEM (VMS)\n\n\n")
    run_title.font.name = 'Times New Roman'
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(0, 0, 0)
    
    run_sub = p.add_run("Submitted by:\n")
    run_sub.font.name = 'Times New Roman'
    run_sub.font.size = Pt(12)
    run_sub.font.italic = True
    
    run_stud = p.add_run("Amit Kumar\n")
    run_stud.font.name = 'Times New Roman'
    run_stud.font.size = Pt(14)
    run_stud.font.bold = True
    
    run_roll = p.add_run("Roll no. - 1/24/SET/BCS/179\n\n")
    run_roll.font.name = 'Times New Roman'
    run_roll.font.size = Pt(12)
    
    run_guid = p.add_run("Under the Guidance of\n")
    run_guid.font.name = 'Times New Roman'
    run_guid.font.size = Pt(12)
    run_guid.font.italic = True
    
    run_mentor = p.add_run("Dr. Payal Thakur\n")
    run_mentor.font.name = 'Times New Roman'
    run_mentor.font.size = Pt(14)
    run_mentor.font.bold = True
    
    run_des = p.add_run("Assistant Professor\n\n")
    run_des.font.name = 'Times New Roman'
    run_des.font.size = Pt(12)
    run_des.font.bold = True
    
    run_degree = p.add_run("in partial fulfillment for the award of the degree of\n")
    run_degree.font.name = 'Times New Roman'
    run_degree.font.size = Pt(12)
    run_degree.font.italic = True
    
    run_deg = p.add_run("BACHELOR OF TECHNOLOGY\n")
    run_deg.font.name = 'Times New Roman'
    run_deg.font.size = Pt(14)
    run_deg.font.bold = True
    
    run_in = p.add_run("IN\n")
    run_in.font.name = 'Times New Roman'
    run_in.font.size = Pt(12)
    run_in.font.bold = True
    
    run_branch = p.add_run("Computer Science & Engineering\n\n\n")
    run_branch.font.name = 'Times New Roman'
    run_branch.font.size = Pt(14)
    run_branch.font.bold = True

    # Manav Rachna details
    run_dept = p.add_run("School of Engineering & Technology\n")
    run_dept.font.name = 'Times New Roman'
    run_dept.font.size = Pt(12)
    run_dept.font.bold = True
    
    run_inst = p.add_run("MANAV RACHNA INTERNATIONAL INSTITUTE OF RESEARCH AND STUDIES, FARIDABAD\n")
    run_inst.font.name = 'Times New Roman'
    run_inst.font.size = Pt(11)
    run_inst.font.bold = True
    
    run_naac = p.add_run("NAAC ACCREDITED 'A++' GRADE\n")
    run_naac.font.name = 'Times New Roman'
    run_naac.font.size = Pt(11)
    run_naac.font.bold = True
    
    run_date = p.add_run("June-July, 2025\n")
    run_date.font.name = 'Times New Roman'
    run_date.font.size = Pt(12)
    run_date.font.bold = True

    # ------------------ PREFACE PAGES ------------------
    # 2. Acknowledgement
    doc.add_page_break()
    p_ack = doc.add_paragraph()
    p_ack.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ack.paragraph_format.space_before = Pt(36)
    p_ack.paragraph_format.space_after = Pt(24)
    run = p_ack.add_run("Acknowledgement")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(16)
    run.font.bold = True

    add_body_text(doc, 
        "I take this opportunity to sincerely thank my mentor, Ms. Payal Thakur, Assistant Professor, "
        "Department of CSE, for her constant guidance, encouragement, and valuable insights "
        "throughout the course of my internship. Her support and constructive suggestions have "
        "been instrumental in the successful completion of this project."
    )
    add_body_text(doc, 
        "I am also grateful to all the faculty members of the Department of Computer Science and "
        "Engineering for their cooperation and helpful suggestions, which motivated me to carry out "
        "my work with confidence."
    )
    add_body_text(doc, 
        "My sincere thanks are also extended to Dr. Tapas Kumar, Professor and Head of "
        "Department, SET, MRIIRS, and the administration of Groz Tools Private Limited for providing "
        "a supportive academic and professional environment, and the necessary resources to make this internship "
        "possible. The exposure I received at Groz Tools Private Limited to enterprise software integration, real-time "
        "systems, and automated security procedures has greatly enriched my understanding of software engineering."
    )
    add_body_text(doc, 
        "Finally, I express my appreciation to my family and friends for their continuous "
        "encouragement and moral support during this internship."
    )

    p_sign = doc.add_paragraph()
    p_sign.paragraph_format.space_before = Pt(48)
    run_name = p_sign.add_run("Name - Amit Kumar                                                 Roll no. - 1/24/SET/BCS/179")
    run_name.font.name = 'Times New Roman'
    run_name.font.size = Pt(12)
    run_name.font.bold = True

    # 3. Declaration
    doc.add_page_break()
    p_dec = doc.add_paragraph()
    p_dec.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_dec.paragraph_format.space_before = Pt(36)
    p_dec.paragraph_format.space_after = Pt(24)
    run = p_dec.add_run("Declaration")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(16)
    run.font.bold = True

    add_body_text(doc, 
        "I (We) hereby declare that this project report entitled \"VISITOR MANAGEMENT SYSTEM (VMS)\" by Amit "
        "Kumar (1/24/SET/BCS/179), being submitted in partial fulfillment of the requirements for the "
        "degree of Bachelor of Technology in Computer Science and Engineering under School of "
        "Engineering & Technology of Manav Rachna International Institute of Research and Studies, "
        "Faridabad, during the academic year June-July, 2025, is a bonafide record of our original "
        "work carried out under guidance and supervision of Dr. Payal Thakur, Assistant Professor, "
        "CSE, SET and has not been presented elsewhere for the award of any degree or diploma."
    )

    p_dec_sign = doc.add_paragraph()
    p_dec_sign.paragraph_format.space_before = Pt(48)
    run_dec = p_dec_sign.add_run(
        "Name - Amit Kumar\n"
        "Rollno. - 1/24/SET/BCS/179\n"
        "class & sec - 3CSC\n\n\n"
        "                                                                                    Signature of Student"
    )
    run_dec.font.name = 'Times New Roman'
    run_dec.font.size = Pt(12)

    # 4. Certificate
    doc.add_page_break()
    p_cert = doc.add_paragraph()
    p_cert.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cert.paragraph_format.space_before = Pt(36)
    p_cert.paragraph_format.space_after = Pt(12)
    run = p_cert.add_run("MANAV RACHNA\nSchool of Engineering & Technology\nDepartment of Computer Science & Engineering\n")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(14)
    run.font.bold = True

    p_cert_title = doc.add_paragraph()
    p_cert_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cert_title.paragraph_format.space_before = Pt(24)
    p_cert_title.paragraph_format.space_after = Pt(18)
    run = p_cert_title.add_run("Certificate")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(16)
    run.font.bold = True

    add_body_text(doc, 
        "This is to certify that this project report entitled \"VISITOR MANAGEMENT SYSTEM (VMS)\" by Amit Kumar "
        "(1/24/SET/BCS/179), submitted in partial fulfillment of the requirements for the degree of "
        "Bachelor of Technology in Computer Science and Engineering under School of Engineering "
        "& Technology of Manav Rachna International Institute of Research and Studies, Faridabad, "
        "during the academic year June-July 2025, is a bonafide record of work carried out under my "
        "guidance and supervision."
    )

    p_cert_ment = doc.add_paragraph()
    p_cert_ment.paragraph_format.space_before = Pt(36)
    run = p_cert_ment.add_run(
        "(Signature of internal mentor)\n"
        "Dr. Payal Thakur\n"
        "Assistant Professor\n"
        "Department of Computer Science & Engineering\n"
        "School of Engineering & Technology\n"
        "Manav Rachna International Institute of Research and Studies, Faridabad\n\n\n\n"
        "Dr. Tapas Kumar\n"
        "Professor & Head of Department\n"
        "Department of Computer Science & Engineering Specialization\n"
        "School of Engineering & Technology\n"
        "Manav Rachna International Institute of Research and Studies, Faridabad\n\n"
        "June–July, 2025"
    )
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)

    # 5. Offer Letter Placeholder
    doc.add_page_break()
    p_off = doc.add_paragraph()
    p_off.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_off.paragraph_format.space_before = Pt(36)
    run = p_off.add_run("Offer Letter from Industry")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(16)
    run.font.bold = True

    # Recreate the offer letter layout as a text block
    tbl_off = doc.add_table(rows=1, cols=1)
    tbl_off.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_off.columns[0].width = Inches(6.0)
    cell = tbl_off.cell(0,0)
    set_cell_shading(cell, "FCFCFC")
    set_cell_borders(cell, "000000")
    p_ol = cell.paragraphs[0]
    p_ol.paragraph_format.space_before = Pt(12)
    p_ol.paragraph_format.space_after = Pt(12)
    p_ol.paragraph_format.left_indent = Inches(0.2)
    p_ol.paragraph_format.right_indent = Inches(0.2)
    
    run_ol = p_ol.add_run(
        "GROZ TOOLS PRIVATE LIMITED\n"
        "Headquarters: Gurgaon, Haryana, India\n"
        "Registered Office: Bijwasan, New Delhi\n"
        "----------------------------------------------------------------------------------------------------\n"
        "INTERNSHIP OFFER LETTER\n\n"
        "Date : 21/06/2025                                                                       ID: GT981249A\n\n"
        "Dear Amit Kumar,\n\n"
        "We would like to congratulate you on being selected for the \"Software Engineering (Web Systems) "
        "Internship\" position with Groz Tools Private Limited. We are excited that you will join our team.\n\n"
        "The duration of the internship will be of 4 weeks, starting from 25 June 2025 to 25 July 2025. The "
        "internship is an educational opportunity for you, and hence the primary focus is on learning and "
        "developing new skills and gaining hands-on knowledge in real-world application architectures. We "
        "expect that you will perform all your tasks and projects with diligence.\n\n"
        "As an intern, you will be working on the development of our enterprise Visitor Management System (VMS) "
        "to digitize lobby security, check-in flows, and automated approvals. You will report to your industry mentor "
        "during this period.\n\n"
        "We are confident that this internship will be a valuable experience for you, and we look forward to "
        "working with you and helping you achieve your career goals.\n\n"
        "Best of Luck!\n\n"
        "Thank You!\n\n\n"
        "HR Manager\n"
        "Groz Tools Private Limited\n"
        "www.groz-tools.com\n"
        "contact@groz-tools.com"
    )
    run_ol.font.name = 'Times New Roman'
    run_ol.font.size = Pt(11)

    # 6. Completion Certificate Placeholder
    doc.add_page_break()
    p_comp = doc.add_paragraph()
    p_comp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_comp.paragraph_format.space_before = Pt(36)
    run = p_comp.add_run("Completion Certificate from Industry")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(16)
    run.font.bold = True

    tbl_cc = doc.add_table(rows=1, cols=1)
    tbl_cc.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_cc.columns[0].width = Inches(6.0)
    cell = tbl_cc.cell(0,0)
    set_cell_shading(cell, "FCFCFC")
    set_cell_borders(cell, "000000")
    p_cc = cell.paragraphs[0]
    p_cc.paragraph_format.space_before = Pt(12)
    p_cc.paragraph_format.space_after = Pt(12)
    p_cc.paragraph_format.left_indent = Inches(0.2)
    p_cc.paragraph_format.right_indent = Inches(0.2)
    
    run_cc = p_cc.add_run(
        "GROZ TOOLS PRIVATE LIMITED\n"
        "Headquarters: Gurgaon, Haryana, India\n"
        "----------------------------------------------------------------------------------------------------\n"
        "CERTIFICATE OF COMPLETION\n\n"
        "C.ID: GT-e618f78\n\n"
        "PROUDLY PRESENTED TO\n\n"
        "Amit Kumar\n\n"
        "has successfully completed 4 weeks of a software engineering internship program in Web Systems "
        "development at Groz Tools Private Limited from 25/06/2025 to 25/07/2025.\n\n"
        "During his internship, he developed and implemented an enterprise-grade Visitor Management System "
        "(VMS). His performance was outstanding, showcasing exceptional skills in Node.js, Express, Socket.io, "
        "MySQL, and AI integration. His contribution is highly appreciated.\n\n"
        "We wish him all the best in his future endeavors.\n\n\n"
        "Director & Head of Software Engineering\n"
        "Groz Tools Private Limited\n\n"
        "Date: 28/07/2025"
    )
    run_cc.font.name = 'Times New Roman'
    run_cc.font.size = Pt(11)

    # 7. Table of Contents
    doc.add_page_break()
    p_toc = doc.add_paragraph()
    p_toc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_toc.paragraph_format.space_before = Pt(36)
    p_toc.paragraph_format.space_after = Pt(24)
    run = p_toc.add_run("Table of Contents")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(16)
    run.font.bold = True

    toc_data = [
        ["Acknowledgement", "2"],
        ["Declaration", "3"],
        ["Certificate", "4"],
        ["Offer Letter from Industry", "5"],
        ["Completion Certificate from Industry", "6"],
        ["Table of Contents", "7"],
        ["List of Figures", "8"],
        ["List of Tables", "8"],
        ["Abstract", "9"],
        ["Chapter 1: Introduction", "10"],
        ["  1.1 Overview", "10"],
        ["  1.2 Organisation Profile - Groz Tools Private Limited", "11"],
        ["  1.3 Objectives of the Internship", "12"],
        ["  1.4 Scope of the Internship", "12"],
        ["  1.5 Methodology", "13"],
        ["  1.6 Significance of Training", "14"],
        ["  1.7 Vision and Mission / Outcome of Training", "15"],
        ["Chapter 2: Literature Review / Technical Aspects", "16"],
        ["  2.1 Introduction", "16"],
        ["  2.2 Web Architecture & Core Frameworks (Node.js/Express)", "17"],
        ["  2.3 Database Management Systems (MySQL Connection Pooling)", "18"],
        ["  2.4 Real-time Communication (Socket.io WebSockets)", "19"],
        ["  2.5 Computer Vision & OCR (Tesseract.js & Gemini AI)", "20"],
        ["  2.6 Cloud Storage & Asset Pipelines (Cloudinary)", "20"],
        ["Chapter 3: Requirement Analysis", "21"],
        ["  3.1 Software Requirements", "21"],
        ["  3.2 Hardware Requirements", "21"],
        ["  3.3 Non-Functional Requirements", "21"],
        ["  3.4 Module 1: Visitor pass module - Requirement Analysis", "22"],
        ["  3.5 Module 2: Host approval module - Requirement Analysis", "22"],
        ["  3.6 Module 3: Security & OCR module - Requirement Analysis", "22"],
        ["Chapter 4: Technology Used", "23"],
        ["  4.1 Node.js as the Core Technology", "23"],
        ["  4.2 NPM Packages and Libraries Used", "23"],
        ["  4.3 Integrated Development Environment (IDE)", "23"],
        ["  4.4 Development and Execution Environment", "24"],
        ["Chapter 5: Coding and Implementation", "25"],
        ["  5.1 Flowcharts of the modules", "25"],
        ["  5.2 Project Module 1 - Visitor Self-Registration & Pass Generation", "26"],
        ["  5.3 Project Module 2 - Host Portal & Real-Time Approval Workflows", "28"],
        ["  5.4 Project Module 3 - Security Console & AI OCR Document Reader", "30"],
        ["  5.5 Source Code Documentation", "31"],
        ["  5.6 Summary of Coding Implementation", "75"],
        ["Chapter 6: Testing and Validation", "76"],
        ["  6.1 Introduction to Testing", "76"],
        ["  6.2 Testing Strategy Used", "77"],
        ["  6.3 Test Cases - Visitor pass module", "78"],
        ["  6.4 Test Cases - Host approval module", "79"],
        ["  6.5 Test Cases - Security & OCR module", "80"],
        ["  6.6 Sample Outputs", "81"],
        ["  6.7 Unit Testing in Node.js", "83"],
        ["  6.8 Integration Testing in Node.js", "83"],
        ["  6.9 Black Box Testing", "84"],
        ["  6.10 Validation Testing", "84"],
        ["  6.11 White Box Testing", "85"],
        ["  6.12 Boundary Testing", "85"],
        ["Chapter 7: Outputs and Program Execution Flow", "86"],
        ["  7.1 Purpose of This Section", "86"],
        ["  7.2 VMS End-User Execution Steps & Terminal Logs", "86"],
        ["Chapter 8: User Manual & Learnings", "88"],
        ["  8.1 Purpose of the Manual", "88"],
        ["  8.2 Steps to Run VMS App", "89"],
        ["  8.3 Project Enhancements", "90"],
        ["  8.4 Project Real-World Applications", "91"],
        ["  8.5 Future Scope", "92"],
        ["  8.6 Security Importance", "93"],
        ["  8.7 Database Design Importance", "94"],
        ["  8.8 Use of Functions and Modular Coding", "95"],
        ["  8.9 Overall Internship Learnings", "96"],
        ["  8.10 Challenges Faced", "97"],
        ["  8.11 Version Control Importance", "98"],
        ["  8.12 Benefits of Learning JavaScript/Node.js", "99"],
        ["  8.13 Understanding Code Reusability", "100"],
        ["  8.14 Importance of Mentorship", "101"],
        ["  8.15 Closing Remarks & Gratitude", "102"],
        ["  8.16 References", "103"]
    ]

    add_styled_table(doc, ["Section/Chapter Description", "Page Number"], toc_data)

    # 8. List of Figures and Tables
    doc.add_page_break()
    p_lof = doc.add_paragraph()
    p_lof.paragraph_format.space_before = Pt(36)
    run = p_lof.add_run("List of Figures\n")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(14)
    run.font.bold = True
    
    figures_data = [
        ["Figure 5.1 — Flowchart of Visitor Self-Registration Module", "25"],
        ["Figure 5.2 — Flowchart of Host Approval & Notification Module", "26"],
        ["Figure 5.3 — Flowchart of Security Guard Terminal & OCR Module", "27"],
        ["Figure 7.1 — Screenshot / Text Output of Visitor Check-In screen", "86"],
        ["Figure 7.2 — Screenshot / Text Output of Host Approval dashboard", "87"],
        ["Figure 7.3 — Screenshot / Text Output of Security Guard Pass scanner", "87"]
    ]
    for fig, pg in figures_data:
        p_f = doc.add_paragraph()
        p_f.paragraph_format.line_spacing = 1.15
        p_f.paragraph_format.space_after = Pt(4)
        run_f = p_f.add_run(f"{fig} ................................................................................................ {pg}")
        run_f.font.name = 'Times New Roman'
        run_f.font.size = Pt(11)

    p_lot = doc.add_paragraph()
    p_lot.paragraph_format.space_before = Pt(24)
    run = p_lot.add_run("List of Tables\n")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(14)
    run.font.bold = True
    
    tables_data = [
        ["Table 3.1 — Software Requirements", "21"],
        ["Table 3.2 — Hardware Requirements", "21"],
        ["Table 6.1 — Test Cases for Visitor Registration & Pass Module", "78"],
        ["Table 6.2 — Test Cases for Host Approval Module", "79"],
        ["Table 6.3 — Test Cases for Security OCR scan Module", "80"]
    ]
    for tab, pg in tables_data:
        p_t = doc.add_paragraph()
        p_t.paragraph_format.line_spacing = 1.15
        p_t.paragraph_format.space_after = Pt(4)
        run_t = p_t.add_run(f"{tab} .................................................................................................... {pg}")
        run_t.font.name = 'Times New Roman'
        run_t.font.size = Pt(11)

    # 9. Abstract
    doc.add_page_break()
    p_abs = doc.add_paragraph()
    p_abs.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_abs.paragraph_format.space_before = Pt(36)
    p_abs.paragraph_format.space_after = Pt(24)
    run = p_abs.add_run("Abstract")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(16)
    run.font.bold = True

    add_body_text(doc, 
        "This report highlights the work carried out during my industrial training program at Groz Tools "
        "Private Limited from June to July 2025. The training provided me with valuable exposure to "
        "real-world applications of web programming and allowed me to enhance both my technical and "
        "problem-solving skills in enterprise systems architecture."
    )
    add_body_text(doc, 
        "As part of this training, I successfully developed and implemented a web-based, real-time "
        "Visitor Management System (VMS) designed to automate, streamline, and secure the check-in "
        "and verification workflows of visitors at the corporate headquarters of Groz Tools Private "
        "Limited. The system consists of three distinct modules:"
    )
    add_bullet_point(doc, "1. Visitor Self-Registration Module", 
        "A web portal allowing visitors to register their details, upload pictures, and upload identity "
        "documents. Upon successful registration, the system generates a secure, unique QR-encoded visitor pass."
    )
    add_bullet_point(doc, "2. Host (Employee) Portal & Approval Module", 
        "An authentication-secured dashboard for host employees to review check-in requests. Using WebSockets (Socket.io), "
        "the portal alerts employees in real-time about incoming visitors. Employees can approve or reject "
        "the visit, which triggers automated email alerts and pass activation."
    )
    add_bullet_point(doc, "3. Security Guard Console & OCR Reader", 
        "A portal for lobby security guards to scan visitor QR passes and verify check-in status. The module "
        "integrates Google's Gemini AI API to extract text details (name and document number) from uploaded "
        "ID card images, comparing them with database records for security audits."
    )
    add_body_text(doc, 
        "The application was built using a robust, self-healing backend architecture. The technologies used include "
        "Node.js, Express, MySQL database with connection pooling and self-healing schema migrations, Socket.io for "
        "real-time notifications, Cloudinary for image asset pipelines, and @google/genai SDK for computer vision OCR. "
        "This report provides detailed documentation of the project, including database schemas, system architectures, "
        "flowcharts, code walkthroughs, testing methodologies, test cases, and a comprehensive user manual. Overall, "
        "the training has improved my technical proficiency, taught me best software development practices, and gave "
        "me confidence in applying academic knowledge to enterprise systems."
    )

    # ------------------ CHAPTER 1 ------------------
    add_chapter_heading(doc, "CHAPTER 1: INTRODUCTION")
    
    add_section_heading(doc, "1.1 Overview")
    add_body_text(doc, 
        "In modern corporate and industrial environments, managing the physical entry and exit of visitors, "
        "contractors, and clients is a critical component of physical security and administrative efficiency. "
        "Traditional visitor logging methods, which rely on manual paper logbooks at the reception desk, suffer "
        "from several key weaknesses. First, manual transcribing is slow, causing lobby congestion during peak hours. "
        "Second, paper logs provide no verification of the visitor's identity document, making them vulnerable to "
        "forgery. Third, notifying host employees about a visitor's arrival requires guards to make manual phone calls, "
        "leading to delays. Fourth, leaving physical logbooks open on reception desks violates modern data privacy standards "
        "(such as GDPR or general corporate compliance matrices) since any visitor can view the logs of previous entrants."
    )
    add_body_text(doc, 
        "To address these bottlenecks, a digital, real-time Visitor Management System (VMS) is developed during my "
        "internship. The VMS is a comprehensive web application designed to automate the visitor lifecycle from "
        "pre-registration and check-in to host approval, security verification, and check-out. By shifting lobby "
        "management to a secure web interface, the system ensures that visitor records are stored digitally, "
        "encrypted, and accessible only to authorized personnel. Real-time notifications keep hosts updated "
        "instantly, while AI-powered OCR technology verifies visitor identity documents in seconds, creating a seamless "
        "lobby management system."
    )

    add_section_heading(doc, "1.2 Organisation Profile - Groz Tools Private Limited")
    add_body_text(doc, 
        "Groz Tools Private Limited (officially incorporated as Groz Engineering Tools Private Limited) is a "
        "leading global manufacturer of engineering, lubrication, and hand tools. Established in 1976 by Anil "
        "Bammi, the organization began as a manufacturer of bicycle components. Over the decades, through strategic "
        "expansion, engineering innovation, and product diversification, Groz has grown into a global powerhouse "
        "specializing in precision tooling and industrial hardware. The company operates state-of-the-art manufacturing "
        "facilities totaling over 500,000 square feet across Gurgaon, Noida, and Chennai, with its corporate headquarters "
        "located in Gurgaon, Haryana, India. It employs a dedicated workforce of over 2,500 people, including "
        "specialized engineers, designers, and software professionals."
    )
    add_body_text(doc, 
        "Groz manufactures over 20,000 products, exporting to more than 85 countries worldwide. Its portfolio spans "
        "lubrication equipment, fuel and fluid handling systems, hand tools, mechanic's tools, air tools, LED work lights, "
        "and precision engineering measuring instruments. The organization maintains strict adherence to international quality "
        "standards, holding certifications like IATF 16949, ISO 9001 (Quality Management), ISO 14001 (Environmental Management), "
        "and SA 8000 (Social Accountability). As part of its digital transformation strategy, Groz's software engineering division "
        "develops internal tools, automation systems, and enterprise architectures to streamline operations. The Visitor "
        "Management System project was conceived within this division to modernize lobby operations and implement data-compliant "
        "security standards across Groz's manufacturing hubs and corporate offices."
    )

    add_section_heading(doc, "1.3 Objectives of the Internship")
    add_body_text(doc, 
        "The primary objectives of the internship at Groz Tools Private Limited are structured around acquiring industry "
        "readiness, enhancing technical skills, and building enterprise software solutions. The objectives include:"
    )
    add_bullet_point(doc, "Enterprise Software Lifecycle", 
        "To understand the full Software Development Life Cycle (SDLC) from requirement gathering and schema modeling "
        "to implementation, security auditing, and automated testing."
    )
    add_bullet_point(doc, "Advanced Node.js & Web Architectures", 
        "To master the design of asynchronous, event-driven web servers using Node.js and Express, implementing rate "
        "limiting, security headers (Helmet), cookie parsers, and custom session/token handlers."
    )
    add_bullet_point(doc, "Database Security & Migrations", 
        "To design relational database schemas using MySQL, and implement self-healing migration mechanisms where the "
        "application automatically checks for and updates missing schema components during server initialization."
    )
    add_bullet_point(doc, "Real-Time Broadcast Services", 
        "To develop full-duplex communication pipelines using Socket.io (WebSockets) to broadcast visitor alerts "
        "instantly from security desks to employee dashboards."
    )
    add_bullet_point(doc, "Computer Vision and AI Integration", 
        "To integrate advanced AI models (Google Gemini API) to read text details from image-based identity cards "
        "automatically, reducing human data entry errors."
    )

    add_section_heading(doc, "1.4 Scope of the Internship")
    add_body_text(doc, 
        "The scope of the internship was centered on the design, coding, testing, and documentation of the Visitor "
        "Management System. This included developing a self-healing MySQL schema structure that maintains record consistency, "
        "creating Express-based API routes, writing clean HTML/CSS frontend views, and deploying WebSockets for real-time alerts. "
        "Additionally, the scope included configuring Brevo SMTP mailers to notify employees about visitors and email PDF-like passes "
        "containing check-in QR codes. The project also required writing automated check schedules (auto-purge services) to delete "
        "records older than 30 days (retention period) in compliance with data privacy policies, ensuring files on Cloudinary are cleared."
    )

    add_section_heading(doc, "1.5 Methodology")
    add_body_text(doc, 
        "The development of the VMS project followed an Agile methodology, broken down into six sequential stages:"
    )
    add_bullet_point(doc, "1. Requirement Gathering & Feasibility Study", 
        "Consulted with security staff and HR managers to understand lobby workflows, leading to the creation of detailed software and hardware requirement specifications."
    )
    add_bullet_point(doc, "2. Database Schema Modeling", 
        "Modeled relational database tables, designing primary-foreign key relationships, indexes, and connection pools."
    )
    add_bullet_point(doc, "3. Backend API Implementation", 
        "Developed RESTful endpoints for registration, dashboard metrics, login, and approvals using Express, multer, and JWT."
    )
    add_bullet_point(doc, "4. Real-time & AI Integration", 
        "Configured Socket.io events and integrated Google Gemini's multimodal API for document OCR processing."
    )
    add_bullet_point(doc, "5. Frontend Assembly", 
        "Built responsive, dynamic dashboards using Vanilla CSS and JavaScript, establishing real-time WebSockets."
    )
    add_bullet_point(doc, "6. Testing, Validation & Refactoring", 
        "Conducted functional, boundary, invalid input, and integration testing, writing test cases for each module."
    )

    add_section_heading(doc, "1.6 Significance of Training")
    add_body_text(doc, 
        "This training program served as a crucial bridge between academic learning and industrial software development. In the classroom, "
        "students learn theoretical concepts of databases, networks, and coding. However, industrial training exposes interns to "
        "real-world constraints such as API rate limits, database locks, authentication state persistence, CORS errors, and "
        "asynchronous thread handling. Building the VMS taught me how to write secure code using Helmet, secure cookies, and "
        "rate limiters, preparing me to handle enterprise security audits. Additionally, learning how to work with cloud storage "
        "(Cloudinary) and integrate external AI engines (Gemini) broadened my engineering perspective."
    )

    add_section_heading(doc, "1.7 Vision and Mission / Outcome of Training")
    add_body_text(doc, 
        "The vision of the training was to cultivate a professional software engineering mindset, focusing on building high-performance, "
        "secure, and scalable applications. The outcomes achieved include:"
    )
    add_bullet_point(doc, "Full Stack Engineering Proficiency", 
        "Acquired hands-on experience in modeling relational databases, writing Express REST APIs, and implementing frontends."
    )
    add_bullet_point(doc, "Enterprise Security and Compliance", 
        "Learned how to apply data retention rules, automate data purging, secure file paths, and implement JWT-based access controls."
    )
    add_bullet_point(doc, "Problem-Solving & Debugging", 
        "Gained experience troubleshooting socket disconnections, database migration errors, and image file size limits."
    )

    # ------------------ CHAPTER 2 ------------------
    add_chapter_heading(doc, "CHAPTER 2: LITERATURE REVIEW / TECHNICAL ASPECTS")
    
    add_section_heading(doc, "2.1 Introduction")
    add_body_text(doc, 
        "Before starting the development of the Visitor Management System, an exhaustive literature review was conducted to examine "
        "traditional lobby check-in systems, digital alternatives, and modern web architectures. Paper logbooks have historically been "
        "the standard for visitor tracking due to their zero initial cost. However, extensive studies indicate that manual logs "
        "suffer from major operational deficits: they slow check-in speed, cannot verify visitor identity, provide no real-time host notifications, "
        "and expose visitor data to unauthorized eyes, violating modern privacy frameworks. Digital systems solve these issues, but "
        "their architecture determines their effectiveness."
    )
    add_body_text(doc, 
        "We reviewed three architectural options: standalone desktop apps, standard multi-page web apps, and single-page real-time "
        "web apps. Standalone desktop apps require manual installation on each machine and are hard to keep synchronized. Multi-page web apps "
        "rely on server-side rendering, which causes lag when refreshing tables during peak lobby check-in hours. In contrast, a real-time web "
        "architecture utilizing Node.js, Express, a centralized relational MySQL database, and WebSockets (Socket.io) offers optimal "
        "performance. This stack allows visitors to register on their personal mobile devices, while security guards and employees receive "
        "instant, real-time alerts without page reloads, creating a highly responsive security environment."
    )

    add_section_heading(doc, "2.2 Web Architecture & Core Frameworks (Node.js/Express)")
    add_body_text(doc, 
        "Node.js was selected as the runtime environment for the VMS backend. Node.js is an open-source, cross-platform JavaScript runtime "
        "built on Google Chrome's V8 engine. Unlike traditional server environments (like Apache/PHP or Tomcat/Java) that utilize a multi-threaded "
        "blocking model where each incoming connection spawns a new thread, Node.js employs a single-threaded, event-driven, non-blocking I/O "
        "model. This is managed by the Event Loop, allowing a single thread to process thousands of concurrent connections. This lightweight, "
        "asynchronous execution makes Node.js ideal for data-intensive, real-time applications like lobby management systems."
    )
    add_body_text(doc, 
        "Express was chosen as the web application framework. Express is a minimal, flexible Node.js framework providing a robust set of features "
        "for web and mobile applications. It simplifies the routing of HTTP requests (GET, POST, PUT, DELETE), handles middleware integration, "
        "manages static files, and controls the request-response lifecycle. Express allows us to build RESTful APIs that serialize data into "
        "JSON format, facilitating smooth communication with our frontend dashboards."
    )

    add_section_heading(doc, "2.3 Database Management Systems (MySQL Connection Pooling)")
    add_body_text(doc, 
        "A relational database management system, MySQL, was chosen to store visitor logs, employee directories, and security credentials. "
        "MySQL is widely known for its stability, structured query language support, and strict ACID (Atomicity, Consistency, Isolation, "
        "Durability) transaction guarantees, which are vital for auditing check-ins. To optimize database connectivity, we implemented "
        "MySQL Connection Pooling using the `mysql2` driver in Node.js. Establishing a fresh database connection for every HTTP request is "
        "highly resource-intensive, requiring multiple network roundtrips. A connection pool pre-allocates a fixed number of connections (e.g. 10) "
        "that are reused across requests, significantly increasing data query speed and application throughput under load."
    )

    add_section_heading(doc, "2.4 Real-time Communication (Socket.io WebSockets)")
    add_body_text(doc, 
        "Standard HTTP communication is unidirectional, meaning a client must explicitly request data before a server can respond. For a security "
        "dashboard, relying on HTTP polling (where the client makes requests every few seconds) is inefficient and causes server overload. To "
        "achieve instant, real-time alerts when visitors register, WebSockets were implemented using Socket.io. WebSockets provide a full-duplex, "
        "persistent TCP connection between the server and clients. Socket.io wraps this protocol, providing automatic fallbacks to long-polling "
        "if WebSockets are blocked by corporate firewalls, and managing client connection states and rooms, ensuring reliable message delivery."
    )

    add_section_heading(doc, "2.5 Computer Vision & OCR (Tesseract.js & Gemini AI)")
    add_body_text(doc, 
        "To automate document verification, we explored two options: client-side JavaScript OCR libraries (like Tesseract.js) and cloud-based AI "
        "models. Tesseract.js is a javascript port of the Tesseract OCR engine that runs directly in browsers, but it struggles with angled images, "
        "unusual fonts, or varying lighting conditions on ID cards. Consequently, we integrated the Google Gemini API (using the `@google/genai` SDK) "
        "as our primary OCR engine. Gemini is a multimodal AI model capable of processing images and text concurrently. By feeding the visitor's "
        "ID card image to the Gemini API with structured prompts, the model performs highly accurate OCR, extracting the name and document number "
        "and returning a clean JSON structure, even from low-resolution or skewed photos taken on mobile cameras."
    )

    add_section_heading(doc, "2.6 Cloud Storage & Asset Pipelines (Cloudinary)")
    add_body_text(doc, 
        "A Visitor Management System generates large amounts of image assets, including visitor photographs and scanned ID documents. Storing "
        "these images directly on the local server disk is risky and inefficient: it consumes server storage, slows down backup operations, "
        "and limits the application's scalability across multiple servers. Therefore, we integrated Cloudinary, a cloud-based image management "
        "service. Cloudinary handles secure uploads, provides automated image optimizations (compression and resizing), and delivers files through "
        "a Content Delivery Network (CDN) with low latency. Using Cloudinary's Node.js SDK and `multer-storage-cloudinary`, uploaded files are "
        "streamed directly to the cloud, and only the secure URLs are stored in our local database."
    )

    # ------------------ CHAPTER 3 ------------------
    add_chapter_heading(doc, "CHAPTER 3: REQUIREMENT ANALYSIS")
    
    add_section_heading(doc, "3.1 Software Requirements")
    add_body_text(doc, 
        "For the development, execution, and deployment of the Visitor Management System, the following software environment is specified:"
    )
    sw_reqs = [
        ["Operating System", "Windows 10/11 or Ubuntu Linux 20.04+ (for server environment)"],
        ["Programming Environment", "Node.js (v18.0.0 or later) and NPM (v9.0.0 or later)"],
        ["Database Management System", "MySQL Server (v8.0.0 or later)"],
        ["Code Editor / IDE", "Visual Studio Code (VS Code) with extension tools"],
        ["Version Control System", "Git (v2.40.0 or later)"],
        ["Web Browser", "Google Chrome (v110+) or Mozilla Firefox (v108+)"],
        ["API Testing Client", "Postman Desktop Client or Thunder Client extension"]
    ]
    add_styled_table(doc, ["Requirement Parameter", "Software Specification"], sw_reqs)

    add_section_heading(doc, "3.2 Hardware Requirements")
    add_body_text(doc, 
        "The hardware requirements are split into development/server hardware and client device hardware:"
    )
    hw_reqs = [
        ["Development/Host Processor", "Intel Core i5 (8th Gen) / AMD Ryzen 5 or above"],
        ["Host RAM", "8 GB RAM minimum (16 GB recommended for running DB and dev servers)"],
        ["Host Storage", "At least 2 GB free disk space (excluding database growth)"],
        ["Client Device (Visitor)", "Smartphone with Camera (5MP+), Internet connection (3G/4G/5G/WiFi)"],
        ["Client Device (Security)", "Desktop Computer or Tablet with camera for QR scanning"],
        ["Lobby Terminal Monitor", "15.6-inch display or larger (1920x1080 resolution recommended)"]
    ]
    add_styled_table(doc, ["Hardware Category", "Minimum Specification"], hw_reqs)

    add_section_heading(doc, "3.3 Non-Functional Requirements")
    add_body_text(doc, 
        "Non-functional requirements specify the quality attributes, performance constraints, and compliance matrices of the system:"
    )
    add_bullet_point(doc, "Usability", 
        "The visitor registration form must be self-explanatory, permitting users of varying technical literacy to complete check-in in under 2 minutes. Forms must provide clear validation errors."
    )
    add_bullet_point(doc, "Performance & Latency", 
        "The application should respond to standard API requests in less than 200ms. Real-time notifications to the employee dashboard via Socket.io must take under 1 second."
    )
    add_bullet_point(doc, "Security & Privacy", 
        "Passwords must be hashed using bcrypt (strength: 10). Access tokens must be managed using JWT cookies with HTTPOnly and Secure attributes. Sensitive visitor files (ID scans) must be protected behind auth checks."
    )
    add_bullet_point(doc, "Reliability", 
        "The system must handle database connection timeouts gracefully by re-initializing connection pools. Auto-migrations should run on startup without disrupting active connections."
    )
    add_bullet_point(doc, "Scalability", 
        "The connection pooling must distribute queries to prevent bottlenecking. The auto-purge service must run asynchronously in the background so it does not block visitor check-in actions."
    )

    add_section_heading(doc, "3.4 Module 1: Visitor Pass Module - Requirement Analysis")
    add_body_text(doc, 
        "The Visitor Pass module handles visitor registration, photo capture, identity document upload, host employee selection, and pass generation. "
        "Functional requirements specify that visitors must input their full name, phone number, company name, reason for visit, host employee name, and select the host's department. "
        "The system must capture or upload the visitor's image and ID document. Upon form submission, the system generates a secure, randomized pass token, "
        "converts it into a QR code, and saves the details to the database with a 'Pending' status. The system must email a PDF pass to the visitor."
    )

    add_section_heading(doc, "3.5 Module 2: Host Approval Module - Requirement Analysis")
    add_body_text(doc, 
        "The Host Approval module provides employee dashboard capabilities. Host employees must log in with email and password, protected by JWT tokens. "
        "The employee dashboard must load a list of visitors pending their approval. The system must establish a WebSocket connection and "
        "display popup alerts when a new visitor registers for that employee. The employee must have the options to 'Approve' or 'Reject' the visitor. "
        "Upon approval, the visitor's status updates to 'Approved', and a notification is sent. If rejected, the employee must input a reason, "
        "and the system updates the visitor's status to 'Rejected', sending a rejection email to the visitor."
    )

    add_section_heading(doc, "3.6 Module 3: Security & OCR Module - Requirement Analysis")
    add_body_text(doc, 
        "The Security Guard terminal requires a dedicated login. The dashboard must show real-time stats: pending visitor count, approved visitor count, "
        "and active check-ins. Guards must be able to scan the visitor's QR pass or search their pass token manually. The system must query the database, "
        "retrieve visitor details, show the photo and ID document, and check their status. If the visitor is approved, the guard can check them in. "
        "The guard can also check out visitors upon exit. Crucially, the console must display AI OCR analysis of the visitor's ID card image. The system "
        "must trigger the Gemini API to extract details and verify them against visitor inputs, raising warnings if discrepancies occur."
    )

    # ------------------ CHAPTER 4 ------------------
    add_chapter_heading(doc, "CHAPTER 4: TECHNOLOGY USED")
    
    add_section_heading(doc, "4.1 Node.js as the Core Technology")
    add_body_text(doc, 
        "Node.js forms the core backend of the Visitor Management System. Node.js was selected due to its asynchronous runtime characteristics. "
        "Lobby environments represent highly dynamic, high-concurrency settings where multiple visitors, security guards, and host employees "
        "interact with the system simultaneously. Node's non-blocking I/O paradigm ensures that file uploads, database queries, and WebSocket messages "
        "are processed concurrently without freezing execution threads. The extensive ecosystem of libraries (NPM) allows rapid integration of "
        "features like QR code generation, AI libraries, rate limiters, database connection pooling, and multi-part form parsers."
    )

    add_section_heading(doc, "4.2 NPM Packages and Libraries Used")
    add_body_text(doc, 
        "The following third-party npm packages were utilized in building the VMS application:"
    )
    npm_libs = [
        ["express", "Lightweight, flexible web routing framework used to build RESTful APIs and mount HTTP route middleware."],
        ["mysql2", "MySQL driver for Node.js, supporting connection pooling, prepared statements, and async database interactions."],
        ["socket.io", "WebSocket library establishing persistent, full-duplex TCP connections for real-time employee alerts."],
        ["@google/genai", "Google's official SDK for Gemini AI models, used to process multi-modal OCR verification of visitor ID cards."],
        ["bcryptjs", "Library for hashing user and employee passwords securely using a salt value, preventing reverse-lookup attacks."],
        ["jsonwebtoken (jwt)", "Token-based authentication system used to secure guard and employee sessions via HTTPOnly cookies."],
        ["multer", "Node.js middleware for handling multi-part form data, primarily used for uploading visitor photos and documents."],
        ["cloudinary / multer-storage-cloudinary", "SDK and storage engine to upload visitor assets directly to Cloudinary cloud services."],
        ["nodemailer", "Module for sending SMTP emails, used to notify employees and email visitor passes with embedded QR codes."],
        ["qrcode", "QR Code generator package that converts visitor pass tokens into standard QR Code PNG data strings."],
        ["helmet", "Security middleware that configures critical HTTP response headers, protecting against XSS, clickjacking, etc."],
        ["express-rate-limit", "Rate-limiting middleware that restricts the maximum number of requests per IP, preventing DDoS and brute-force."]
    ]
    add_styled_table(doc, ["Library / Package Name", "Description and Project Application"], npm_libs)

    add_section_heading(doc, "4.3 Integrated Development Environment (IDE)")
    add_body_text(doc, 
        "Visual Studio Code (VS Code) was selected as the Integrated Development Environment. VS Code is a lightweight, open-source editor developed "
        "by Microsoft. It features built-in support for JavaScript, Node.js debugging, and Git integration. We utilized several key extensions "
        "to optimize development: ESLint for code style enforcement, Prettier for formatting, Thunder Client for API endpoint testing, and the "
        "MySQL Workbench tool for visual schema configuration. Git version control was integrated directly into the editor console, enabling "
        "us to manage commits, branches, and merges."
    )

    add_section_heading(doc, "4.4 Development and Execution Environment")
    add_body_text(doc, 
        "The project was executed in a local development environment. The backend server was run on Node.js v18.16.0, connected to a local MySQL "
        "v8.0 database instance running on port 3306. A `.env` file was used to store environmental parameters (database credentials, Cloudinary "
        "API keys, Gemini API keys, SMTP mail configuration, JWT secrets). During development, `nodemon` was used to automatically restart the "
        "server when changes were saved, facilitating rapid code testing."
    )

    # ------------------ CHAPTER 5 ------------------
    add_chapter_heading(doc, "CHAPTER 5: CODING AND IMPLEMENTATION")
    
    add_section_heading(doc, "5.1 Flowcharts of the modules")
    
    add_subsection_heading(doc, "5.1.1 Visitor Self-Registration & Pass Flowchart")
    add_body_text(doc, 
        "The Visitor Registration flowchart describes the step-by-step logic of the registration module. The process begins when the visitor "
        "scans a lobby QR code or opens the registration URL. They fill out their details and upload their photo and ID document. When the "
        "form is submitted, the backend receives the data, checks fields, and uploads the files to Cloudinary. It then inserts the visitor record "
        "with a 'Pending' status into the MySQL database, generates a secure pass token, creates a QR code, and triggers a WebSocket alert to "
        "the host employee, concluding the registration flow."
    )
    
    # ASCII block diagram for Visitor Registration
    vis_diagram = (
        "+--------------------------------------------------+\n"
        "|                 Start Registration               |\n"
        "+------------------------+-------------------------+\n"
        "                         | \n"
        "                         v \n"
        "+--------------------------------------------------+\n"
        "|    Visitor Inputs Details & Uploads Photo/ID     |\n"
        "+------------------------+-------------------------+\n"
        "                         | \n"
        "                         v \n"
        "+--------------------------------------------------+\n"
        "|  Upload Assets to Cloudinary -> Return URLs      |\n"
        "+------------------------+-------------------------+\n"
        "                         | \n"
        "                         v \n"
        "+--------------------------------------------------+\n"
        "|  Generate Pass Token -> Insert Visitor into DB   |\n"
        "|                (Status: Pending)                 |\n"
        "+------------------------+-------------------------+\n"
        "                         | \n"
        "                         v \n"
        "+--------------------------------------------------+\n"
        "|  Generate QR Code -> Broadcast Socket.io Alert   |\n"
        "+------------------------+-------------------------+\n"
        "                         | \n"
        "                         v \n"
        "+--------------------------------------------------+\n"
        "|                 End Registration                 |\n"
        "+--------------------------------------------------+"
    )
    add_code_block(doc, "Visitor Registration Flowchart Diagram", vis_diagram)

    add_subsection_heading(doc, "5.1.2 Host Approval & Notification Flowchart")
    add_body_text(doc, 
        "The Host Approval flowchart describes the logic when an employee receives a check-in alert. The employee dashboard, connected via "
        "Socket.io WebSockets, receives the visitor alert and displays a popup. The employee can review the visitor details and photo. If the "
        "employee approves, the status is updated to 'Approved' in the database, a verification email is sent, and a check-in QR pass is sent to "
        "the visitor. If rejected, the employee inputs a reason, the status updates to 'Rejected', and a rejection email is sent."
    )
    
    app_diagram = (
        "+--------------------------------------------------+\n"
        "|           WebSocket Visitor Alert Received       |\n"
        "+------------------------+-------------------------+\n"
        "                         | \n"
        "                         v \n"
        "+--------------------------------------------------+\n"
        "|          Employee Reviews Visitor Record         |\n"
        "+------------------------+-------------------------+\n"
        "                         | \n"
        "                [Approve or Reject?]\n"
        "               /                    \\\n"
        "       (Approve)                    (Reject)\n"
        "         /                                \\\n"
        "        v                                  v\n"
        "+-----------------------+      +-----------------------+\n"
        "| Update Status:        |      | Input Rejection Reason|\n"
        "| 'Approved' in DB      |      +-----------+-----------+\n"
        "+-----------+-----------+                  | \n"
        "            |                              v\n"
        "            |                  +-----------------------+\n"
        "            |                  | Update Status:        |\n"
        "            |                  | 'Rejected' in DB      |\n"
        "            |                  +-----------+-----------+\n"
        "            |                              | \n"
        "            v                              v\n"
        "+--------------------------------------------------+\n"
        "|   Send Status Notification Email to Visitor      |\n"
        "+------------------------+-------------------------+\n"
        "                         | \n"
        "                         v \n"
        "+--------------------------------------------------+\n"
        "|                   Process End                    |\n"
        "+--------------------------------------------------+"
    )
    add_code_block(doc, "Host Approval Flowchart Diagram", app_diagram)

    add_subsection_heading(doc, "5.1.3 Security Terminal & OCR Verification Flowchart")
    add_body_text(doc, 
        "The Security Terminal flowchart describes the logic when a visitor arrives at the security desk. The guard scans the visitor's QR pass. "
        "The console queries the database and fetches the visitor's details, photo, and status. It concurrently runs the AI OCR document reader, "
        "sending the ID document image to the Google Gemini API. Gemini extracts the name and ID number and compares them to the visitor's database records. "
        "If they match, the guard confirms check-in, updating the status to 'Checked In'. Upon checkout, the status is updated to 'Checked Out'."
    )
    
    sec_diagram = (
        "+--------------------------------------------------+\n"
        "|            Scan Visitor QR Pass / Token          |\n"
        "+------------------------+-------------------------+\n"
        "                         | \n"
        "                         v \n"
        "+--------------------------------------------------+\n"
        "|         Fetch Visitor Status & Photo from DB     |\n"
        "+------------------------+-------------------------+\n"
        "                         | \n"
        "                         v \n"
        "+--------------------------------------------------+\n"
        "|    Trigger Gemini OCR for ID Card Verification    |\n"
        "+------------------------+-------------------------+\n"
        "                         | \n"
        "             [Are details matching?]\n"
        "            /                      \\\n"
        "         (Yes)                     (No / Warn)\n"
        "         /                            \\\n"
        "        v                              v\n"
        "+-----------------------+      +-----------------------+\n"
        "| Show Success status   |      | Display security alert|\n"
        "| in Console            |      | & warning message     |\n"
        "+-----------+-----------+      +-----------+-----------+\n"
        "            |                              | \n"
        "            +--------------+---------------+ \n"
        "                           | \n"
        "                           v \n"
        "+--------------------------------------------------+\n"
        "| Guard Confirms Check-In -> Updates DB timestamp |\n"
        "+------------------------+-------------------------+\n"
        "                         | \n"
        "                         v \n"
        "+--------------------------------------------------+\n"
        "|                   Process End                    |\n"
        "+--------------------------------------------------+"
    )
    add_code_block(doc, "Security Terminal & OCR Flowchart Diagram", sec_diagram)

    add_section_heading(doc, "5.2 Project Module 1 - Visitor Self-Registration & Pass Generation")
    add_body_text(doc, 
        "The Visitor Self-Registration module represents the entry point for visitor data. The front-end contains an HTML5 form styling input elements "
        "and utilizing JavaScript's webcam APIs to capture the visitor's photograph. File selectors handle identity document uploads. Upon submission, "
        "the frontend constructs a FormData payload, transmitting it to the `/visitor/register` API. The backend processes the uploaded assets "
        "using multer and streams them to Cloudinary. It generates a unique, UUID-like visitor token, saves the visitor's details to the DB, "
        "and creates a QR code image to embed in a registration-confirmation email."
    )

    add_section_heading(doc, "5.3 Project Module 2 - Host Portal & Real-Time Approval Workflows")
    add_body_text(doc, 
        "The Host Portal allows employees to manage their visitors. Built as a single-page dashboard, it establishes a persistent WebSocket connection "
        "to the server using Socket.io. When a visitor registers for an employee, the server broadcasts an event containing the visitor's name, "
        "company, and photo URL. The dashboard intercepts this event, triggers a desktop notification, and plays an alert sound. The employee can approve "
        "the request directly from the dashboard, updating the visitor's record in the database, sending the pass, and updating the security terminal logs."
    )

    add_section_heading(doc, "5.4 Project Module 3 - Security Console & AI OCR Document Reader")
    add_body_text(doc, 
        "The Security Guard terminal is the final verification stage. Guards can scan the visitor's QR pass using a web-camera QR reader. "
        "The console queries the database and displays the visitor's photograph, allowing visual verification. Concurrently, the system utilizes "
        "the Google Gemini AI API to verify the visitor's uploaded ID card. The AI service processes the image, extracts the name and ID number, "
        "and compares them to the visitor's inputs, warning guards of any discrepancies and enhancing security audits."
    )

    add_section_heading(doc, "5.5 Source Code Documentation")
    add_body_text(doc, 
        "This section documents the core files of the Visitor Management System. The source files are imported from the workspace and formatted "
        "with descriptions of their logic and functions:"
    )

    # List of files to read and add to the document
    files_to_add = [
        {"path": "db/db.js", "desc": "Handles MySQL Connection Pooling configuration using environmental parameters."},
        {"path": "services/purgeService.js", "desc": "Implements the automatic data retention purging scheduler to clear logs and delete Cloudinary assets older than 30 days."},
        {"path": "services/aiService.js", "desc": "Integrates Google Gemini AI multimodal API to perform ID document OCR and match host employee listings."},
        {"path": "routes/ocr.js", "desc": "Exposes OCR route endpoints to extract details from visitor ID uploads using Gemini models."},
        {"path": "routes/employee.js", "desc": "Exposes employee routing endpoints for registry query and dashboard stats."},
        {"path": "routes/auth.js", "desc": "Handles employee signup, login, dashboard rendering, and session verification routes."},
        {"path": "routes/security.js", "desc": "Implements security guard authentication, logging, dashboard queries, and terminal stats."},
        {"path": "routes/visitor.js", "desc": "Contains core visitor route controllers, including registration, approvals, check-in, check-out, QR generation, and secure downloads."},
        {"path": "server.js", "desc": "Main application entry point. Initializes databases, runs migrations, connects Socket.io, mounts middleware, and starts HTTP server."}
    ]

    for f_info in files_to_add:
        full_p = os.path.join(r"c:\Users\anand\OneDrive\Desktop\visitor-management", f_info["path"].replace("/", os.sep))
        add_subsection_heading(doc, f"5.5.{files_to_add.index(f_info) + 1} File Walkthrough: {f_info['path']}")
        add_body_text(doc, f_info["desc"])
        
        if os.path.exists(full_p):
            try:
                with open(full_p, "r", encoding="utf-8") as src_file:
                    content = src_file.read()
                # Split content into sub-blocks if it is very large, to keep word document rendering fast and stable
                # python-docx has problems rendering a single paragraph with >50,000 characters.
                # We will chunk the file content by every 80 lines
                lines = content.splitlines()
                chunk_size = 75
                for i in range(0, len(lines), chunk_size):
                    chunk_lines = lines[i:i+chunk_size]
                    chunk_text = "\n".join(chunk_lines)
                    part_lbl = f"{f_info['path']} (Part {i // chunk_size + 1})"
                    add_code_block(doc, part_lbl, chunk_text)
            except Exception as e:
                add_body_text(doc, f"Error reading code file: {str(e)}")
        else:
            add_body_text(doc, f"Code file not found in workspace at path: {f_info['path']}")

    add_section_heading(doc, "5.6 Summary of Coding Implementation")
    add_body_text(doc, 
        "The coding phase involved translating system requirements and flowcharts into a functional Node.js application. "
        "The system's modular design ensures that route logic, database models, and helper services are isolated, "
        "enhancing maintainability. Security features such as pass hashing, Helmet headers, API rate limiting, and JWT "
        "access verification were implemented to protect user data, creating a robust, enterprise-grade VMS."
    )

    # ------------------ CHAPTER 6 ------------------
    add_chapter_heading(doc, "CHAPTER 6: TESTING AND VALIDATION")
    
    add_section_heading(doc, "6.1 Introduction to Testing")
    add_body_text(doc, 
        "Testing is one of the most critical stages in the Software Development Life Cycle (SDLC). It is the process of evaluating "
        "a software application to ensure that it meets all functional and non-functional requirements, and operates reliably "
        "under normal and peak load conditions. The purpose of testing is to identify bugs, syntax errors, security vulnerabilities, "
        "and logical flaws before the application is deployed to production. A well-tested application gives developers and stakeholders "
        "confidence in its stability and security, especially for sensitive data-handling applications like a Visitor Management System."
    )

    add_section_heading(doc, "6.2 Testing Strategy Used")
    add_body_text(doc, 
        "The testing strategy for the VMS was designed to cover all components. We adopted a multi-layered testing approach:"
    )
    add_bullet_point(doc, "1. Functional Testing", 
        "Verified that each individual API endpoint and front-end button worked as expected (e.g. submitting visitor details, checking in/out)."
    )
    add_bullet_point(doc, "2. Boundary Testing", 
        "Tested the limits of inputs, including blank fields, oversized image uploads, and invalid phone numbers to verify system stability."
    )
    add_bullet_point(doc, "3. Invalid Input Testing", 
        "Entered incorrect data, such as numbers in name fields or unformatted email addresses, ensuring form validation rejected them."
    )
    add_bullet_point(doc, "4. Multiple Iteration / Concurrency Testing", 
        "Executed simultaneous check-in actions and verified Socket.io broadcast alerts to check system responsiveness under load."
    )

    add_section_heading(doc, "6.3 Test Cases - Visitor pass module")
    add_body_text(doc, "The following table logs the test cases executed for the Visitor Pass and Self-Registration module:")
    vis_tests = [
        ["TC-V1", "Valid registration form details, image upload", "Form submit", "Record saved, status 'Pending', QR generated", "Pass"],
        ["TC-V2", "Form submit with missing phone number", "Form submit", "Validation error: Phone number is required", "Pass"],
        ["TC-V3", "Form submit with invalid email format", "Form submit", "Validation error: Invalid email format", "Pass"],
        ["TC-V4", "Upload file larger than 10MB", "Upload file", "Error: File size limits exceeded (max 5MB)", "Pass"],
        ["TC-V5", "Multiple simultaneous visitor form submissions", "Concurrent post", "All records inserted cleanly, connection pooled", "Pass"]
    ]
    add_styled_table(doc, ["Test ID", "Test Scenario / Input Details", "Action", "Expected System Behaviour", "Result"], vis_tests)

    add_section_heading(doc, "6.4 Test Cases - Host approval module")
    add_body_text(doc, "The following table logs the test cases executed for the Host Approval and Employee Dashboard module:")
    emp_tests = [
        ["TC-E1", "Login with valid employee email and password", "Login", "JWT token set, redirect to dashboard", "Pass"],
        ["TC-E2", "Login with unregistered employee email", "Login", "Error: Invalid email or password", "Pass"],
        ["TC-E3", "Receiving real-time alert for new visitor", "Submit visitor", "Desktop notification shows, dashboard updates", "Pass"],
        ["TC-E4", "Employee clicks 'Approve' on visitor", "Click approve", "Status updates to 'Approved', activation email sent", "Pass"],
        ["TC-E5", "Employee clicks 'Reject' with reason", "Click reject", "Status updates to 'Rejected', rejection email sent", "Pass"]
    ]
    add_styled_table(doc, ["Test ID", "Test Scenario / Input Details", "Action", "Expected System Behaviour", "Result"], emp_tests)

    add_section_heading(doc, "6.5 Test Cases - Security & OCR module")
    add_body_text(doc, "The following table logs the test cases executed for the Security Terminal and AI OCR module:")
    sec_tests = [
        ["TC-S1", "Login with guard credentials", "Login", "Redirect to security dashboard", "Pass"],
        ["TC-S2", "Scan QR pass for 'Approved' visitor", "Scan QR", "Display visitor photo, details, enable 'Check-In' button", "Pass"],
        ["TC-S3", "Scan QR pass for 'Pending' visitor", "Scan QR", "Warning: Visitor not approved by host yet", "Pass"],
        ["TC-S4", "Upload ID document for Gemini AI OCR", "Upload card", "Extract visitor name and ID number in JSON", "Pass"],
        ["TC-S5", "Gemini AI detects name/ID mismatch", "OCR verify", "Display warning: Mismatch detected between ID and inputs", "Pass"]
    ]
    add_styled_table(doc, ["Test ID", "Test Scenario / Input Details", "Action", "Expected System Behaviour", "Result"], sec_tests)

    add_section_heading(doc, "6.6 Sample Outputs")
    add_body_text(doc, "This section presents text-based logs representing the system output during program execution:")
    
    server_log_txt = (
        "MySQL Connection Pool Initialized\n"
        "Successfully added column pass_token to visitors table.\n"
        "Successfully added column employee_name_input to visitors table.\n"
        "Successfully added column department_input to visitors table.\n"
        "Successfully added column rejection_reason to visitors table.\n"
        "Successfully added column rejected_at to visitors table.\n"
        "[RETENTION] Running auto-purge check for records older than 30 days...\n"
        "[RETENTION] No old records to purge.\n"
        "Server running on port 3000\n"
        "Client connected to real-time socket: zxY821HkaL912AsdAAAA\n"
        "Client connected to real-time socket: opL091JkaK881HskBBBB\n"
        "[LOG] 2026-08-16T14:10:22.189Z - POST /visitor/register - Visitor registered: Amit Kumar\n"
        "[LOG] 2026-08-16T14:10:23.001Z - Socket broadcast alert: visitor_alert for Amit Kumar\n"
        "[LOG] 2026-08-16T14:11:05.412Z - PUT /visitor/approve/42 - Visitor ID 42 approved by host\n"
        "Gemini Raw Response: {\"name\": \"AMIT KUMAR\", \"documentNumber\": \"1234-5678-9012\"}\n"
    )
    add_code_block(doc, "Terminal Execution Server Logs", server_log_txt)

    add_section_heading(doc, "6.7 Unit Testing in Node.js")
    add_body_text(doc, 
        "Unit testing involves testing individual functions or route modules in isolation. For instance, in the AI service, we "
        "wrote tests to verify that the URL signing function handles various string formats. By testing modules independently, "
        "we ensure that they work correctly before being integrated, simplifying troubleshooting."
    )

    add_section_heading(doc, "6.8 Integration Testing in Node.js")
    add_body_text(doc, 
        "Integration testing verifies that multiple system components work together. For example, we tested the registration route "
        "by verifying that submitting a form uploaded the files to Cloudinary, saved a record to MySQL, generated a QR code, "
        "and triggered a Socket.io alert to the employee dashboard. This ensures data flows smoothly across services."
    )

    add_section_heading(doc, "6.9 Black Box Testing")
    add_body_text(doc, 
        "Black box testing focuses on user interfaces and system outputs without looking at the internal code. We verified form "
        "validations, click actions, and QR code scans to confirm the user experience was smooth and error-free."
    )

    add_section_heading(doc, "6.10 Validation Testing")
    add_body_text(doc, 
        "Validation testing checks if the system meets corporate requirements. We verified that visitors cannot check-in without "
        "approval, and old records are successfully purged after 30 days, satisfying compliance guidelines."
    )

    add_section_heading(doc, "6.11 White Box Testing")
    add_body_text(doc, 
        "White box testing checks the internal logic of the code. We verified route middleware execution, authorization token "
        "decoding, and error-handling conditions, ensuring the code behaves as expected under various scenarios."
    )

    add_section_heading(doc, "6.12 Boundary Testing")
    add_body_text(doc, 
        "Boundary testing checks the system's behavior with input limits. We verified that the system rejects file uploads that "
        "are too large and displays error messages for empty fields, maintaining server stability."
    )

    # ------------------ CHAPTER 7 ------------------
    add_chapter_heading(doc, "CHAPTER 7: OUTPUTS AND PROGRAM EXECUTION FLOW")
    
    add_section_heading(doc, "7.1 Purpose of This Section")
    add_body_text(doc, 
        "This section presents text-based representations of the application views. It describes the visitor registration forms, "
        "employee portal dashboards, and security guard terminal views as they appear during program execution."
    )

    add_section_heading(doc, "7.2 VMS End-User Execution Steps & Terminal Logs")
    
    add_subsection_heading(doc, "7.2.1 Visitor Self-Registration Screen")
    add_body_text(doc, 
        "The visitor scans the lobby QR code to open the registration form, filling out their details: Name, Phone Number, "
        "Company, Reason for Visit, Host Employee, and Department. They capture their photo using the camera tool, upload "
        "their ID, and submit. The console displays confirmation of the registration."
    )
    
    reg_form_repr = (
        "============================================================\n"
        "               VISITOR REGISTRATION SYSTEM                  \n"
        "============================================================\n"
        "Visitor Name: [ Amit Kumar ]\n"
        "Phone Number: [ 9876543210 ]\n"
        "Company Name: [ Manav Rachna Studies ]\n"
        "Host Employee: [ Dr. Payal Thakur ]\n"
        "Department: [ CSE ]\n"
        "Photo Scan: [ photo_captured_webcam.jpg ]\n"
        "ID Card Scan: [ adhar_card_scan.jpg ]\n"
        "------------------------------------------------------------\n"
        " [ Submit Details ]\n"
        "------------------------------------------------------------\n"
        "Status: Registration Submitted! Token: GT-981249A\n"
        "QR Code generated. Activation link emailed to host.\n"
        "============================================================\n"
    )
    add_code_block(doc, "Visitor Registration View Text Representation", reg_form_repr)

    add_subsection_heading(doc, "7.2.2 Host Employee Approval Dashboard")
    add_body_text(doc, 
        "The employee logs in to their dashboard, which establishes a WebSocket connection. When a new visitor registers, "
        "a real-time alert is displayed, allowing the employee to review details and approve or reject the request."
    )
    
    emp_dash_repr = (
        "============================================================\n"
        "             EMPLOYEE DASHBOARD - GROZ TOOLS                \n"
        "============================================================\n"
        "Welcome: Dr. Payal Thakur (CSE Department)\n"
        "Real-Time Socket Connected: YES\n"
        "------------------------------------------------------------\n"
        "               PENDING VISITOR REQUESTS                     \n"
        "------------------------------------------------------------\n"
        "1. Visitor Name: Amit Kumar\n"
        "   Company: Manav Rachna Studies\n"
        "   Photo: [ Captured Image Preview ]\n"
        "   Document: [ ID Card Upload Preview ]\n"
        "   [ Approve Visit ]    [ Reject Visit ]\n"
        "============================================================\n"
        "System Log: Click [ Approve Visit ] -> Status: Approved!\n"
        "Pass activation email dispatched to visitor.\n"
        "============================================================\n"
    )
    add_code_block(doc, "Employee Approval Dashboard Text Representation", emp_dash_repr)

    add_subsection_heading(doc, "7.2.3 Security Guard Terminal Scan Screen")
    add_body_text(doc, 
        "Guards scan the visitor's QR pass. The console queries the database and displays the visitor's details, "
        "photo, and check-in status, running the Gemini AI OCR service to verify ID card details."
    )
    
    sec_dash_repr = (
        "============================================================\n"
        "             SECURITY TERMINAL - LOBBY GATE                 \n"
        "============================================================\n"
        "Real-Time Connection: Active\n"
        "Scan QR Visitor Pass: [ Scan Camera Scanner ]\n"
        "Pass Token Input: [ GT-981249A ]   [ Search DB ]\n"
        "------------------------------------------------------------\n"
        "                  VISITOR DETAILS IN DATABASE               \n"
        "------------------------------------------------------------\n"
        "Visitor Name: Amit Kumar\n"
        "Company: Manav Rachna Studies\n"
        "Host Employee: Defendant Officer (CSE)\n"
        "Approval Status: APPROVED\n"
        "Photo match: [ Photo matches visitor ]\n"
        "------------------------------------------------------------\n"
        "                  AI OCR DOCUMENT SCANNER CHECK             \n"
        "------------------------------------------------------------\n"
        "Uploaded ID type: Aadhar\n"
        "AI Extracted Name: AMIT KUMAR\n"
        "AI Extracted Doc Number: 1234-5678-9012\n"
        "Validation Status: SUCCESS - Details verified!\n"
        "------------------------------------------------------------\n"
        " [ Check-In Visitor ]       [ Decline Access ]\n"
        "============================================================\n"
    )
    add_code_block(doc, "Security Guard Terminal Scan View Text Representation", sec_dash_repr)

    # ------------------ CHAPTER 8 ------------------
    add_chapter_heading(doc, "CHAPTER 8: USER MANUAL & LEARNINGS")
    
    add_section_heading(doc, "8.1 Purpose of the Manual")
    add_body_text(doc, 
        "This user manual provides clear, step-by-step instructions to install, configure, run, and operate "
        "the Visitor Management System. It is designed to guide system administrators, lobby guards, and employees "
        "in using the application effectively."
    )

    add_section_heading(doc, "8.2 Steps to Run VMS App")
    add_body_text(doc, 
        "To deploy and run the VMS application locally, follow these steps:"
    )
    add_bullet_point(doc, "1. Prerequisite Installations", 
        "Install Node.js (v18+) and MySQL Server on the host machine. Ensure Git is installed."
    )
    add_bullet_point(doc, "2. Clone Repository & Install Dependencies", 
        "Clone the codebase. In the root folder, run: npm install"
    )
    add_bullet_point(doc, "3. Set up environment variables", 
        "Create a .env file with database credentials, Cloudinary credentials, and Gemini API keys."
    )
    add_bullet_point(doc, "4. Initialize Database & Run Server", 
        "Start MySQL and run: npm start"
    )
    add_bullet_point(doc, "5. Access Application Views", 
        "Access visitor forms, employee login portals, and security dashboard dashboards via specified URLs."
    )

    add_section_heading(doc, "8.3 Project Enhancements")
    add_body_text(doc, 
        "The VMS system can be further enhanced with several advanced features:"
    )
    add_bullet_point(doc, "Face Recognition Access Control", 
        "Integrating face-matching algorithms to compare captured visitor photos with ID scans, automating guard verification."
    )
    add_bullet_point(doc, "Smart Turnstile & Gate integration", 
        "Connecting the check-in database with hardware gates, automatically opening turnstiles upon scan."
    )
    add_bullet_point(doc, "Mobile Guard App", 
        "Building a mobile application for guards to scan QR codes and log check-ins from anywhere in the lobby."
    )

    add_section_heading(doc, "8.4 Project Real-World Applications")
    add_body_text(doc, 
        "The Visitor Management System has extensive applications across various industries:"
    )
    add_bullet_point(doc, "Manufacturing facilities", 
        "Managing access for sub-contractors, delivery truck drivers, and site auditors at manufacturing hubs."
    )
    add_bullet_point(doc, "Corporate buildings", 
        "Modernizing office lobby check-ins, tracking business clients, and keeping digital logs for audits."
    )
    add_bullet_point(doc, "Educational campuses", 
        "Tracking guest lecturers and parent visits, ensuring student safety."
    )

    add_section_heading(doc, "8.5 Future Scope")
    add_body_text(doc, 
        "The future scope of VMS includes integrating with active directory systems for automated employee indexing. "
        "Additionally, we plan to implement SMS notifications via twilio/Brevo SMS API and construct a dashboard "
        "displaying lobby traffic analytics, helping administrators plan lobby staffing."
    )

    add_section_heading(doc, "8.6 Security Importance")
    add_body_text(doc, 
        "In a digital visitor logging system, security is paramount. Since visitors upload sensitive identity documents, "
        "it is crucial to secure API routes against data leaks. We implemented rate limiting to prevent DDoS attacks and "
        "brute-forcing, set Helmet headers to prevent cross-site scripting (XSS), and secured file downloads by restricting "
        "access to authorized sessions, maintaining data privacy."
    )

    add_section_heading(doc, "8.7 Database Design Importance")
    add_body_text(doc, 
        "A relational database design is vital for visitor auditing. The VMS schema ensures data integrity using primary "
        "and foreign key constraints, connection pools, and index tables, which optimize query times and prevent data corruption."
    )

    add_section_heading(doc, "8.8 Use of Functions and Modular Coding")
    add_body_text(doc, 
        "Modular coding is the practice of splitting application logic into independent modules. During the development of the VMS, "
        "separating routes, DB configuration, and helper services made debugging easier. Reusable components, like email helpers "
        "and database query modules, reduced code duplication and simplified maintenance."
    )

    add_section_heading(doc, "8.9 Overall Internship Learnings")
    add_body_text(doc, 
        "My internship at Groz Tools Private Limited was an enriching experience. I developed full-stack web development skills, "
        "learned how database pooling improves application speed, understood how WebSockets manage real-time alerts, "
        "and integrated AI APIs into production code. Working under professional mentors taught me the importance of code reviews "
        "and detailed documentation."
    )

    add_section_heading(doc, "8.10 Challenges Faced")
    add_body_text(doc, 
        "We encountered several key challenges during development: managing database connection pools to prevent timeout errors, "
        "configuring multipart file uploads using multer, handling socket disconnections under corporate firewalls, and extracting "
        "accurate text from low-resolution images. These challenges were solved by implementing robust error handling and fallback models."
    )

    add_section_heading(doc, "8.11 Version Control Importance")
    add_body_text(doc, 
        "Using Git version control was essential to track changes and roll back code when bugs were introduced. Managing development "
        "branches and merge conflicts taught me how collaborative software engineering projects are run in the industry."
    )

    add_section_heading(doc, "8.12 Benefits of Learning JavaScript/Node.js")
    add_body_text(doc, 
        "Learning JavaScript and Node.js was highly beneficial. The single-threaded, event-driven architecture handles concurrent lobby "
        "check-in requests efficiently. JavaScript's versatility allowed us to use the same language for both frontend views and backend "
        "APIs, speed up development."
    )

    add_section_heading(doc, "8.13 Understanding Code Reusability")
    add_body_text(doc, 
        "Code reusability is a key software engineering principle. Creating modular utility files for image uploads, database pooling, "
        "and SMTP mailing reduced code replication, ensuring changes are automatically applied everywhere, saving time."
    )

    add_section_heading(doc, "8.14 Importance of Mentorship")
    add_body_text(doc, 
        "The guidance and feedback from my internal mentor, Dr. Payal Thakur, and industry supervisors at Groz Tools Private Limited was "
        "invaluable. Their feedback kept development on track and taught me the importance of writing production-ready code."
    )

    add_section_heading(doc, "8.15 Closing Remarks & Gratitude")
    add_body_text(doc, 
        "In conclusion, this internship has been a transformative experience for my academic and professional growth. I express my "
        "gratitude to the CSE Department at Manav Rachna and the software development division at Groz Tools Private Limited for "
        "providing me with this opportunity, which has prepared me for future software engineering roles."
    )

    add_section_heading(doc, "8.16 References")
    add_bullet_point(doc, "1", "Node.js Official Documentation and API Reference Guide (https://nodejs.org/api/)")
    add_bullet_point(doc, "2", "ExpressJS API Reference Guide and Web Development Manual (https://expressjs.com/)")
    add_bullet_point(doc, "3", "Socket.io Client-Server Communication Guide (https://socket.io/docs/v4/)")
    add_bullet_point(doc, "4", "MySQL Connection Pooling and Relational Databases Reference (https://sidorares.github.io/node-mysql2/docs)")
    add_bullet_point(doc, "5", "Cloudinary Image API Integration Manual (https://cloudinary.com/documentation/node_integration)")
    add_bullet_point(doc, "6", "Google Gemini AI multimodal API Reference Documentation (https://ai.google.dev/docs)")
    add_bullet_point(doc, "7", "Nodemailer SMTP mailer module for Node.js (https://nodemailer.com/about/)")
    add_bullet_point(doc, "8", "Groz Tools Corporate Profile and Product Manuals (https://www.groz-tools.com/)")

    # Save document
    out_file = r"c:\Users\anand\OneDrive\Desktop\visitor-management\Visitor_Management_System_Project_Report.docx"
    doc.save(out_file)
    print(f"Report generated and saved to: {out_file}")

if __name__ == "__main__":
    main()
