document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const displayNameInput = document.getElementById('display-name');
    const fileNameDisplay = document.getElementById('file-name');
    const filesList = document.getElementById('files-list');
    const uploadProgress = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
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
    
    // Event listeners
    uploadForm.addEventListener('submit', handleFileUpload);
    
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        const fileName = fileInput.files[0].name;
        fileNameDisplay.textContent = fileName;
        
        // Pre-fill the display name input with the file name
        if (!displayNameInput.value) {
          displayNameInput.value = fileName;
        }
      } else {
        fileNameDisplay.textContent = 'Choose a file...';
        displayNameInput.value = '';
      }
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
      
      if (item.type === 'folder') {
        itemElement.className = 'file-item folder';
        
        itemElement.innerHTML = `
          <div class="file-info">
            <div class="file-icon">
              <i class="fas fa-folder folder-icon"></i>
            </div>
            <div class="file-details">
              <div class="file-name">${item.name}</div>
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
            <button class="delete-btn action-icon-btn" data-path="${item.path}" title="Delete">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        `;
        
        // Add event to navigate into the folder
        itemElement.querySelector('.file-info').addEventListener('click', () => {
          navigateTo(item.path);
        });
      } else {
        // It's a file
        const displayName = getDisplayName(item.name);
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
            <button class="delete-btn action-icon-btn" data-path="${item.path}" title="Delete">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        `;
      }
      
      // Add event listeners to buttons
      const renameBtn = itemElement.querySelector('.rename-btn');
      const downloadBtn = itemElement.querySelector('.download-btn');
      const deleteBtn = itemElement.querySelector('.delete-btn');
      
      if (renameBtn) {
        renameBtn.addEventListener('click', () => {
          openRenameModal(item.path, renameBtn.dataset.type, getDisplayName(item.name));
        });
      }
      
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          downloadFile(item.path, getDisplayName(item.name));
        });
      }
      
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          deleteItem(item.path, item.type, item.name);
        });
      }
      
      return itemElement;
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
    
    async function deleteItem(itemPath, itemType, itemName) {
      const displayName = getDisplayName(itemName);
      const typeLabel = itemType === 'folder' ? 'folder' : 'file';
      
      if (!confirm(`Are you sure you want to delete this ${typeLabel}: "${displayName}"?`)) {
        return;
      }
      
      try {
        const response = await fetch(`/api/items/${encodeURIComponent(itemPath)}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        showToast(`${displayName} has been deleted.`, 'success');
        
        // Reload the files list
        loadFiles(currentPath);
      } catch (error) {
        console.error('Error deleting item:', error);
        showToast(`Error deleting item: ${error.message}`, 'error');
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
    
    async function handleFileUpload(event) {
      event.preventDefault();
      
      if (!fileInput.files.length) {
        showToast('Please select a file to upload.', 'error');
        return;
      }
      
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append('file', file);
      
      // Add current folder path
      formData.append('folderPath', currentPath);
      
      // Add custom display name if provided
      if (displayNameInput.value.trim()) {
        formData.append('displayName', displayNameInput.value.trim());
      }
      
      // Show progress bar
      uploadProgress.style.display = 'block';
      progressBar.style.width = '0%';
      
      try {
        const xhr = new XMLHttpRequest();
        
        xhr.open('POST', '/api/upload', true);
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            progressBar.style.width = percentComplete + '%';
          }
        };
        
        xhr.onload = function() {
          if (xhr.status === 200) {
            // Reset form and progress bar
            fileNameDisplay.textContent = 'Choose a file...';
            uploadForm.reset();
            setTimeout(() => {
              uploadProgress.style.display = 'none';
              progressBar.style.width = '0%';
            }, 1000);
            
            const displayName = displayNameInput.value.trim() || file.name;
            showToast(`${displayName} uploaded successfully!`, 'success');
            
            // Reload the files list
            loadFiles(currentPath);
          } else {
            try {
              const response = JSON.parse(xhr.responseText);
              showToast(`Upload failed: ${response.error || xhr.statusText}`, 'error');
            } catch (e) {
              showToast(`Upload failed: ${xhr.statusText}`, 'error');
            }
          }
        };
        
        xhr.onerror = function() {
          showToast('Upload failed: Network error', 'error');
        };
        
        xhr.send(formData);
      } catch (error) {
        console.error('Error uploading file:', error);
        showToast(`Error uploading file: ${error.message}`, 'error');
        uploadProgress.style.display = 'none';
      }
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
  });