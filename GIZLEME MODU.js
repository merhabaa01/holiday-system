function onOpen() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName("DASHBOARD");
  if (!sh) return;

  // Sütunları gizle (F'den Z'ye)
  sh.hideColumns(6, sh.getMaxColumns() - 5);

  // Satırları gizle (33'ten aşağı)
  sh.hideRows(33, sh.getMaxRows() - 32);
}
