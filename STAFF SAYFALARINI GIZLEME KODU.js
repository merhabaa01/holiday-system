function createStaffSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = ss.getSheetByName('STAFF_LIST');
  const template = ss.getSheetByName('SABLON');
  const dashboard = ss.getSheetByName('DASHBOARD'); // ⭐ önemli

  if (!staffSheet || !template) {
    throw new Error('STAFF_LIST or SABLON not found.');
  }

  const lastRow = staffSheet.getLastRow();
  if (lastRow < 3) return;

  const data = staffSheet.getRange(3, 1, lastRow - 2, 5).getValues();

  data.forEach(row => {
    const staffId = row[0];
    const name    = row[1];
    const dept    = row[2];
    const holiday = row[3];
    const sick    = row[4];

    if (!staffId) return;

    const sheetName = String(staffId);

    // Already exists → skip
    if (ss.getSheetByName(sheetName)) return;

    // Create page
    const newSheet = template.copyTo(ss);
    newSheet.setName(sheetName);

    // Fill header
    newSheet.getRange('B1').setValue(name + ' - ' + dept);
    newSheet.getRange('F1').setValue(staffId);
    newSheet.getRange('C3').setValue(holiday);
    newSheet.getRange('D3').setValue(sick);

    // ⭐⭐ IMPORTANT: Move user away before hiding sheet ⭐⭐
    dashboard.activate();  // başka sayfaya geç
    SpreadsheetApp.flush(); // işlemleri tamamlat

    // ⭐⭐ Now we can safely hide the new sheet ⭐⭐
    newSheet.hideSheet();
  });
}
