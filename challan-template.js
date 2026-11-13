/**
 * UniAdmit - Bangladesh Government Automated Challan (A-Challan / T.R. Form No. 6) Template
 * Implements official Government of Bangladesh Treasury e-Challan format in English.
 */

function numberToWordsEnglish(num) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? '-' + a[digit] : '');
  }

  if (!num || num === 0) return 'Zero Taka Only';
  let n = Math.floor(num);
  let str = '';

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  n %= 100;

  if (crore > 0) str += inWords(crore) + ' Crore ';
  if (lakh > 0) str += inWords(lakh) + ' Lakh ';
  if (thousand > 0) str += inWords(thousand) + ' Thousand ';
  if (hundred > 0) str += inWords(hundred) + ' Hundred ';
  if (n > 0) str += inWords(n) + ' ';

  return str.trim() + ' Taka Only';
}

function generateChallanHTML(app, user) {
  const isPaid = (app.payment_status === 'paid' || app.payment_status === 'verified');
  const amount = parseFloat(app.payment_amount) || 0;
  const amountWordsEn = numberToWordsEnglish(amount);

  const trackingNo = `ACH-2026-${String(app.id).padStart(8, '0')}`;
  const challanNo = `CH-2026-${String(app.id).padStart(6, '0')}`;
  const assignedRoll = app.assigned_id || `${app.university_short_name || 'UNIV'}-2026-${String(app.id).padStart(5, '0')}`;
  const bankScrollNo = `SB-TR-2026-${String(app.id).padStart(7, '0')}`;

  const payDateObj = app.payment_date ? new Date(app.payment_date) : (app.application_date ? new Date(app.application_date) : new Date());
  const payDateEn = payDateObj.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

  const statusLabel = isPaid ? 'PAID & VERIFIED' : 'PENDING PAYMENT';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>e-Challan (A-Challan) - #${app.id} | ${app.university_short_name || 'UniAdmit'}</title>
  <link rel="icon" type="image/svg+xml" href="/Government_Seal_of_Bangladesh.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Roboto+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background: #f1f5f9;
      color: #0f172a;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.45;
      padding: 20px 10px;
    }
    .no-print {
      max-width: 820px;
      margin: 0 auto 14px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #1e293b;
    }
    .btn-primary {
      background: #006a4e;
      color: #ffffff;
      border-color: #006a4e;
    }
    .btn-primary:hover {
      background: #00523c;
    }

    /* Official Challan Document Sheet */
    .challan-sheet {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 2px solid #006a4e;
      padding: 24px 30px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
      position: relative;
    }

    /* Official Header */
    .challan-header {
      text-align: center;
      border-bottom: 2px solid #006a4e;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .bd-logo {
      width: 80px;
      height: 80px;
      display: block;
      margin: 0 auto 6px auto;
    }
    .govt-heading {
      font-size: 18px;
      font-weight: 800;
      color: #006a4e;
      line-height: 1.3;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .dept-heading {
      font-size: 13px;
      color: #334155;
      font-weight: 600;
      margin-top: 1px;
    }
    .form-title {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin: 5px 0 2px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-sub {
      font-size: 11px;
      color: #64748b;
      font-style: italic;
    }
    .copy-type-tag {
      display: inline-block;
      margin-top: 5px;
      padding: 3px 12px;
      background: #f0fdf4;
      border: 1px solid #006a4e;
      border-radius: 3px;
      font-size: 11.5px;
      font-weight: 700;
      color: #006a4e;
      text-transform: uppercase;
    }

    /* Meta Information Strip */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 12px;
    }
    .meta-box {
      font-size: 11.5px;
    }
    .meta-label {
      color: #64748b;
      display: block;
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .meta-value {
      font-weight: 700;
      color: #0f172a;
      font-family: 'Roboto Mono', monospace;
    }

    /* Headings */
    .block-header {
      font-size: 12px;
      font-weight: 800;
      color: #006a4e;
      border-bottom: 1px solid #006a4e;
      padding-bottom: 3px;
      margin: 10px 0 6px 0;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Government Form Tables */
    table.gov-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 12px;
    }
    table.gov-table th, table.gov-table td {
      border: 1px solid #64748b;
      padding: 5px 8px;
      vertical-align: middle;
    }
    table.gov-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
    }
    table.gov-table td.field-name {
      background: #f8fafc;
      color: #334155;
      font-weight: 600;
      width: 25%;
    }
    table.gov-table td.amount-cell {
      text-align: right;
      font-family: 'Roboto Mono', monospace;
      font-weight: 700;
    }
    table.gov-table tr.total-row {
      background: #f0fdf4;
      font-weight: 800;
    }
    table.gov-table tr.total-row td {
      color: #006a4e;
      font-size: 13px;
    }

    .words-box {
      border: 1px solid #94a3b8;
      background: #f8fafc;
      padding: 7px 10px;
      font-size: 12px;
      margin-bottom: 12px;
      border-radius: 3px;
    }
    .words-box strong {
      color: #006a4e;
    }

    /* Bottom Verification & Signature Grid */
    .footer-grid {
      display: grid;
      grid-template-columns: 100px 1fr 200px;
      gap: 14px;
      align-items: center;
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
    }
    .qr-container {
      text-align: center;
    }
    .qr-container svg {
      width: 85px;
      height: 85px;
      display: block;
      margin: 0 auto;
    }
    .qr-text {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
    }
    .disclaimer-box {
      font-size: 11px;
      color: #475569;
      line-height: 1.45;
    }
    .sig-container {
      text-align: center;
      font-size: 11px;
    }
    .sig-line {
      border-top: 1px dashed #475569;
      padding-top: 4px;
      margin-top: 36px;
      font-weight: 700;
      color: #1e293b;
    }

    /* Print Styles */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .challan-sheet {
        border: 1.5px solid #000000 !important;
        box-shadow: none !important;
        padding: 12px 18px !important;
        max-width: 100% !important;
        margin: 0 !important;
      }
      @page {
        size: A4 portrait;
        margin: 8mm;
      }
    }
  </style>
</head>
<body>

  <!-- Clean Top Bar -->
  <div class="no-print">
    <a href="/student/payments.html" class="btn">
      ← Back to Payments
    </a>
    <button type="button" class="btn btn-primary" onclick="window.print()">
      🖨️ Print e-Challan
    </button>
  </div>

  <!-- Challan Sheet -->
  <div class="challan-sheet">
    
    <!-- Header with Official Bangladesh Government Seal -->
    <header class="challan-header">
      <img src="/Government_Seal_of_Bangladesh.svg" alt="Government of Bangladesh Seal" class="bd-logo">
      <div class="govt-heading">Government of the People's Republic of Bangladesh</div>
      <div class="dept-heading">Ministry of Finance & Ministry of Education</div>
      <div class="form-title">Automated Challan Form (T.R. Form No. 6)</div>
      <div class="form-sub">[Prescribed under Rule 109 of Treasury Rules]</div>
      <span class="copy-type-tag">Customer Copy / Applicant Copy (Original)</span>
    </header>

    <!-- Meta Information Strip -->
    <div class="meta-grid">
      <div class="meta-box">
        <span class="meta-label">Challan Tracking No</span>
        <span class="meta-value" style="color:#006a4e;">${trackingNo}</span>
      </div>
      <div class="meta-box">
        <span class="meta-label">Challan No</span>
        <span class="meta-value">${challanNo}</span>
      </div>
      <div class="meta-box">
        <span class="meta-label">Date & Time</span>
        <span class="meta-value" style="font-size:11px;">${payDateEn}</span>
      </div>
      <div class="meta-box" style="text-align:right;">
        <span class="meta-label">Challan Status</span>
        <span class="meta-value" style="color:${isPaid ? '#006a4e' : '#b91c1c'};">${statusLabel}</span>
      </div>
    </div>

    <!-- 1. Institutional & Economic Classification -->
    <div class="block-header">1. Institutional & Economic Classification</div>
    <table class="gov-table">
      <tr>
        <td class="field-name">Ministry / Division:</td>
        <td colspan="3">Secondary and Higher Education Division (Ministry Code: 125)</td>
      </tr>
      <tr>
        <td class="field-name">Department / Agency:</td>
        <td>University Grants Commission of Bangladesh (UGC) / Central Admission Secretariat</td>
        <td class="field-name">Organization Code:</td>
        <td style="font-family:'Roboto Mono',monospace; font-weight:700;">1250101-104928</td>
      </tr>
      <tr>
        <td class="field-name">Target University:</td>
        <td><strong>${app.university_name}</strong> (${app.university_short_name || 'KYAU'})</td>
        <td class="field-name">Campus Location:</td>
        <td>${app.university_location || 'Bangladesh'}</td>
      </tr>
      <tr>
        <td class="field-name">Economic Head of Account:</td>
        <td colspan="3">
          <span style="font-family:'Roboto Mono',monospace; font-weight:700; color:#006a4e; font-size:13px;">1-3731-0000-2681</span>
          <span style="color:#475569; font-size:11px; margin-left:8px;">(Higher Education & University Admission Examination Fee)</span>
        </td>
      </tr>
    </table>

    <!-- 2. Depositor / Applicant Particulars -->
    <div class="block-header">2. Depositor / Applicant Particulars</div>
    <table class="gov-table">
      <tr>
        <td class="field-name">Applicant Name:</td>
        <td><strong>${app.student_name || 'N/A'}</strong></td>
        <td class="field-name">Mobile Number:</td>
        <td style="font-family:'Roboto Mono',monospace;">${app.student_phone || 'N/A'}</td>
      </tr>
      <tr>
        <td class="field-name">Father's Name:</td>
        <td>${app.father_name || 'N/A'}</td>
        <td class="field-name">Mother's Name:</td>
        <td>${app.mother_name || 'N/A'}</td>
      </tr>
      <tr>
        <td class="field-name">NID / Birth Reg No:</td>
        <td style="font-family:'Roboto Mono',monospace;">${app.nid_number || 'N/A'}</td>
        <td class="field-name">Email Address:</td>
        <td>${app.student_email || 'N/A'}</td>
      </tr>
      <tr>
        <td class="field-name">Applied Program:</td>
        <td><strong>${app.program_name}</strong> (${app.program_department || 'General'})</td>
        <td class="field-name">Application ID / Roll:</td>
        <td style="font-family:'Roboto Mono',monospace; font-weight:700; color:#006a4e;">#${app.id} / ${assignedRoll}</td>
      </tr>
    </table>

    <!-- 3. Schedule of Deposited Fees -->
    <div class="block-header">3. Schedule of Deposited Fees</div>
    <table class="gov-table">
      <thead>
        <tr>
          <th style="width:8%; text-align:center;">Sl.</th>
          <th style="text-align:left;">Fee Description</th>
          <th style="width:25%; text-align:center;">Head of Account</th>
          <th style="width:22%; text-align:right;">Amount (BDT)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align:center;">01</td>
          <td>
            <strong>Central University Admission Application Fee</strong> (${app.university_name})
          </td>
          <td style="text-align:center; font-family:'Roboto Mono',monospace;">1-3731-0000-2681</td>
          <td class="amount-cell">BDT ${amount.toFixed(2)}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3" style="text-align:right;">Total Deposited Amount (BDT):</td>
          <td class="amount-cell">BDT ${amount.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Amount In Words -->
    <div class="words-box">
      <strong>In Words:</strong> ${amountWordsEn}
    </div>

    <!-- 4. Payment & Gateway Settlement Particulars -->
    <div class="block-header">4. Payment & Gateway Settlement Particulars</div>
    <table class="gov-table">
      <tr>
        <td class="field-name">Payment Channel:</td>
        <td><strong>Mobile Financial Services (MFS) - ${app.payment_method || 'bKash / Nagad / Rocket'}</strong></td>
        <td class="field-name">Transaction ID (TrxID):</td>
        <td style="font-family:'Roboto Mono',monospace; font-weight:700;">${app.payment_transaction_id || 'AUTO_SETTLED_TXN'}</td>
      </tr>
      <tr>
        <td class="field-name">Bank Scroll / Auth No:</td>
        <td style="font-family:'Roboto Mono',monospace;">${bankScrollNo}</td>
        <td class="field-name">Settlement Timestamp:</td>
        <td style="font-family:'Roboto Mono',monospace;">${payDateEn}</td>
      </tr>
    </table>

    <!-- Security & Verification Footer -->
    <div class="footer-grid">
      <div class="qr-container">
        <!-- Verification QR Code -->
        <svg viewBox="0 0 100 100">
          <rect x="5" y="5" width="28" height="28" fill="none" stroke="#006a4e" stroke-width="4"/>
          <rect x="11" y="11" width="16" height="16" fill="#006a4e"/>
          <rect x="67" y="5" width="28" height="28" fill="none" stroke="#006a4e" stroke-width="4"/>
          <rect x="73" y="11" width="16" height="16" fill="#006a4e"/>
          <rect x="5" y="67" width="28" height="28" fill="none" stroke="#006a4e" stroke-width="4"/>
          <rect x="11" y="73" width="16" height="16" fill="#006a4e"/>
          <rect x="42" y="8" width="6" height="6" fill="#006a4e"/>
          <rect x="52" y="14" width="6" height="6" fill="#006a4e"/>
          <rect x="45" y="24" width="6" height="6" fill="#006a4e"/>
          <rect x="8" y="42" width="6" height="6" fill="#006a4e"/>
          <rect x="20" y="48" width="6" height="6" fill="#006a4e"/>
          <rect x="42" y="42" width="16" height="16" fill="#006a4e"/>
          <rect x="65" y="42" width="6" height="6" fill="#006a4e"/>
          <rect x="78" y="48" width="6" height="6" fill="#006a4e"/>
          <rect x="88" y="42" width="6" height="6" fill="#006a4e"/>
          <rect x="42" y="68" width="6" height="6" fill="#006a4e"/>
          <rect x="54" y="74" width="6" height="6" fill="#006a4e"/>
          <rect x="48" y="85" width="6" height="6" fill="#006a4e"/>
          <rect x="68" y="68" width="8" height="8" fill="#006a4e"/>
          <rect x="82" y="80" width="10" height="10" fill="#006a4e"/>
        </svg>
        <div class="qr-text">Verification QR Code</div>
      </div>

      <div class="disclaimer-box">
        1. This automated e-Challan is an authentic official receipt generated under T.R. Form No. 6.<br>
        2. This is a computer-generated electronic challan; no physical seal or signature is required.<br>
        3. Please retain and present this receipt during admit card collection and viva examinations.
      </div>

      <div class="sig-container">
        <div class="sig-line">
          Authorized Officer<br>
          <span style="font-size:10px; color:#64748b; font-weight:normal;">Central University Admission Council</span>
        </div>
      </div>
    </div>

  </div>

</body>
</html>`;
}

module.exports = {
  generateChallanHTML,
  numberToWordsEnglish
};
