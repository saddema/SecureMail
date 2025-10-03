// Direct, no-frills Excel paste handler - just insert the HTML
export const directExcelPaste = {
  // Ultra-simple paste function
  handlePaste(event: ClipboardEvent, quill: any): boolean {
    console.log('🚀 DIRECT EXCEL PASTE - ULTRA SIMPLE');
    
    try {
      // Get clipboard data
      const clipboardData = event.clipboardData;
      if (!clipboardData) {
        console.log('❌ No clipboard data');
        return false;
      }

      // Get HTML content
      const html = clipboardData.getData('text/html');
      if (!html) {
        console.log('❌ No HTML content');
        return false;
      }

      console.log('📋 HTML received (first 500 chars):', html.substring(0, 500));

      // Check if it has a table
      if (!html.includes('<table')) {
        console.log('❌ No table found');
        return false;
      }

      console.log('✅ Table detected!');

      // Get current selection
      const selection = quill.getSelection();
      if (!selection) {
        console.log('❌ No selection');
        return false;
      }

      console.log('✅ Selection:', selection);

      // Prevent default paste
      event.preventDefault();
      console.log('🛑 Default paste prevented');

      // Create a simple, clean table HTML
      const cleanTable = html
        .replace(/\s+xmlns:[^\s>]+/g, '')
        .replace(/\s+x:[^\s>]+/g, '')
        .replace(/\s+o:[^\s>]+/g, '')
        .replace(/\s+class="[^"]*mso[^"]*"/g, '')
        .replace(/\s+style="[^"]*mso[^"]*"/g, '');

      console.log('📝 Attempting direct HTML insertion...');

      // Method 1: Try the most direct approach first
      try {
        quill.clipboard.dangerouslyPasteHTML(selection.index, cleanTable);
        console.log('✅ SUCCESS: Direct HTML insertion worked!');
        return true;
      } catch (method1Error) {
        console.log('⚠️ Method 1 failed:', method1Error);
      }

      // Method 2: Try inserting as Delta
      try {
        const delta = quill.clipboard.convert(cleanTable);
        quill.updateContents(delta);
        console.log('✅ SUCCESS: Delta conversion worked!');
        return true;
      } catch (method2Error) {
        console.log('⚠️ Method 2 failed:', method2Error);
      }

      // Method 3: Try raw HTML insertion
      try {
        quill.root.innerHTML = quill.root.innerHTML.slice(0, selection.index) + 
                              cleanTable + 
                              quill.root.innerHTML.slice(selection.index);
        console.log('✅ SUCCESS: Raw HTML insertion worked!');
        return true;
      } catch (method3Error) {
        console.log('⚠️ Method 3 failed:', method3Error);
      }

      // Method 4: Last resort - insert as plain text with table markers
      try {
        const plainText = clipboardData.getData('text/plain');
        if (plainText) {
          quill.insertText(selection.index, plainText);
          console.log('✅ SUCCESS: Plain text fallback worked!');
          return true;
        }
      } catch (method4Error) {
        console.log('⚠️ Method 4 failed:', method4Error);
      }

      console.log('❌ All methods failed');
      return false;
      
    } catch (error) {
      console.log('❌ Direct paste failed:', error);
      return false;
    }
  }
};

// Even simpler approach - just try one method
export const ultraSimplePaste = {
  handlePaste(event: ClipboardEvent, quill: any): boolean {
    console.log('🚀 ULTRA SIMPLE PASTE - ONE SHOT');
    
    try {
      const html = event.clipboardData?.getData('text/html');
      if (!html || !html.includes('<table')) {
        return false;
      }

      const selection = quill.getSelection();
      if (!selection) return false;

      event.preventDefault();
      
      // Just try to insert the HTML directly
      quill.clipboard.dangerouslyPasteHTML(selection.index, html);
      console.log('✅ ULTRA SIMPLE SUCCESS!');
      return true;
      
    } catch (error) {
      console.log('❌ Ultra simple failed:', error);
      return false;
    }
  }
};