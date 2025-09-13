function initializeGiftWrap() {
  // Find gift wrap container and core elements
  const giftWrap = document.querySelector('[data-gift-wrap]');
  if (!giftWrap) return;

  const checkbox = giftWrap.querySelector('[data-gift-wrap-toggle]');
  const fields = document.getElementById('gift-wrap-fields');
  const error = document.getElementById('gift-wrap-error');
  const variantIdInput = giftWrap.querySelector('[data-gift-wrap-variant-id]');
  const form = checkbox?.closest('form');

  if (!checkbox || !fields || !error || !variantIdInput || !form) return;

  let isAddingGiftWrap = false; // Prevent duplicate submissions

  // Toggle gift wrap fields visibility
  function setExpanded(expanded) {
    checkbox.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    fields.style.display = expanded ? 'block' : 'none';
    
    if (!expanded) {
      // Clear values when unchecked
      fields.querySelectorAll('input[type="text"], textarea').forEach(input => {
        input.value = '';
      });
      hideError();
    }
  }

  // Error handling
  function showError(message) {
    error.textContent = message || "Please check gift wrap details and try again.";
    error.style.display = 'block';
  }

  function hideError() {
    error.textContent = '';
    error.style.display = 'none';
  }

  // Add both main product and gift wrap to cart together
  async function addProductsToCart() {
    const giftVariantId = variantIdInput.value;
    if (!giftVariantId) {
      showError('Gift wrap product not configured. Please contact the store.');
      return false;
    }

    const to = fields.querySelector('[data-gift-wrap-to]')?.value?.trim();
    if (!to) {
      showError("Please enter recipient's name");
      fields.querySelector('[data-gift-wrap-to]')?.focus();
      return false;
    }

    try {
      // Get main product variant ID from the form
      const mainVariantId = form.querySelector('input[name="id"]')?.value;
      if (!mainVariantId) {
        showError('Main product variant not found. Please refresh the page.');
        return false;
      }

      // Get quantity from the form
      const quantity = form.querySelector('input[name="quantity"]')?.value || 1;

      const giftProperties = {
        '_GiftWrap': 'Yes',
        '_MainProductHandle': form.dataset.productHandle,
        'To': to,
        'From': fields.querySelector('[data-gift-wrap-from]')?.value?.trim() || '',
        'Message': fields.querySelector('[data-gift-wrap-message]')?.value?.trim() || ''
      };

      const items = [
        {
          id: parseInt(mainVariantId, 10),
          quantity: parseInt(quantity, 10)
        },
        {
          id: parseInt(giftVariantId, 10),
          quantity: 1,
          properties: giftProperties
        }
      ];

      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ items })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add products to cart');
      }

      const result = await response.json();
      console.log('Products added to cart:', result);
      
      // Redirect to cart or show success message
      if (result.status === 303) {
        window.location.href = '/cart';
      } else {
        // Trigger cart update event for cart drawer/notification
        document.dispatchEvent(new CustomEvent('cart:updated'));
      }
      
      return true;
    } catch (err) {
      console.error('Cart error:', err);
      showError('Could not add products to cart. Please try again.');
      return false;
    }
  }

  // Event: Gift wrap checkbox toggle
  checkbox.addEventListener('change', function() {
    setExpanded(this.checked);
  });

  // Event: Form submission - handle gift wrap and main product together
  form.addEventListener('submit', async function(e) {
    if (!checkbox.checked) return; // No gift wrap selected, let form submit normally
    if (isAddingGiftWrap) return; // Prevent duplicate submissions

    try {
      e.preventDefault(); // Stop form submission
      isAddingGiftWrap = true;
      hideError();

      // Add both products together
      const success = await addProductsToCart();
      if (!success) {
        // If failed, allow user to retry
        isAddingGiftWrap = false;
      }
    } catch (err) {
      console.error('Form submission error:', err);
      isAddingGiftWrap = false;
    }
  });

  // Initialize
  setExpanded(checkbox.checked);
}

document.addEventListener('DOMContentLoaded', initializeGiftWrap);
document.addEventListener('shopify:section:load', initializeGiftWrap);
