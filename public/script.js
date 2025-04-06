document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const uploadForm = document.getElementById('upload-form');
  const fileInput = document.getElementById('file-input');
  const displayNameInput = document.getElementById('display-name');
  const fileNameDisplay = document.getElementById('file-name');
  const filesList = document.getElementById('files-list');
  const uploadProgress = document.getElementById('upload-progress');
  const progressBar = document.getElementById('progress-bar');
  const selectedFilesContainer = document.getElementById('selected-files-container');
  const toast = document.getElementById('toast');
  const breadcrumb = document.getElementById('breadcrumb');
  const newFolderBtn = document.getElementById('new-folder-btn');
  const newFolderModal = document.getElementById('new-folder-modal');
  const newFolderForm = document.getElementById('new-folder-form');
  const renameModal = document.getElementById('rename-modal');
  const renameForm = document.getElementById('rename-form');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.querySelector('.theme-icon i');
  
  // State
  let currentPath = '';
  let selectedFiles = [];
  let uploadQueue = [];
  let isUploading = false;
  
  // File type icons mapping
  const fileTypeIcons = {
    'image': 'fa-file-image',
    'pdf': 'fa-file-pdf',
    'doc': 'fa-file-word',
    'docx': 'fa-file-word',
    'xls': 'fa-file-excel',
    'xlsx': 'fa-file-excel',
    'ppt': 'fa-file-powerpoint',
    'pptx': 'fa-file-powerpoint',
    'zip': 'fa-file-archive',
    'rar': 'fa-file-archive',
    'txt': 'fa-file-alt',
    'mp3': 'fa-file-audio',
    'wav': 'fa-file-audio',
    'mp4': 'fa-file-video',
    'mov': 'fa-file-video',
    'html': 'fa-file-code',
    'css': 'fa-file-code',
    'js': 'fa-file-code',
    'json': 'fa-file-code',
    'default': 'fa-file'
  };
  
  // File type categories for color coding
  const fileTypeCategories = {
    'image': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
    'document': ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'html', 'md'],
    'archive': ['zip', 'rar', '7z', 'tar', 'gz'],
    'video': ['mp4', 'mov', 'avi', 'wmv', 'mkv', 'webm'],
    'audio': ['mp3', 'wav', 'ogg', 'flac', 'm4a']
  };
  
  // Initialize theme from localStorage
  initTheme();
  
  // Load files on page load
  loadFiles(currentPath);
  
  // Setup drag and drop functionality
  setupDragAndDrop();
  
  // Event listeners
  uploadForm.addEventListener('submit', handleFileUpload);
  
  fileInput.addEventListener('change', () => {
    updateSelectedFiles();
  });
  
  // Breadcrumb navigation
  breadcrumb.addEventListener('click', (e) => {
    const breadcrumbItem = e.target.closest('.breadcrumb-item');
    if (breadcrumbItem) {
      const path = breadcrumbItem.dataset.path;
      navigateTo(path);
    }
  });
  
  // New folder button
  newFolderBtn.addEventListener('click', () => {
    openModal(newFolderModal);
  });
  
  // New folder form
  newFolderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    createFolder();
  });
  
  // Rename form
  renameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    renameItem();
  });
  
  // Close modal buttons
  document.querySelectorAll('.modal-close-btn, .cancel-btn').forEach(button => {
    button.addEventListener('click', () => {
      closeAllModals();
    });
  });
  
  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeAllModals();
    }
  });
  
  // Dark mode toggle
  themeToggle.addEventListener('change', () => {
    toggleTheme();
  });
  
  // Functions
  function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
  
  function openModal(modal) {
    closeAllModals();
    modal.classList.add('show');
  }
  
  function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('show');
    });
    
    // Reset form values
    document.getElementById('folder-name').value = '';
    document.getElementById('new-name').value = '';
  }
  
  function updateBreadcrumb(path) {
    breadcrumb.innerHTML = `
      <button class="breadcrumb-item" data-path="">
        <i class="fas fa-home"></i> Home
      </button>
    `;
    
    if (path) {
      const parts = path.split('/');
      let currentPath = '';
      
      parts.forEach((part, index) => {
        if (part) {
          currentPath += (currentPath ? '/' : '') + part;
          
          // Add separator
          const separator = document.createElement('span');
          separator.className = 'breadcrumb-separator';
          separator.textContent = '/';
          breadcrumb.appendChild(separator);
          
          // Add breadcrumb item
          const breadcrumbItem = document.createElement('button');
          breadcrumbItem.className = 'breadcrumb-item';
          breadcrumbItem.dataset.path = currentPath;
          breadcrumbItem.innerHTML = `<i class="fas fa-folder"></i> ${part}`;
          breadcrumb.appendChild(breadcrumbItem);
        }
      });
    }
  }
  
  function navigateTo(path) {
    currentPath = path;
    updateBreadcrumb(path);
    loadFiles(path);
  }
  
  async function loadFiles(path) {
    try {
      filesList.innerHTML = `
        <div class="loading-indicator">
          <div class="spinner"></div>
        </div>
      `;
      
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const items = await response.json();
      
      if (items.length === 0) {
        filesList.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
              <i class="fas fa-folder-open"></i>
            </div>
            <p>This folder is empty. Upload files or create folders to get started!</p>
          </div>
        `;
        return;
      }
      
      // Sort items: folders first, then files, both alphabetically
      items.sort((a, b) => {
        if (a.type === b.type) {
          // If both are the same type, sort alphabetically
          return a.name.localeCompare(b.name);
        }
        // Folders come first
        return a.type === 'folder' ? -1 : 1;
      });
      
      filesList.innerHTML = '';
      
      items.forEach(item => {
        const itemElement = createItemElement(item);
        filesList.appendChild(itemElement);
      });
    } catch (error) {
      console.error('Error loading files:', error);
      filesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <p>Error loading items: ${error.message}</p>
        </div>
      `;
    }
  }
  
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    }
    
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
  }
  
  function getFileIcon(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    
    for (const type in fileTypeIcons) {
      if (type === extension) {
        return fileTypeIcons[type];
      }
    }
    
    return fileTypeIcons.default;
  }
  
  function getFileCategory(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    
    for (const category in fileTypeCategories) {
      if (fileTypeCategories[category].includes(extension)) {
        return category;
      }
    }
    
    return 'default';
  }
  
  function getDisplayName(filename) {
    // For files, original filename is after the timestamp and dash
    if (filename.includes('-')) {
      const parts = filename.split('-');
      // If it has the timestamp format
      if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts.slice(2).join('-');
      }
    }
    return filename;
  }
  
  function createItemElement(item) {
    const itemElement = document.createElement('div');
    const displayName = getDisplayName(item.name);
    
    if (item.type === 'folder') {
      itemElement.className = 'file-item folder';
      
      itemElement.innerHTML = `
        <div class="file-info">
          <div class="file-icon">
            <i class="fas fa-folder folder-icon"></i>
          </div>
          <div class="file-details">
            <div class="file-name">${displayName}</div>
            <div class="file-meta">
              <span class="meta-item">
                <i class="fas fa-clock"></i> ${formatTimeAgo(item.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div class="file-actions">
          <button class="rename-btn action-icon-btn" data-path="${item.path}" data-type="folder" title="Rename">
            <i class="fas fa-edit"></i>
          </button>
          <button class="delete-btn action-icon-btn" data-path="${item.path}" data-type="folder" data-name="${item.name}" title="Delete">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
        <div class="delete-confirmation">
          <button class="cancel-delete-btn" title="Cancel"><i class="fas fa-times"></i></button>
          <button class="confirm-delete-btn" title="Delete"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
      
      // Add event to navigate into the folder
      itemElement.querySelector('.file-info').addEventListener('click', () => {
        navigateTo(item.path);
      });
    } else {
      // It's a file
      const fileIconClass = getFileIcon(displayName);
      const fileCategory = getFileCategory(displayName);
      
      itemElement.className = `file-item ${fileCategory}`;
      
      itemElement.innerHTML = `
        <div class="file-info">
          <div class="file-icon">
            <i class="fas ${fileIconClass}"></i>
          </div>
          <div class="file-details">
            <div class="file-name">${displayName}</div>
            <div class="file-meta">
              <span class="meta-item">
                <i class="fas fa-hdd"></i> ${formatFileSize(item.size)}
              </span>
              <span class="meta-item">
                <i class="fas fa-clock"></i> ${formatTimeAgo(item.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div class="file-actions">
          <button class="rename-btn action-icon-btn" data-path="${item.path}" data-type="file" title="Rename">
            <i class="fas fa-edit"></i>
          </button>
          <button class="download-btn action-icon-btn" data-path="${item.path}" title="Download">
            <i class="fas fa-download"></i>
          </button>
          <button class="delete-btn action-icon-btn" data-path="${item.path}" data-type="file" data-name="${item.name}" title="Delete">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
        <div class="delete-confirmation">
          <button class="cancel-delete-btn" title="Cancel"><i class="fas fa-times"></i></button>
          <button class="confirm-delete-btn" title="Delete"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
    }
    
    // Add event listeners to buttons
    const renameBtn = itemElement.querySelector('.rename-btn');
    const downloadBtn = itemElement.querySelector('.download-btn');
    const deleteBtn = itemElement.querySelector('.delete-btn');
    const cancelDeleteBtn = itemElement.querySelector('.cancel-delete-btn');
    const confirmDeleteBtn = itemElement.querySelector('.confirm-delete-btn');
    
    if (renameBtn) {
      renameBtn.addEventListener('click', () => {
        openRenameModal(item.path, renameBtn.dataset.type, displayName);
      });
    }
    
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        downloadFile(item.path, displayName);
      });
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        showDeleteConfirmation(itemElement);
      });
    }
    
    if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener('click', () => {
        hideDeleteConfirmation(itemElement);
      });
    }
    
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        deleteItem(item.path, item.type, item.name, itemElement);
      });
    }
    
    return itemElement;
  }
  
  function showDeleteConfirmation(itemElement) {
    // Get elements
    const fileActions = itemElement.querySelector('.file-actions');
    const deleteBtn = itemElement.querySelector('.delete-btn');
    const deleteConfirmation = itemElement.querySelector('.delete-confirmation');
    
    // Add animation class to item
    itemElement.classList.add('confirm-delete-mode');
    
    // Initial setup for animation
    deleteConfirmation.style.display = 'flex';
    
    // Store the position of the delete button for animation reference
    const deleteBtnRect = deleteBtn.getBoundingClientRect();
    const itemRect = itemElement.getBoundingClientRect();
    
    // Set the initial position of confirm button to match delete button position
    const confirmBtn = deleteConfirmation.querySelector('.confirm-delete-btn');
    confirmBtn.style.transform = 'scale(0.33)';
    
    // Animate elements
    setTimeout(() => {
      fileActions.style.visibility = 'hidden';
      deleteConfirmation.style.opacity = '1';
      confirmBtn.style.transform = 'scale(1)';
    }, 50);
  }
  
  function hideDeleteConfirmation(itemElement) {
    // Get elements
    const fileActions = itemElement.querySelector('.file-actions');
    const deleteConfirmation = itemElement.querySelector('.delete-confirmation');
    const confirmBtn = deleteConfirmation.querySelector('.confirm-delete-btn');
    
    // Animate back
    confirmBtn.style.transform = 'scale(0.33)';
    deleteConfirmation.style.opacity = '0';
    
    // Remove the animation class
    itemElement.classList.remove('confirm-delete-mode');
    
    // Reset display after animation completes
    setTimeout(() => {
      fileActions.style.visibility = 'visible';
      deleteConfirmation.style.display = 'none';
      confirmBtn.style.transform = '';
    }, 300);
  }
  
  function openRenameModal(itemPath, itemType, currentName) {
    document.getElementById('rename-path').value = itemPath;
    document.getElementById('rename-type').value = itemType;
    document.getElementById('new-name').value = currentName;
    
    openModal(renameModal);
  }
  
  function downloadFile(filePath, displayName) {
    // Create a link and simulate a click to download the file
    const downloadUrl = `/api/download/${encodeURIComponent(filePath)}`;
    
    // Create a temporary link element and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Downloading ${displayName}...`, 'success');
  }
  
  async function deleteItem(itemPath, itemType, itemName, itemElement) {
    try {
      // Start with animation
      const confirmBtn = itemElement.querySelector('.confirm-delete-btn');
      confirmBtn.classList.add('deleting');
      
      const response = await fetch(`/api/items/${encodeURIComponent(itemPath)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const displayName = getDisplayName(itemName);
      showToast(`${displayName} has been deleted.`, 'success');
      
      // Add a fade-out animation to the item
      itemElement.classList.add('item-deleting');
      
      // Wait for animation to complete before reloading
      setTimeout(() => {
        // Reload the files list
        loadFiles(currentPath);
      }, 300);
      
    } catch (error) {
      console.error('Error deleting item:', error);
      showToast(`Error deleting item: ${error.message}`, 'error');
      hideDeleteConfirmation(itemElement);
    }
  }
  
  async function createFolder() {
    const folderName = document.getElementById('folder-name').value.trim();
    
    if (!folderName) {
      showToast('Please enter a folder name.', 'error');
      return;
    }
    
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: currentPath,
          name: folderName
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }
      
      closeAllModals();
      showToast(`Folder "${folderName}" created successfully.`, 'success');
      
      // Reload the files list
      loadFiles(currentPath);
    } catch (error) {
      console.error('Error creating folder:', error);
      showToast(`Error creating folder: ${error.message}`, 'error');
    }
  }
  
  async function renameItem() {
    const itemPath = document.getElementById('rename-path').value;
    const itemType = document.getElementById('rename-type').value;
    const newName = document.getElementById('new-name').value.trim();
    
    if (!newName) {
      showToast('Please enter a new name.', 'error');
      return;
    }
    
    try {
      const response = await fetch('/api/rename', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: itemPath,
          newName: newName
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename item');
      }
      
      closeAllModals();
      showToast(`Item renamed successfully to "${newName}".`, 'success');
      
      // Reload the files list
      loadFiles(currentPath);
    } catch (error) {
      console.error('Error renaming item:', error);
      showToast(`Error renaming item: ${error.message}`, 'error');
    }
  }
  
  // Update selected files preview
  function updateSelectedFiles() {
    if (!fileInput.files.length) {
      selectedFilesContainer.style.display = 'none';
      fileNameDisplay.textContent = 'Choose files...';
      return;
    }
    
    const files = Array.from(fileInput.files);
    selectedFiles = files;
    
    // Update the file name display with count
    fileNameDisplay.textContent = `${files.length} file${files.length > 1 ? 's' : ''} selected`;
    
    // Clear the container
    selectedFilesContainer.innerHTML = '';
    
    // Create a preview for each file
    files.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'selected-file-item';
      fileItem.dataset.index = index;
      
      // Get file icon based on type
      const fileIconClass = getFileIconFromMime(file.type) || getFileIcon(file.name);
      
      fileItem.innerHTML = `
        <div class="selected-file-info">
          <div class="selected-file-icon">
            <i class="fas ${fileIconClass}"></i>
          </div>
          <div class="selected-file-name">${file.name}</div>
          <div class="selected-file-size">${formatFileSize(file.size)}</div>
        </div>
        <button type="button" class="selected-file-remove" data-index="${index}">
          <i class="fas fa-times"></i>
        </button>
      `;
      
      selectedFilesContainer.appendChild(fileItem);
      
      // Add remove event listener
      const removeButton = fileItem.querySelector('.selected-file-remove');
      removeButton.addEventListener('click', () => {
        removeSelectedFile(index);
      });
    });
    
    // Show the container if there are files
    if (files.length > 0) {
      selectedFilesContainer.style.display = 'block';
    } else {
      selectedFilesContainer.style.display = 'none';
    }
    
    // Adjust display name input placeholder based on number of files
    if (files.length > 1) {
      displayNameInput.placeholder = "Display name will use original filenames";
      displayNameInput.disabled = true;
      displayNameInput.value = "";
    } else {
      displayNameInput.placeholder = "Enter display name (optional)";
      displayNameInput.disabled = false;
      // Pre-fill with the file name for convenience
      if (!displayNameInput.value && files.length === 1) {
        displayNameInput.value = files[0].name;
      }
    }
  }
  
  // Remove a file from the selected files
  function removeSelectedFile(index) {
    // Can't directly modify a FileList, need to create a new one
    // We'll create a new input element and copy all files except the one to remove
    const newFileInput = document.createElement('input');
    newFileInput.type = 'file';
    newFileInput.multiple = true;
    
    // Create a DataTransfer object to build a new FileList
    const dataTransfer = new DataTransfer();
    
    // Add all files except the one to remove
    Array.from(fileInput.files).forEach((file, i) => {
      if (i !== index) {
        dataTransfer.items.add(file);
      }
    });
    
    // Set the new file list
    fileInput.files = dataTransfer.files;
    
    // Update the UI
    updateSelectedFiles();
  }
  
  // Get file icon from MIME type
  function getFileIconFromMime(mimeType) {
    if (!mimeType) return null;
    
    if (mimeType.startsWith('image/')) return 'fa-file-image';
    if (mimeType.startsWith('video/')) return 'fa-file-video';
    if (mimeType.startsWith('audio/')) return 'fa-file-audio';
    if (mimeType.startsWith('text/')) return 'fa-file-alt';
    if (mimeType.includes('pdf')) return 'fa-file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'fa-file-excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint';
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return 'fa-file-archive';
    if (mimeType.includes('html') || mimeType.includes('javascript') || mimeType.includes('css')) return 'fa-file-code';
    
    return null;
  }
  
  // Setup drag and drop functionality
  function setupDragAndDrop() {
    const dropZone = document.querySelector('.file-input-label');
    const uploadContainer = document.querySelector('.upload-container');
    
    // Prevent default behavior to allow drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadContainer.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
      dropZone.classList.add('drag-over');
    }
    
    function unhighlight() {
      dropZone.classList.remove('drag-over');
    }
    
    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      
      if (files.length > 0) {
        // Update the file input with the dropped files
        fileInput.files = files;
        
        // Update the UI to show selected files
        updateSelectedFiles();
      }
    }
  }
  
  // Handle file upload
  async function handleFileUpload(event) {
    event.preventDefault();
    
    if (!fileInput.files.length) {
      showToast('Please select at least one file to upload.', 'error');
      return;
    }
    
    const files = Array.from(fileInput.files);
    
    // Prepare the upload queue
    uploadQueue = files.map(file => ({
      file,
      status: 'pending', // pending, uploading, success, error
      progress: 0,
      displayName: files.length === 1 && displayNameInput.value.trim() ? displayNameInput.value.trim() : file.name
    }));
    
    // Create upload status UI
    createUploadStatusUI();
    
    // Start the upload process
    processUploadQueue();
  }
  
  // Create upload status UI
  function createUploadStatusUI() {
    // Clear any existing UI
    selectedFilesContainer.innerHTML = '';
    
    // Create UI for each file in the queue
    uploadQueue.forEach((item, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'selected-file-item';
      fileItem.dataset.index = index;
      
      // Get file icon based on type
      const fileIconClass = getFileIconFromMime(item.file.type) || getFileIcon(item.file.name);
      
      fileItem.innerHTML = `
        <div class="selected-file-info">
          <div class="selected-file-icon">
            <i class="fas ${fileIconClass}"></i>
          </div>
          <div class="selected-file-name">${item.file.name}</div>
          <div class="file-status">Pending</div>
        </div>
        <div class="file-progress-container">
          <div class="file-progress-bar" style="width: 0%"></div>
        </div>
      `;
      
      selectedFilesContainer.appendChild(fileItem);
    });
    
    selectedFilesContainer.style.display = 'block';
  }
  
  // Process upload queue
  async function processUploadQueue() {
    if (isUploading || uploadQueue.length === 0) return;
    
    isUploading = true;
    
    // For single file upload, use the original method with display name
    if (uploadQueue.length === 1) {
      await uploadSingleFile(uploadQueue[0], 0);
    } else {
      // For multiple files, upload them in batches
      await uploadMultipleFiles(uploadQueue);
    }
    
    // All uploads completed
    isUploading = false;
    
    // Count successes and failures
    const successful = uploadQueue.filter(item => item.status === 'success').length;
    const failed = uploadQueue.filter(item => item.status === 'error').length;
    
    // Show a summary toast
    if (failed === 0) {
      showToast(`Successfully uploaded ${successful} file${successful !== 1 ? 's' : ''}.`, 'success');
    } else if (successful === 0) {
      showToast(`Failed to upload ${failed} file${failed !== 1 ? 's' : ''}.`, 'error');
    } else {
      showToast(`Uploaded ${successful} file${successful !== 1 ? 's' : ''}, ${failed} failed.`, 'info');
    }
    
    // Reset form
    resetUploadForm();
    
    // Reload file list
    loadFiles(currentPath);
  }
  
  // Upload a single file
  async function uploadSingleFile(item, index) {
    const fileItem = selectedFilesContainer.querySelector(`[data-index="${index}"]`);
    const progressBar = fileItem.querySelector('.file-progress-bar');
    const statusEl = fileItem.querySelector('.file-status');
    
    // Update status
    item.status = 'uploading';
    statusEl.textContent = 'Uploading...';
    
    try {
      // Create form data for this file
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('folderPath', currentPath);
      
      // Add custom display name if provided (for single files)
      if (item.displayName !== item.file.name) {
        formData.append('displayName', item.displayName);
      }
      
      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Create a promise to handle the upload
      await new Promise((resolve, reject) => {
        xhr.open('POST', '/api/upload', true);
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            progressBar.style.width = percentComplete + '%';
            item.progress = percentComplete;
          }
        };
        
        xhr.onload = function() {
          if (xhr.status === 200) {
            item.status = 'success';
            statusEl.textContent = 'Complete';
            statusEl.classList.add('success');
            progressBar.style.width = '100%';
            resolve();
          } else {
            item.status = 'error';
            statusEl.textContent = 'Failed';
            statusEl.classList.add('error');
            
            try {
              const response = JSON.parse(xhr.responseText);
              reject(new Error(response.error || 'Upload failed'));
            } catch (e) {
              reject(new Error('Upload failed'));
            }
          }
        };
        
        xhr.onerror = function() {
          item.status = 'error';
          statusEl.textContent = 'Failed';
          statusEl.classList.add('error');
          reject(new Error('Network error'));
        };
        
        xhr.send(formData);
      });
      
    } catch (error) {
      console.error(`Error uploading ${item.file.name}:`, error);
      item.status = 'error';
      statusEl.textContent = 'Failed';
      statusEl.classList.add('error');
    }
  }
  
  // Upload multiple files
  async function uploadMultipleFiles(items) {
    // Create batches of files to upload (max 5 at a time)
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    // Process each batch
    for (const batch of batches) {
      await Promise.all(batch.map(async (item, batchIndex) => {
        // Find the item index in the original array
        const index = items.indexOf(item);
        const fileItem = selectedFilesContainer.querySelector(`[data-index="${index}"]`);
        const progressBar = fileItem.querySelector('.file-progress-bar');
        const statusEl = fileItem.querySelector('.file-status');
        
        // Update status
        item.status = 'uploading';
        statusEl.textContent = 'Uploading...';
        
        try {
          // Create form data for this file
          const formData = new FormData();
          formData.append('file', item.file);
          formData.append('folderPath', currentPath);
          
          // Create XMLHttpRequest for progress tracking
          const xhr = new XMLHttpRequest();
          
          // Create a promise to handle the upload
          await new Promise((resolve, reject) => {
            xhr.open('POST', '/api/upload', true);
            
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                progressBar.style.width = percentComplete + '%';
                item.progress = percentComplete;
              }
            };
            
            xhr.onload = function() {
              if (xhr.status === 200) {
                item.status = 'success';
                statusEl.textContent = 'Complete';
                statusEl.classList.add('success');
                progressBar.style.width = '100%';
                resolve();
              } else {
                item.status = 'error';
                statusEl.textContent = 'Failed';
                statusEl.classList.add('error');
                
                try {
                  const response = JSON.parse(xhr.responseText);
                  reject(new Error(response.error || 'Upload failed'));
                } catch (e) {
                  reject(new Error('Upload failed'));
                }
              }
            };
            
            xhr.onerror = function() {
              item.status = 'error';
              statusEl.textContent = 'Failed';
              statusEl.classList.add('error');
              reject(new Error('Network error'));
            };
            
            xhr.send(formData);
          });
          
        } catch (error) {
          console.error(`Error uploading ${item.file.name}:`, error);
          item.status = 'error';
          statusEl.textContent = 'Failed';
          statusEl.classList.add('error');
        }
      }));
    }
  }
  
  // Reset the upload form
  function resetUploadForm() {
    setTimeout(() => {
      uploadForm.reset();
      fileNameDisplay.textContent = 'Choose files...';
      fileInput.value = '';
      
      // Don't immediately hide the status UI so the user can see the results
      setTimeout(() => {
        selectedFilesContainer.style.display = 'none';
        selectedFilesContainer.innerHTML = '';
        displayNameInput.disabled = false;
        displayNameInput.placeholder = "Enter display name (optional)";
      }, 3000);
      
      // Clear arrays
      selectedFiles = [];
      uploadQueue = [];
    }, 1000);
  }
  
  // Theme functions
  function initTheme() {
    // Check for saved theme preference
    const darkMode = localStorage.getItem('darkMode') === 'true';
    
    // Apply theme based on preference
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggle.checked = true;
      themeIcon.classList.replace('fa-moon', 'fa-sun');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      themeToggle.checked = false;
      themeIcon.classList.replace('fa-sun', 'fa-moon');
    }
  }
  
  function toggleTheme() {
    if (themeToggle.checked) {
      // Switch to dark mode
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('darkMode', 'true');
      themeIcon.classList.replace('fa-moon', 'fa-sun');
    } else {
      // Switch to light mode
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('darkMode', 'false');
      themeIcon.classList.replace('fa-sun', 'fa-moon');
    }
  }
  
  // Theme Switcher
  function initThemeSwitcher() {
    // Create the theme switcher UI
    const themeSwitcherContainer = document.createElement('div');
    themeSwitcherContainer.className = 'theme-switcher-container';
    themeSwitcherContainer.innerHTML = `
      <div class="theme-switcher-toggle">
        <i class="fas fa-palette"></i>
      </div>
      <div class="theme-options">
        <div class="theme-options-header">
          <h3>Select Theme</h3>
          <button class="theme-close-btn"><i class="fas fa-times"></i></button>
        </div>
        <div class="theme-list">
          <div class="theme-loading">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(themeSwitcherContainer);
    
    // Get DOM elements
    const themeToggle = themeSwitcherContainer.querySelector('.theme-switcher-toggle');
    const themeOptions = themeSwitcherContainer.querySelector('.theme-options');
    const themeCloseBtn = themeSwitcherContainer.querySelector('.theme-close-btn');
    const themeList = themeSwitcherContainer.querySelector('.theme-list');
    
    // Toggle theme options panel
    themeToggle.addEventListener('click', () => {
      themeOptions.classList.toggle('show');
      if (themeOptions.classList.contains('show')) {
        loadThemes();
      }
    });
    
    // Close theme options panel
    themeCloseBtn.addEventListener('click', () => {
      themeOptions.classList.remove('show');
    });
    
    // Close when clicking outside
    window.addEventListener('click', (e) => {
      if (!themeSwitcherContainer.contains(e.target)) {
        themeOptions.classList.remove('show');
      }
    });
    
    // Load available themes
    function loadThemes() {
      themeList.innerHTML = `
        <div class="theme-loading">
          <div class="spinner"></div>
        </div>
      `;
      
      fetch('/api/themes')
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          renderThemeList(data.themes, data.activeTheme);
        })
        .catch(error => {
          console.error('Error loading themes:', error);
          themeList.innerHTML = `
            <div class="theme-error">
              <i class="fas fa-exclamation-triangle"></i>
              <p>Error loading themes</p>
            </div>
          `;
        });
    }
    
    // Render theme list
    function renderThemeList(themes, activeTheme) {
      if (!themes || themes.length === 0) {
        themeList.innerHTML = `
          <div class="theme-empty">
            <i class="fas fa-info-circle"></i>
            <p>No themes found. Add CSS files to the 'themes' folder.</p>
          </div>
        `;
        return;
      }
      
      // Add default theme option
      const defaultThemeItem = document.createElement('div');
      defaultThemeItem.className = `theme-item ${activeTheme === 'default' ? 'active' : ''}`;
      defaultThemeItem.dataset.theme = 'default';
      defaultThemeItem.innerHTML = `
        <div class="theme-color default-theme"></div>
        <span>Default Theme</span>
        ${activeTheme === 'default' ? '<i class="fas fa-check"></i>' : ''}
      `;
      
      const themeItems = [defaultThemeItem];
      
      // Create theme items for each CSS file
      themes.forEach(theme => {
        const themeItem = document.createElement('div');
        themeItem.className = `theme-item ${activeTheme === theme ? 'active' : ''}`;
        themeItem.dataset.theme = theme;
        
        // Create a pretty name from the filename (remove .css and capitalize)
        const themeName = theme.replace('.css', '')
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        themeItem.innerHTML = `
          <div class="theme-color" style="background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));"></div>
          <span>${themeName}</span>
          ${activeTheme === theme ? '<i class="fas fa-check"></i>' : ''}
        `;
        
        themeItems.push(themeItem);
      });
      
      // Clear and append all theme items
      themeList.innerHTML = '';
      themeItems.forEach(item => {
        themeList.appendChild(item);
        
        // Add click event to select theme
        item.addEventListener('click', () => {
          setActiveTheme(item.dataset.theme);
        });
      });
    }
    
    // Set active theme
    function setActiveTheme(themeName) {
      fetch('/api/themes/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ themeName }),
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          if (data.success) {
            // Update link element
            let themeLink = document.getElementById('theme-stylesheet');
            
            if (!themeLink) {
              // Create the link element if it doesn't exist
              themeLink = document.createElement('link');
              themeLink.id = 'theme-stylesheet';
              themeLink.rel = 'stylesheet';
              document.head.appendChild(themeLink);
            }
            
            // Update href based on selected theme
            if (themeName === 'default') {
              themeLink.href = '/styles.css';
            } else {
              themeLink.href = `/themes/${themeName}`;
            }
            
            // Update active state in UI
            const activeItem = themeList.querySelector('.theme-item.active');
            if (activeItem) {
              activeItem.classList.remove('active');
              activeItem.querySelector('.fas.fa-check')?.remove();
            }
            
            const newActiveItem = themeList.querySelector(`[data-theme="${themeName}"]`);
            if (newActiveItem) {
              newActiveItem.classList.add('active');
              if (!newActiveItem.querySelector('.fas.fa-check')) {
                const checkIcon = document.createElement('i');
                checkIcon.className = 'fas fa-check';
                newActiveItem.appendChild(checkIcon);
              }
            }
            
            // Theme change complete (removed toast notification)
          }
        })
        .catch(error => {
          console.error('Error setting theme:', error);
          showToast('Error setting theme. See console for details.', 'error');
        });
    }
  }

  // Initialize theme switcher
  initThemeSwitcher();
});