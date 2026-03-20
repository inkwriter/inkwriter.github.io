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
    { id: "storeTablet", label: "Store Tablet - Check charging, updates, condition, and printer connection" },
    { id: "phoneGateway", label: "Check Yealink Gateway" },
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

// ─── Autosave / Load / Reset ──────────────────────────────────────────────────

const SAVE_KEY = 'pm_autosave';
let autosaveTimer = null;

function collectFormState() {
  const state = {
    storeName: document.getElementById('storeName').value,
    date: document.getElementById('date').value,
    checklist: {},
    inventory: [],
    signatureData: hasSignature && !signaturePad.isEmpty() ? signaturePad.toDataURL('image/png') : null,
  };

  // Checklist items
  for (const [, items] of Object.entries(checklistData)) {
    for (const item of items) {
      const cb = document.getElementById(item.id);
      const ta = document.getElementById(`${item.id}-comment`);
      state.checklist[item.id] = {
        checked: cb ? cb.checked : false,
        comment: ta ? ta.value : '',
      };
    }
  }

  // Inventory rows
  document.querySelectorAll('#inventoryBody tr').forEach(row => {
    const nameCell = row.querySelector('.inv-name-label');
    const nameInput = nameCell.querySelector('input');
    state.inventory.push({
      name: nameInput ? nameInput.value : nameCell.textContent.trim(),
      isCustom: !!nameInput,
      number: row.querySelector('.inv-number').value,
      notes: row.querySelector('.inv-notes').value,
    });
  });

  return state;
}

function saveFormState() {
  const state = collectFormState();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    console.log('[PM Autosave] ✅ Saved at', new Date().toLocaleTimeString(), state);
  } catch (e) {
    console.error('[PM Autosave] ❌ Save failed:', e);
  }
}

function scheduleSave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    saveFormState();
  }, 800); // debounce: saves 800ms after last change
}

function loadFormState() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    console.log('[PM Autosave] No saved state found.');
    return;
  }

  let state;
  try {
    state = JSON.parse(raw);
    console.log('[PM Autosave] 📂 Loaded saved state:', state);
  } catch (e) {
    console.error('[PM Autosave] ❌ Failed to parse saved state:', e);
    return;
  }

  if (state.storeName) document.getElementById('storeName').value = state.storeName;
  if (state.date) document.getElementById('date').value = state.date;

  // Restore checklist
  for (const [id, val] of Object.entries(state.checklist || {})) {
    const cb = document.getElementById(id);
    const ta = document.getElementById(`${id}-comment`);
    if (cb) cb.checked = val.checked;
    if (ta) ta.value = val.comment;
  }

  // Restore inventory — rebuild custom rows, fill fixed rows
  const tbody = document.getElementById('inventoryBody');
  const fixedRows = Array.from(tbody.querySelectorAll('tr'));
  let fixedIndex = 0;

  (state.inventory || []).forEach(inv => {
    if (!inv.isCustom && fixedIndex < fixedRows.length) {
      const row = fixedRows[fixedIndex++];
      row.querySelector('.inv-number').value = inv.number;
      row.querySelector('.inv-notes').value = inv.notes;
    } else if (inv.isCustom) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="inv-name-label"><input type="text" placeholder="Item name" style="width:100%; border:none; padding:0.5rem;" value="${inv.name}" /></td>
        <td><input type="text" class="inv-number" value="${inv.number}" /></td>
        <td><input type="text" class="inv-notes" value="${inv.notes}" /></td>
        <td><button class="delete-row-btn" onclick="deleteRow(this)">×</button></td>
      `;
      tbody.appendChild(row);
    }
  });

  // Restore signature
  if (state.signatureData) {
    const img = new Image();
    img.onload = () => {
      setTimeout(() => {
        signaturePad.fromDataURL(state.signatureData);
        hasSignature = true;
        document.getElementById('signatureStatus').textContent = '✓ Signed (restored)';
        document.getElementById('signatureStatus').classList.add('signed');
        console.log('[PM Autosave] ✍️ Signature restored.');
      }, 200);
    };
    img.src = state.signatureData;
  }

  console.log('[PM Autosave] ✅ Form restore complete.');
}

function resetForm() {
  if (!confirm('Reset the form? This will clear all data and remove the saved draft.')) return;

  // Clear header fields
  document.getElementById('storeName').value = '';
  document.getElementById('date').valueAsDate = new Date();

  // Clear checklist
  for (const [, items] of Object.entries(checklistData)) {
    for (const item of items) {
      const cb = document.getElementById(item.id);
      const ta = document.getElementById(`${item.id}-comment`);
      if (cb) cb.checked = false;
      if (ta) ta.value = '';
    }
  }

  // Reset inventory: remove custom rows, clear fixed row fields
  const tbody = document.getElementById('inventoryBody');
  Array.from(tbody.querySelectorAll('tr')).forEach(row => {
    if (row.querySelector('.inv-name-label input')) {
      row.remove(); // custom row
    } else {
      row.querySelector('.inv-number').value = '1';
      row.querySelector('.inv-notes').value = '';
    }
  });

  // Clear signature
  signaturePad.clear();
  hasSignature = false;
  document.getElementById('signatureStatus').textContent = 'Not signed';
  document.getElementById('signatureStatus').classList.remove('signed');

  // Clear localStorage
  localStorage.removeItem(SAVE_KEY);
  console.log('[PM Autosave] 🗑️ Form reset. LocalStorage cleared.');
}

// Attach autosave listeners to all relevant inputs
function attachAutosaveListeners() {
  const targets = [
    document.getElementById('storeName'),
    document.getElementById('date'),
  ];
  targets.forEach(el => el && el.addEventListener('input', scheduleSave));

  document.querySelectorAll('.comment-box').forEach(ta => ta.addEventListener('input', scheduleSave));
  document.getElementById('inventoryBody').addEventListener('input', scheduleSave);

  console.log('[PM Autosave] 👂 Listeners attached.');
}

attachAutosaveListeners();
loadFormState();

// ─── Inventory table functions ────────────────────────────────────────────────
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
  scheduleSave();
  console.log('[PM Autosave] ➕ Inventory row added.');
}

function deleteRow(btn) {
  const tbody = document.getElementById('inventoryBody');
  if (tbody.children.length > 1) {
    btn.closest('tr').remove();
    scheduleSave();
    console.log('[PM Autosave] ➖ Inventory row deleted.');
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
    saveFormState(); // save immediately on signature
    console.log('[PM Autosave] ✍️ Signature saved and state persisted.');
  }
  modal.classList.remove('active');
});

// ─── PDF Generation ───────────────────────────────────────────────────────────

/**
 * Word-wrap a string to fit within maxWidth using the given font and fontSize.
 * Returns an array of lines.
 */
function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(test, fontSize);
    if (width > maxWidth && current !== '') {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

document.getElementById('generatePdf').addEventListener('click', async () => {
  const storeName = document.getElementById('storeName').value;
  const dateInput = document.getElementById('date').value;

  if (!storeName || !dateInput) {
    alert('Please fill in Store Name and Date');
    return;
  }

  if (!hasSignature) {
    alert('Please add a manager signature');
    return;
  }

  // Format date as "Month Day, Year"
  const dateObj = new Date(dateInput + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([612, 792]); // Letter size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const leftMargin = 50;
  const rightMargin = 50;
  const pageWidth = 612;
  const usableWidth = pageWidth - leftMargin - rightMargin;
  const lineHeight = 15;
  let yPos = 750;

  // ── Helper: add new page if too close to bottom ──
  function checkNewPage(neededSpace = 20) {
    if (yPos < neededSpace + 50) {
      page = pdfDoc.addPage([612, 792]);
      yPos = 750;
    }
  }

  // ── Helper: draw wrapped text, returns nothing (advances yPos) ──
  function drawWrapped(text, x, startFont, fontSize, maxWidth, indent = 0) {
    const lines = wrapText(text, startFont, fontSize, maxWidth);
    for (let i = 0; i < lines.length; i++) {
      checkNewPage(fontSize + 4);
      page.drawText(lines[i], { x: x + (i > 0 ? indent : 0), y: yPos, size: fontSize, font: startFont });
      yPos -= (fontSize + 4);
    }
  }

  // ── Title ──
  page.drawText('Preventative Maintenance', {
    x: leftMargin, y: yPos, size: 18, font: boldFont
  });
  yPos -= 30;

  page.drawText(`Store Name: ${storeName}`, { x: leftMargin, y: yPos, size: 12, font });
  yPos -= 20;
  page.drawText(`Date: ${formattedDate}`, { x: leftMargin, y: yPos, size: 12, font });
  yPos -= 30;

  // ── Checklist sections ──
  for (const [sectionName, items] of Object.entries(checklistData)) {
    checkNewPage(30);

    // Section header
    page.drawText(sectionName, { x: leftMargin, y: yPos, size: 14, font: boldFont });
    yPos -= 22;

    for (const item of items) {
      checkNewPage(20);

      const checkbox = document.getElementById(item.id);
      const comment = document.getElementById(`${item.id}-comment`).value;
      const checkmark = checkbox.checked ? '[X]' : '[ ]';

      // Draw checkbox mark
      page.drawText(checkmark, { x: leftMargin, y: yPos, size: 11, font });

      // Draw label with word wrap — max width shrinks by checkbox offset (25px)
      const labelX = leftMargin + 25;
      const labelMaxWidth = usableWidth - 25;
      const labelLines = wrapText(item.label, font, 10, labelMaxWidth);

      for (let i = 0; i < labelLines.length; i++) {
        if (i > 0) checkNewPage(14);
        page.drawText(labelLines[i], { x: labelX, y: yPos, size: 10, font });
        yPos -= 14;
      }

      // Comment lines
      if (comment.trim()) {
        const commentIndentX = labelX + 10;
        const commentMaxWidth = usableWidth - 35;
        const rawLines = comment.split('\n');
        for (const rawLine of rawLines) {
          if (!rawLine.trim()) continue;
          const wrapped = wrapText(rawLine, font, 9, commentMaxWidth);
          for (const wl of wrapped) {
            checkNewPage(13);
            page.drawText(wl, { x: commentIndentX, y: yPos, size: 9, font });
            yPos -= 13;
          }
        }
      }

      yPos -= 4; // small gap between items
    }

    yPos -= 10; // gap between sections
  }

  // ── Equipment Tracking Table ──
  checkNewPage(40);
  yPos -= 5;
  page.drawText('Equipment Tracking', { x: leftMargin, y: yPos, size: 14, font: boldFont });
  yPos -= 20;

  // Column X positions
  const col1X = leftMargin;
  const col2X = leftMargin + 200;
  const col3X = leftMargin + 250;
  const col3MaxWidth = pageWidth - rightMargin - col3X;

  // Header row
  page.drawText('Name', { x: col1X, y: yPos, size: 10, font: boldFont });
  page.drawText('##',   { x: col2X, y: yPos, size: 10, font: boldFont });
  page.drawText('Notes',{ x: col3X, y: yPos, size: 10, font: boldFont });
  yPos -= lineHeight;

  const inventoryRows = document.querySelectorAll('#inventoryBody tr');

  inventoryRows.forEach(row => {
    // Fixed rows use a plain td; custom rows use an input inside the td
    const nameCell = row.querySelector('.inv-name-label');
    const nameInput = nameCell.querySelector('input');
    const name  = nameInput ? nameInput.value.trim() : nameCell.textContent.trim();
    const number = row.querySelector('.inv-number').value;
    const notes  = row.querySelector('.inv-notes').value;

    checkNewPage(lineHeight + 4);

    // Name — wrap if needed (max width up to col2)
    const nameLines = wrapText(name, font, 10, col2X - col1X - 5);
    for (let i = 0; i < nameLines.length; i++) {
      if (i > 0) checkNewPage(lineHeight);
      page.drawText(nameLines[i], { x: col1X, y: yPos, size: 10, font });
      if (i === 0) {
        // Draw ## and Notes on first line only
        page.drawText(number, { x: col2X, y: yPos, size: 10, font });
        // Wrap notes
        const noteLines = wrapText(notes, font, 9, col3MaxWidth);
        if (noteLines.length > 0) {
          page.drawText(noteLines[0], { x: col3X, y: yPos, size: 9, font });
          for (let n = 1; n < noteLines.length; n++) {
            yPos -= lineHeight;
            checkNewPage(lineHeight);
            page.drawText(noteLines[n], { x: col3X, y: yPos, size: 9, font });
          }
        }
      }
      yPos -= lineHeight;
    }
  });

  // ── Signature ──
  checkNewPage(100);
  yPos -= 20;
  page.drawText('Manager Signature:', { x: leftMargin, y: yPos, size: 12, font: boldFont });
  yPos -= 15;

  page.drawLine({
    start: { x: leftMargin, y: yPos },
    end:   { x: leftMargin + 300, y: yPos },
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

  // ── Save & Download ──
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `PM_${storeName.replace(/\s+/g, '_')}_${dateInput}.pdf`;

  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    link.target = '_blank';
  }

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  alert('PDF generated! Check your downloads folder or tap "Open in..." to save.');
  setTimeout(() => URL.revokeObjectURL(url), 100);
});
