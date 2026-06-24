/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Format currency as Indian Rupees (INR)
export const formatINR = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

// Simple relative date formatting (e.g., "3 hours ago")
export const formatRelativeTime = (isoString: string): string => {
  const now = new Date();
  const past = new Date(isoString);
  const diffMs = now.getTime() - past.getTime();
  
  if (diffMs < 0) return 'Just now'; // Future dynamic offset
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffMins > 0) {
    return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  }
  return 'Just now';
};

// Date trimmer (e.g. "21 Jun 2026")
export const formatDateNice = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Export JSON data to a downloadable CSV file
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) return;
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','), // header row
    ...data.map(row => 
      headers.map(fieldName => {
        let val = row[fieldName];
        if (typeof val === 'object') {
          val = JSON.stringify(val);
        }
        // Escape quotes
        val = (val === null || val === undefined) ? '' : String(val).replace(/"/g, '""');
        return `"${val}"`;
      }).join(',')
    )
  ];
  
  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Generate printed report triggering local user receipt style
export const triggerPrint = (elementId: string) => {
  const printableElement = document.getElementById(elementId);
  if (!printableElement) return;
  
  let shopName = 'SMARTSPE BANKING & EMITRA';
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('smartspe_clean_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.shopDetails && parsed.shopDetails.name) {
          shopName = parsed.shopDetails.name;
        }
      }
    } catch (e) {}
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  printWindow.document.write(`
    <html>
      <head>
        <title>${shopName} Report Printout</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #1D4ED8; padding-bottom: 15px; margin-bottom: 25px; }
          .title { font-size: 24px; font-weight: bold; color: #0F172A; text-transform: uppercase; }
          .subtitle { font-size: 14px; color: #555; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #1D4ED8; color: white; text-align: left; padding: 10px; font-size: 13px; }
          td { padding: 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #E2E8F0; padding-top: 15px; }
          .summary { display: flex; justify-content: flex-end; margin-top: 20px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${shopName}</div>
          <div class="subtitle">Official Operational Activity Receipt / Report</div>
          <div style="font-size: 11px; color: #777; margin-top: 8px;">Generated at: ${new Date().toLocaleString()}</div>
        </div>
        ${printableElement.innerHTML}
        <div class="footer">
          <p>This is a computer-generated transaction receipt from ${shopName} CSP SaaS Portal.</p>
          <p>Thank you for banking with our network.</p>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};
