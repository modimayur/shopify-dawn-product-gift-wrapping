/**
 * Gift Wrap Inline Editor for Cart
 * Handles updating gift wrap properties via AJAX
 */
class GiftWrapInlineEditor {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
    document.addEventListener('shopify:section:load', () => {
      this.bindEvents();
    });
    document.addEventListener('shopify:section:unload', () => {
      this.unbindEvents();
    });
  }

  bindEvents() {
    // Use event delegation on cart drawer and cart sections only
    const cartDrawer = document.querySelector('cart-drawer');
    if (cartDrawer) {
      cartDrawer.addEventListener('click', this.handleCartDrawerClick.bind(this));
      cartDrawer.addEventListener('change', this.handleCartDrawerChange.bind(this));
    }
    const cartSection = document.querySelector('.cart__contents, cart-items');
    if (cartSection) {
      cartSection.addEventListener('click', this.handleCartSectionClick.bind(this));
      cartSection.addEventListener('change', this.handleCartSectionChange.bind(this));
    }
  }

  unbindEvents() {
    // No-op for now, could remove listeners if needed
  }

  handleCartDrawerClick(e) {
    // Use closest to support clicks on child elements (label-edit, label-cancel, svg, span)
    const toggleButton = e.target.closest('.cart-drawer__gift-wrap-toggle');
    if (toggleButton) {
      e.preventDefault();
      this.toggleCartDrawerEditor(toggleButton);
      return;
    }
    if (e.target.classList.contains('cart-drawer__gift-wrap-update')) {
      e.preventDefault();
      this.updateCartDrawerGiftWrap(e.target);
    }
  }

  handleCartDrawerChange(e) {
    if (e.target.classList.contains('cart-drawer__gift-wrap-toggle')) {
      const itemKey = e.target.dataset.giftWrapToggleInline;
      if (!e.target.checked) {
        this.removeGiftWrap(itemKey);
      }
    }
  }

  handleCartSectionClick(e) {
    if (e.target.matches('[data-gift-wrap-update]')) {
      e.preventDefault();
      console.log('hey');
      const itemKey = e.target.dataset.giftWrapUpdate;
      this.updateGiftWrap(itemKey, e.target);
    }
    if (e.target.matches('[data-gift-wrap-cancel]')) {
      e.preventDefault();
      const itemKey = e.target.dataset.giftWrapCancel;
      this.cancelGiftWrap(itemKey);
    }
  }

  handleCartSectionChange(e) {
    if (e.target.matches('[data-gift-wrap-toggle-inline]')) {
      const itemKey = e.target.dataset.giftWrapToggleInline;
      if (!e.target.checked) {
        this.removeGiftWrap(itemKey);
      }
    }
  }

  async updateGiftWrap(itemKey, updateButton) {
    try {
      // Get all gift wrap fields for this item
      const fields = this.getGiftWrapFields(itemKey);
      
      // Validate required fields
      if (!fields.to.trim()) {
        this.showFieldError(itemKey, 'to', 'Recipient name is required');
        return;
      }

      // Set loading state
      this.setLoadingState(updateButton, true);
      this.clearErrors(itemKey);

      // Prepare the update data
      const properties = {
        '_GiftWrap': 'Yes',
        'To': fields.to,
        'From': fields.from,
        'Message': fields.message
      };

      // Update via Cart API
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: itemKey,
          properties: properties
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update gift wrap');
      }

      const result = await response.json();
      
      // Show success feedback
      this.showSuccess(updateButton);
      
      // Optionally refresh cart UI
      this.refreshCartUI();

    } catch (error) {
      console.error('Gift wrap update error:', error);
      this.showError(itemKey, 'Failed to update gift wrap. Please try again.');
    } finally {
      this.setLoadingState(updateButton, false);
    }
  }

  async removeGiftWrap(itemKey) {
    try {
      // Remove gift wrap by setting quantity to 0
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: itemKey,
          quantity: 0
        })
      });

      if (!response.ok) {
        throw new Error('Failed to remove gift wrap');
      }

      // Refresh cart to reflect changes
      this.refreshCartUI();

    } catch (error) {
      console.error('Gift wrap removal error:', error);
      // Revert checkbox state
      const checkbox = document.querySelector(`[data-gift-wrap-toggle-inline="${itemKey}"]`);
      if (checkbox) checkbox.checked = true;
    }
  }

  async cancelGiftWrap(itemKey) {
    await this.removeGiftWrap(itemKey);
  }

  getGiftWrapFields(itemKey) {
    const toField = document.querySelector(`[data-gift-wrap-field="to"][data-item-key="${itemKey}"]`);
    const fromField = document.querySelector(`[data-gift-wrap-field="from"][data-item-key="${itemKey}"]`);
    const messageField = document.querySelector(`[data-gift-wrap-field="message"][data-item-key="${itemKey}"]`);

    return {
      to: toField ? toField.value.trim() : '',
      from: fromField ? fromField.value.trim() : '',
      message: messageField ? messageField.value.trim() : ''
    };
  }

  setLoadingState(button, loading) {
    if (loading) {
      button.disabled = true;
      button.classList.add('loading');
      button.dataset.originalText = button.textContent;
      button.textContent = 'Updating...';
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      button.textContent = button.dataset.originalText || 'Update';
    }
  }

  showSuccess(button) {
    const originalText = button.dataset.originalText || 'Update';
    button.textContent = 'Updated!';
    button.style.background = 'rgb(var(--color-success, 40, 167, 69))';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
    }, 2000);
  }

  showError(itemKey, message) {
    // Create or show error message
    let errorEl = document.querySelector(`[data-gift-wrap-editor-row="${itemKey}"] .gift-wrap-inline-editor__error`);
    
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'gift-wrap-inline-editor__error';
      const actionsDiv = document.querySelector(`[data-gift-wrap-editor-row="${itemKey}"] .gift-wrap-inline-editor__actions`);
      if (actionsDiv) {
        actionsDiv.appendChild(errorEl);
      }
    }
    
    errorEl.textContent = message;
    errorEl.classList.add('show');
    
    setTimeout(() => {
      errorEl.classList.remove('show');
    }, 5000);
  }

  showFieldError(itemKey, fieldName, message) {
    const field = document.querySelector(`[data-gift-wrap-field="${fieldName}"][data-item-key="${itemKey}"]`);
    if (field) {
      field.classList.add('error');
      field.focus();
      
      // Remove error class after user starts typing
      field.addEventListener('input', () => {
        field.classList.remove('error');
      }, { once: true });
    }
    
    this.showError(itemKey, message);
  }

  clearErrors(itemKey) {
    const editorRow = document.querySelector(`[data-gift-wrap-editor-row="${itemKey}"]`);
    if (editorRow) {
      const fields = editorRow.querySelectorAll('.error');
      fields.forEach(field => field.classList.remove('error'));
      
      const errorEl = editorRow.querySelector('.gift-wrap-inline-editor__error');
      if (errorEl) {
        errorEl.classList.remove('show');
      }
    }
  }

  refreshCartUI() {
    // If using AJAX cart, trigger refresh
    if (window.CartAPI && typeof window.CartAPI.getCart === 'function') {
      window.CartAPI.getCart();
    } else {
      // Fallback: reload the page
      window.location.reload();
    }
  }

  // Cart Drawer Methods
  toggleCartDrawerEditor(toggleButton) {
    const giftWrapContainer = toggleButton.closest('.cart-drawer__gift-wrap');
    if (!giftWrapContainer) return;
    const display = giftWrapContainer.querySelector('.cart-drawer__gift-wrap-display');
    const editor = giftWrapContainer.querySelector('.cart-drawer__gift-wrap-editor');
    const labelEdit = toggleButton.querySelector('.label-edit');
    const labelCancel = toggleButton.querySelector('.label-cancel');
    const expanded = toggleButton.getAttribute('aria-expanded') === 'true';
    if (!expanded) {
    //   if (display) display.style.display = 'none';
      if (editor) editor.style.display = 'block';
      if (labelEdit) labelEdit.style.display = 'none';
      if (labelCancel) labelCancel.style.display = 'flex';
      toggleButton.setAttribute('aria-expanded', 'true');
    } else {
    //   if (display) display.style.display = 'block';
      if (editor) editor.style.display = 'none';
      if (labelEdit) labelEdit.style.display = 'flex';
      if (labelCancel) labelCancel.style.display = 'none';
      toggleButton.setAttribute('aria-expanded', 'false');
    }
  }
  showCartDrawerEditor(editButton) {
    const giftWrapContainer = editButton.closest('.cart-drawer__gift-wrap');
    if (!giftWrapContainer) return;
    const display = giftWrapContainer.querySelector('.cart-drawer__gift-wrap-display');
    const editor = giftWrapContainer.querySelector('.cart-drawer__gift-wrap-editor');
    if (display && editor) {
      display.style.display = 'none';
      editor.style.display = 'block';
    }
  }

  hideCartDrawerEditor(cancelButton) {
    const giftWrapContainer = cancelButton.closest('.cart-drawer__gift-wrap');
    if (!giftWrapContainer) return;
    const display = giftWrapContainer.querySelector('.cart-drawer__gift-wrap-display');
    const editor = giftWrapContainer.querySelector('.cart-drawer__gift-wrap-editor');
    if (display && editor) {
      editor.style.display = 'none';
      display.style.display = 'block';
    }
  }

  async updateCartDrawerGiftWrap(updateButton) {
    const giftWrapContainer = updateButton.closest('.cart-drawer__gift-wrap');
    if (!giftWrapContainer) return;
    
    const itemKey = giftWrapContainer.dataset.giftWrapDrawer;
    if (!itemKey) return;
    
    try {
      // Get field values from cart drawer form
      const toField = giftWrapContainer.querySelector('input[name="gift_wrap_to"]');
      const fromField = giftWrapContainer.querySelector('input[name="gift_wrap_from"]');
      const messageField = giftWrapContainer.querySelector('textarea[name="gift_wrap_message"]');
      
      const fields = {
        to: toField ? toField.value.trim() : '',
        from: fromField ? fromField.value.trim() : '',
        message: messageField ? messageField.value.trim() : ''
      };
      
      // Validate required fields
      if (!fields.to) {
        this.showCartDrawerError(giftWrapContainer, 'Recipient name is required');
        if (toField) toField.focus();
        return;
      }

      // Set loading state
      this.setLoadingState(updateButton, true);
      this.clearCartDrawerErrors(giftWrapContainer);

      // Prepare the update data
      const properties = {
        '_GiftWrap': 'Yes',
        'To': fields.to,
        'From': fields.from,
        'Message': fields.message
      };

      // Update via Cart API
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: itemKey,
          properties: properties
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update gift wrap');
      }

      // Update display values
      this.updateCartDrawerDisplay(giftWrapContainer, fields);
      
      // Hide editor and reset toggle button/labels
      const giftWrapContainer = updateButton.closest('.cart-drawer__gift-wrap');
      const toggleButton = giftWrapContainer.querySelector('.cart-drawer__gift-wrap-toggle');
      const editor = giftWrapContainer.querySelector('.cart-drawer__gift-wrap-editor');
      const labelEdit = toggleButton?.querySelector('.label-edit');
      const labelCancle = toggleButton?.querySelector('.label-cancel');
      if (editor && toggleButton) {
        editor.style.display = 'none';
        if (labelEdit) labelEdit.style.display = 'flex';
        if (labelCancle) labelCancle.style.display = 'none';
        toggleButton.setAttribute('aria-expanded', 'false');
      }
      // Show success feedback
      this.showSuccess(updateButton);
      
      // Refresh cart drawer if possible
      const cartDrawer = document.querySelector('cart-drawer');
      if (cartDrawer && cartDrawer.renderContents) {
        cartDrawer.renderContents();
      }

    } catch (error) {
      console.error('Cart drawer gift wrap update error:', error);
      this.showCartDrawerError(giftWrapContainer, 'Failed to update gift wrap. Please try again.');
    } finally {
      this.setLoadingState(updateButton, false);
    }
  }

  updateCartDrawerDisplay(giftWrapContainer, fields) {
    const display = giftWrapContainer.querySelector('.cart-drawer__gift-wrap-display');
    if (!display) return;
    
    const toSpan = display.querySelector('.gift-wrap-to');
    const fromSpan = display.querySelector('.gift-wrap-from');
    const messageSpan = display.querySelector('.gift-wrap-message');
    
    if (toSpan) toSpan.textContent = fields.to;
    if (fromSpan) fromSpan.textContent = fields.from;
    if (messageSpan) messageSpan.textContent = fields.message;
  }

  showCartDrawerError(giftWrapContainer, message) {
    let errorEl = giftWrapContainer.querySelector('.cart-drawer__gift-wrap-error');
    
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'cart-drawer__gift-wrap-error';
      const actionsDiv = giftWrapContainer.querySelector('.cart-drawer__gift-wrap-actions');
      if (actionsDiv) {
        actionsDiv.appendChild(errorEl);
      }
    }
    
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }

  clearCartDrawerErrors(giftWrapContainer) {
    const errorEl = giftWrapContainer.querySelector('.cart-drawer__gift-wrap-error');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }
}

// Initialize the gift wrap inline editor
new GiftWrapInlineEditor();