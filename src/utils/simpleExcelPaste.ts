// Simple, bulletproof Excel paste handler
export const simpleExcelPaste = {
  // Check if content contains table HTML
  hasTable(html: string): boolean {
    return html.includes('<table') && html.includes('</table>');
  },

  // Convert table HTML to a simple, clean format
  cleanTableHTML(html: string): string {
    // Extract just the table element
    const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/i);
    if (!tableMatch) return '';
    
    let tableHTML = tableMatch[0];
    
    // Clean up common Excel cruft but preserve structure
    tableHTML = tableHTML
      // Remove Excel-specific attributes but keep basic ones
      .replace(/\s+xmlns:[^\s>]+/g, '')
      .replace(/\s+x:[^\s>]+/g, '')
      .replace(/\s+o:[^\s>]+/g, '')
      .replace(/\s+class="[^"]*mso[^"]*"/g, '')
      .replace(/\s+style="[^"]*mso[^"]*"/g, '')
      // Remove empty spans and font tags but keep content
      .replace(/<span[^>]*>(\s*)<\/span>/gi, '$1')
      .replace(/<font[^>]*>(.*?)<\/font>/gi, '$1')
      // Clean up excessive whitespace
      .replace(/\s+/g, ' ')
      // Ensure proper table structure
      .replace(/<tr[^>]*>/gi, '<tr>')
      .replace(/<td[^>]*>/gi, '<td>')
      .replace(/<th[^>]*>/gi, '<th>');
    
    return tableHTML;
  },

  // Create a properly styled table
  createStyledTable(tableHTML: string): string {
    return `
      <div class="excel-table-wrapper" style="margin: 10px 0;">
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">
          ${tableHTML.replace(/<table[^>]*>/i, '').replace(/<\/table>/i, '')}
        </table>
      </div>
    `;
  },

  // Main paste function - simple and reliable
  handlePaste(event: ClipboardEvent, quill: any): boolean {
    console.log('🚀 SIMPLE EXCEL PASTE STARTED');
    
    try {
      const clipboardData = event.clipboardData;
      if (!clipboardData) {
        console.log('❌ No clipboard data');
        return false;
      }

      // Get HTML content
      let html = clipboardData.getData('text/html');
      if (!html) {
        console.log('❌ No HTML content');
        return false;
      }

      console.log('📋 Raw HTML received:', html.substring(0, 300));

      // Check if it has a table
      if (!this.hasTable(html)) {
        console.log('❌ No table found in HTML');
        return false;
      }

      console.log('✅ Table detected!');

      // Clean the table HTML
      const cleanTable = this.cleanTableHTML(html);
      if (!cleanTable) {
        console.log('❌ Failed to clean table');
        return false;
      }

      console.log('✅ Table cleaned');

      // Create styled table
      const styledTable = this.createStyledTable(cleanTable);
      console.log('✅ Table styled');

      // Get current selection
      const selection = quill.getSelection();
      if (!selection) {
        console.log('❌ No selection');
        return false;
      }

      console.log('✅ Selection obtained:', selection);

      // Prevent default paste
      event.preventDefault();
      console.log('🛑 Default paste prevented');

      // Insert the table - use the most basic method
      console.log('📝 Inserting table...');
      
      // Method 1: Try clipboard.dangerouslyPasteHTML
      if (quill.clipboard && quill.clipboard.dangerouslyPasteHTML) {
        quill.clipboard.dangerouslyPasteHTML(selection.index, styledTable);
        console.log('✅ Table inserted using dangerouslyPasteHTML');
      } else {
        console.log('❌ dangerouslyPasteHTML not available');
        return false;
      }

      // Move cursor after table
      setTimeout(() => {
        try {
          const newSelection = quill.getSelection();
          if (newSelection) {
            quill.setSelection(newSelection.index + 1);
            console.log('✅ Cursor moved');
          }
        } catch (e) {
          console.log('⚠️ Could not move cursor:', e);
        }
      }, 100);

      return true;
      
    } catch (error) {
      console.log('❌ Paste failed:', error);
      return false;
    }
  }
};

// Alternative: Insert as plain text with table formatting
export const insertTableAsText = (tableData: string[][], quill: any) => {
  const selection = quill.getSelection();
  if (!selection) return false;

  try {
    // Convert table to plain text with formatting
    let text = '\n';
    tableData.forEach((row, rowIndex) => {
      const rowText = row.map(cell => (cell || '').padEnd(15)).join(' | ');
      text += rowText + '\n';
      if (rowIndex === 0) {
        text += '-'.repeat(rowText.length) + '\n'; // separator
      }
    });
    text += '\n';

    quill.insertText(selection.index, text);
    return true;
  } catch (error) {
    console.log('Text insertion failed:', error);
    return false;
  }
};