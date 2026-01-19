// Checklist data structure
const checklistData = {
  "Office": [
    { id: "hardware", label: "Check Hardware" },
    { id: "computer", label: "Computer" },
    { id: "printer", label: "Printer can print and scan, no paper jams" },
    { id: "printerIP", label: "Verify that printer is using IP instead of WSD" },
    { id: "switch", label: "Switch" },
    { id: "keyboard", label: "Keyboard / Mouse" },
    { id: "monitor", label: "Check for damage Monitor" },
    { id: "ringcentral", label: "Check RingCentral in Teams" },
    { id: "ethernet", label: "Check Ethernet Clips/Cable" },
    { id: "handheld", label: "Clean Boot Handheld and Authorize it" },
    { id: "sfc", label: "SFC" },
    { id: "updates", label: "Updates" },
    { id: "battery", label: "Check Battery Back Up" },
    { id: "usbEthernet", label: "Check USB/Ethernet x:\\\\10.5.48.2\\xmlgateway" },
    { id: "unauthorized", label: "Check for unauthorized devices" },
    { id: "deadCables", label: "Check for Dead Cables" }
  ],
  "Front Counter": [
    { id: "westernUnion", label: "Western Union connectivity" },
    { id: "fd150", label: "FD150" },
    { id: "incomm", label: "Incomm" },
    { id: "reader", label: "Check Reader" },
    { id: "fcSwitches", label: "Switches" },
    { id: "chownow", label: "ChowNow / Lula" },
    { id: "fcDeadCables", label: "Dead Ethernet Cables" },
    { id: "passport", label: "Passport version and document" },
    { id: "deliPrinter", label: "Deli Printer - Check physical damage, run test print, verify quality" },
    { id: "deliTablet", label: "Deli Tablet - Check charging, updates, condition, and printer connection" },
    { id: "concerns", label: "Manager concerns" }
  ]
};

// Auto-populate today's date
document.getElementById('date').valueAsDate = new Date();

// Build checklist UI
const container = document.getElementById('checklistContainer');
for (const [sectionName, items] of Object.entries(checklistData)) {
  const section = document.createElement('div');
  section.className = 'section';
  
  const header = document.createElement('div');
  header.className = 'section-header';
  header.textContent = sectionName;
  
  const content = document.createElement('div');
  content.className = 'section-content';
  
  items.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'checklist-item';
    
    const checkboxRow = document.createElement('div');
    checkboxRow.className = 'checkbox-row';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = item.id;
    
    const label = document.createElement('label');
    label.htmlFor = item.id;
    label.textContent = item.label;
    
    checkboxRow.appendChild(checkbox);
    checkboxRow.appendChild(label);
    
    const textarea = document.createElement('textarea');
    textarea.className = 'comment-box';
    textarea.id = `${item.id}-comment`;
    textarea.placeholder = 'Comments...';
    
    itemDiv.appendChild(checkboxRow);
    itemDiv.appendChild(textarea);
    content.appendChild(itemDiv);
  });
  
  section.appendChild(header);
  section.appendChild(content);
  container.appendChild(section);
}

// Inventory table functions
function addInventoryRow() {
  const tbody = document.getElementById('inventoryBody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td class="inv-name-label"><input type="text" placeholder="Item name" style="width:100%; border:none; padding:0.5rem;" /></td>
    <td><input type="text" class="inv-number" placeholder="" /></td>
    <td><input type="text" class="inv-notes" placeholder="" /></td>
    <td><button class="delete-row-btn" onclick="deleteRow(this)">×</button></td>
  `;
  tbody.appendChild(row);
}

function deleteRow(btn) {
  const tbody = document.getElementById('inventoryBody');
  if (tbody.children.length > 1) {
    btn.closest('tr').remove();
  } else {
    alert('Must have at least one row');
  }
}

// Signature handling
const modal = document.getElementById('signatureModal');
const canvas = document.getElementById('signatureCanvas');
const signaturePad = new SignaturePad(canvas);
let hasSignature = false;

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * ratio;
  canvas.height = canvas.offsetHeight * ratio;
  canvas.getContext('2d').scale(ratio, ratio);
  signaturePad.clear();
}

document.getElementById('openSignature').addEventListener('click', () => {
  modal.classList.add('active');
  setTimeout(resizeCanvas, 100);
});

document.getElementById('closeModal').addEventListener('click', () => {
  modal.classList.remove('active');
});

document.getElementById('clearSignature').addEventListener('click', () => {
  signaturePad.clear();
});

document.getElementById('saveSignature').addEventListener('click', () => {
  if (!signaturePad.isEmpty()) {
    hasSignature = true;
    document.getElementById('signatureStatus').textContent = '✓ Signed';
    document.getElementById('signatureStatus').classList.add('signed');
  }
  modal.classList.remove('active');
});

// PDF Generation
document.getElementById('generatePdf').addEventListener('click', async () => {
  const storeName = document.getElementById('storeName').value;
  const date = document.getElementById('date').value;

  if (!storeName || !date) {
    alert('Please fill in Store Name and Date');
    return;
  }

  if (!hasSignature) {
    alert('Please add a manager signature');
    return;
  }

  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([612, 792]); // Letter size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let yPos = 750;
  const leftMargin = 50;
  const lineHeight = 15;

  // Title
  page.drawText('Preventative Maintenance', {
    x: leftMargin,
    y: yPos,
    size: 18,
    font: boldFont
  });
  yPos -= 30;

  // Store info
  page.drawText(`Store Name: ${storeName}`, { x: leftMargin, y: yPos, size: 12, font });
  yPos -= 20;
  page.drawText(`Date: ${date}`, { x: leftMargin, y: yPos, size: 12, font });
  yPos -= 30;

  // Function to add new page if needed
  function checkNewPage() {
    if (yPos < 100) {
      page = pdfDoc.addPage([612, 792]);
      yPos = 750;
    }
  }

  // Iterate through sections
  for (const [sectionName, items] of Object.entries(checklistData)) {
    checkNewPage();
    
    // Section header
    page.drawText(sectionName, {
      x: leftMargin,
      y: yPos,
      size: 14,
      font: boldFont
    });
    yPos -= 20;

    // Items
    for (const item of items) {
      checkNewPage();
      
      const checkbox = document.getElementById(item.id);
      const comment = document.getElementById(`${item.id}-comment`).value;
      
      // Checkbox
      const checkmark = checkbox.checked ? '[X]' : '[ ]';
      page.drawText(checkmark, { x: leftMargin, y: yPos, size: 12, font });
      
      // Label
      page.drawText(item.label, { x: leftMargin + 20, y: yPos, size: 10, font });
      yPos -= lineHeight;
      
      // Comment if exists
      if (comment.trim()) {
        const lines = comment.split('\n');
        for (const line of lines) {
          checkNewPage();
          page.drawText(`    ${line}`, { x: leftMargin + 20, y: yPos, size: 9, font: font });
          yPos -= 12;
        }
      }
      
      yPos -= 5;
    }
    
    yPos -= 10;
  }

  // Equipment Tracking Table
  checkNewPage();
  yPos -= 10;
  page.drawText('Equipment Tracking', { x: leftMargin, y: yPos, size: 14, font: boldFont });
  yPos -= 20;
  
  // Table headers
  page.drawText('Name', { x: leftMargin, y: yPos, size: 10, font: boldFont });
  page.drawText('##', { x: leftMargin + 180, y: yPos, size: 10, font: boldFont });
  page.drawText('Notes', { x: leftMargin + 230, y: yPos, size: 10, font: boldFont });
  yPos -= lineHeight;
  
  const inventoryRows = document.querySelectorAll('#inventoryBody tr');
  let hasInventory = false;
  
  inventoryRows.forEach(row => {
    const name = row.querySelector('.inv-name-label').textContent;
    const number = row.querySelector('.inv-number').value;
    const notes = row.querySelector('.inv-notes').value;
    
    // Always show inventory items (even if just showing "1")
    checkNewPage();
    page.drawText(`${name}`, { x: leftMargin, y: yPos, size: 10, font });
    page.drawText(`${number}`, { x: leftMargin + 180, y: yPos, size: 10, font });
    page.drawText(`${notes}`, { x: leftMargin + 230, y: yPos, size: 9, font });
    yPos -= lineHeight;
  });

  // Signature
  checkNewPage();
  yPos -= 30;
  page.drawText('Manager Signature:', { x: leftMargin, y: yPos, size: 12, font: boldFont });
  yPos -= 15;
  
  // Draw a line for signature
  page.drawLine({
    start: { x: leftMargin, y: yPos },
    end: { x: leftMargin + 300, y: yPos },
    thickness: 1,
    color: rgb(0, 0, 0)
  });
  yPos -= 10;
  
  if (!signaturePad.isEmpty()) {
    const signatureImage = signaturePad.toDataURL('image/png');
    const pngImage = await pdfDoc.embedPng(signatureImage);
    const sigDims = pngImage.scale(0.3);
    page.drawImage(pngImage, {
      x: leftMargin,
      y: yPos - sigDims.height,
      width: sigDims.width,
      height: sigDims.height
    });
  }

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  // Create download link
  const link = document.createElement('a');
  link.href = url;
  link.download = `PM_${storeName.replace(/\s+/g, '_')}_${date}.pdf`;
  
  // For mobile browsers, open in new tab if download doesn't work
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    link.target = '_blank';
  }
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Show success message
  alert('PDF generated! Check your downloads folder or tap "Open in..." to save.');
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
});