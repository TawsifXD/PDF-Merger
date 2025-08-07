// DOM Elements
const fileInput = document.getElementById('fileInput');
const dropArea = document.getElementById('dropArea');
const browseBtn = document.getElementById('browseBtn');
const fileList = document.getElementById('fileList');
const noFilesMessage = document.getElementById('noFilesMessage');
const mergeBtn = document.getElementById('mergeBtn');
const message = document.getElementById('message');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

// State variables
let selectedFiles = [];

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // File input change event
  fileInput.addEventListener('change', handleFileSelect);
  
  // Drag and drop events
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });
  
  dropArea.addEventListener('drop', handleDrop, false);
  
  // Browse button click event
  browseBtn.addEventListener('click', () => {
    fileInput.click();
  });
  
  // Merge button click event
  mergeBtn.addEventListener('click', mergePDFs);
});

// Functions
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function highlight() {
  dropArea.classList.add('dragover');
}

function unhighlight() {
  dropArea.classList.remove('dragover');
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles(files);
}

function handleFileSelect(e) {
  const files = e.target.files;
  handleFiles(files);
}

function handleFiles(files) {
  [...files].forEach(addFileToList);
  updateFileListUI();
  updateMergeButtonState();
}

function addFileToList(file) {
  // Check if file is already added
  if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
    showMessage(`File "${file.name}" is already added`, 'info');
    return;
  }
  
  // Check if file is PDF
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    showMessage(`File "${file.name}" is not a PDF file`, 'error');
    return;
  }
  
  selectedFiles.push(file);
}

function updateFileListUI() {
  if (selectedFiles.length === 0) {
    fileList.innerHTML = '<p id="noFilesMessage" class="no-files">No files selected</p>';
    return;
  }
  
  fileList.innerHTML = '';
  selectedFiles.forEach((file, index) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
      <div class="file-info">
        <span class="file-name">${file.name}</span>
        <span class="file-size">(${formatFileSize(file.size)})</span>
      </div>
      <button class="remove-btn" data-index="${index}">×</button>
    `;
    fileList.appendChild(fileItem);
  });
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'));
      removeFile(index);
    });
  });
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updateFileListUI();
  updateMergeButtonState();
}

function updateMergeButtonState() {
  mergeBtn.disabled = selectedFiles.length < 2;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function mergePDFs() {
  if (selectedFiles.length < 2) {
    showMessage('Please select at least 2 PDF files.', 'error');
    return;
  }
  
  // Show progress
  showProgress();
  showMessage('Merging PDFs...', 'info');
  
  try {
    // Create a new PDFDocument
    const mergedPdf = await PDFLib.PDFDocument.create();
    
    // Process each file
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Update progress
      const progress = Math.round(((i + 1) / selectedFiles.length) * 100);
      updateProgress(progress, `Processing ${file.name}...`);
      
      // Convert file to array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
      
      // Copy pages to merged PDF
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    
    // Save the merged PDF
    updateProgress(100, 'Saving merged PDF...');
    const mergedPdfFile = await mergedPdf.save();
    
    // Create download link
    const blob = new Blob([mergedPdfFile], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged.pdf';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    // Show success message
    hideProgress();
    showMessage('PDFs merged successfully! Download started.', 'success');
  } catch (error) {
    console.error('Error merging PDFs:', error);
    hideProgress();
    showMessage('Error merging PDFs: ' + error.message, 'error');
  }
}

function showProgress() {
  progressContainer.classList.remove('hidden');
  progressBar.style.width = '0%';
  progressText.textContent = 'Processing...';
}

function updateProgress(percent, text) {
  progressBar.style.width = `${percent}%`;
  progressText.textContent = text;
}

function hideProgress() {
  progressContainer.classList.add('hidden');
}

function showMessage(text, type) {
  // Clear previous classes
  message.className = 'message';
  
  // Add new class based on type
  if (type) {
    message.classList.add(type);
  }
  
  message.textContent = text;
}
