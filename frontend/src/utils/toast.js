// Frontend/src/utils/toast.js

let toastContainer = null;

// Inicializar el contenedor de toasts
function initToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

// Función principal para mostrar toasts
export function showToast(message, type = 'success', options = {}) {
  const container = initToastContainer();
  
  const {
    duration = 3000,
    title = getDefaultTitle(type),
    icon = getDefaultIcon(type),
    closable = true
  } = options;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  toast.innerHTML = `
    ${icon ? `<div class="toast-icon">${icon}</div>` : ''}
    <div class="toast-content">
      ${title ? `<div class="toast-title">${title}</div>` : ''}
      <div class="toast-message">${message}</div>
    </div>
    ${closable ? '<button class="toast-close">×</button>' : ''}
    ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
  `;

  container.appendChild(toast);

  // Manejar el botón de cerrar
  if (closable) {
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));
  }

  // Auto-remover después de la duración
  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }

  return toast;
}

// Remover toast con animación
function removeToast(toast) {
  toast.classList.add('toast-exit');
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
    // Limpiar el contenedor si está vacío
    if (toastContainer && toastContainer.children.length === 0) {
      document.body.removeChild(toastContainer);
      toastContainer = null;
    }
  }, 300);
}

// Funciones de conveniencia
export function toast(message, options) {
  return showToast(message, 'success', options);
}

export function toastSuccess(message, options) {
  return showToast(message, 'success', options);
}

export function toastError(message, options) {
  return showToast(message, 'error', options);
}

export function toastInfo(message, options) {
  return showToast(message, 'info', options);
}

export function toastWarning(message, options) {
  return showToast(message, 'warning', options);
}

// Helpers
function getDefaultTitle(type) {
  const titles = {
    success: '✓ Éxito',
    error: '✕ Error',
    info: 'ℹ Información',
    warning: '⚠ Advertencia'
  };
  return titles[type] || '';
}

function getDefaultIcon(type) {
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };
  return icons[type] || '';
}