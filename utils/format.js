// Shared formatting utilities for Brothers Farm
// Used by both frontend and backend

/**
 * Format number to Indonesian Rupiah currency string
 * @param {number} n - The number to format
 * @returns {string} Formatted string like "Rp 1.000.000"
 */
function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

/**
 * Parse a formatted Rupiah string back to a number
 * @param {string} str - Formatted string like "Rp 1.000.000" or "1.000.000"
 * @returns {number} Parsed number
 */
function parseRupiah(str) {
  if (!str) return 0;
  const raw = String(str).replace(/[^0-9]/g, '');
  return raw ? Number(raw) : 0;
}

/**
 * Format number with thousand separators (no currency prefix)
 * @param {number} n - The number to format
 * @returns {string} Formatted string like "1.000.000"
 */
function formatNumber(n) {
  return Number(n || 0).toLocaleString('id-ID');
}

module.exports = {
  formatRupiah,
  parseRupiah,
  formatNumber
};
