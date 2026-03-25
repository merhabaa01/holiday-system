

const ADMIN_PASSWORD = "1234"; // ŞİFREYİ BURADAN DEĞİŞTİREBİLİRSİNİZ



/*********** 1) CREATE STAFF SHEETS (CREATE BUTTON) ***********/


function createStaffSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = ss.getSheetByName('STAFF_LIST');
  const template   = ss.getSheetByName('SABLON');

  if (!staffSheet || !template) {
    throw new Error('STAFF_LIST or SABLON sheet not found.');
  }

  const lastRow = staffSheet.getLastRow();
  if (lastRow < 3) {
    Logger.log('No staff data found.');
    return;
  }

  // ✅ A:F → ID | NAME | DEPT | ANNUAL | SICK | TOTAL
  const data = staffSheet.getRange(3, 1, lastRow - 2, 6).getDisplayValues();

  Logger.log('=== STAFF_LIST RAW DATA ===');
  Logger.log(data);

  data.forEach((row, index) => {
    const staffId = row[0];               // A
    const name    = row[1];               // B
    const dept    = row[2];               // C
    const annual  = Number(row[3]) || 0;  // D
    const sick    = Number(row[4]) || 0;  // E
    const total   = row[5];               // F (okuyoruz ama yazmıyoruz)

    Logger.log(`ROW ${index + 3} → ID:${staffId}, ANNUAL:${annual}, SICK:${sick}, TOTAL:${total}`);

    if (!staffId) return;

    const sheetName = String(staffId).trim();

    if (ss.getSheetByName(sheetName)) {
      Logger.log(`Sheet already exists: ${sheetName}`);
      return;
    }

    const newSheet = template.copyTo(ss);
    newSheet.setName(sheetName);

    newSheet.getRange('B1').setValue(name + ' - ' + dept);
    newSheet.getRange('F1').setValue(sheetName);

    // ✅ SABLON entitlements
    newSheet.getRange('C3').setValue(annual);
    newSheet.getRange('D3').setValue(sick);

    Logger.log(`CREATED → ${sheetName} | C3:${annual}, D3:${sick}`);
  });

  Logger.log('=== createStaffSheets FINISHED ===');
}





/*********** 2) DEPARTMENT LIST FROM LISTS SHEET ***********/
function getDepartments() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('LISTS');
  if (!sheet) throw new Error('LISTS sheet not found.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  // A2:A... → department names
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const result = [];

  values.forEach(r => {
    const d = r[0];
    if (d) result.push(String(d).trim());
  });

  return result;
}


/*********** 3) STAFF BY SELECTED DEPARTMENT FROM STAFF_LIST ***********/
function getStaffByDepartment(dept) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('STAFF_LIST');   // main staff table
  if (!sheet) throw new Error('STAFF_LIST sheet not found.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return [];

  // A3:C...  → ID, NAME, DEPARTMENT (display values)
  const values = sheet.getRange(3, 1, lastRow - 2, 3).getDisplayValues();
  const result = [];
  const targetDept = String(dept).trim().toUpperCase();

  values.forEach(r => {
    const id   = r[0]; // STAFF ID
    const name = r[1]; // NAME
    const d    = r[2]; // DEPARTMENT

    if (!id || !name || !d) return;

    const cellDept = String(d).trim().toUpperCase();

    if (cellDept === targetDept) {
      // add staff of this department to list
      result.push({ id: id, name: name });
    }
  });

  return result;
}

// Find first empty row between 8 and 40 in column A
function getFirstEmptyRow(sh) {
  for (let r = 8; r <= 40; r++) {
    const val = sh.getRange(r, 1).getValue(); // column A (Start Date)
    if (!val) {
      return r; // first empty row
    }
  }
  // if all rows 8–40 are filled, return 41
  return 41;
}

/*********** 4) SAVE LEAVE RECORD (FROM ADD LEAVE POPUP) ***********/
function saveLeave(data) {
  const ss = SpreadsheetApp.getActive();
  const staffId = String(data.staffId);
  const sh = ss.getSheetByName(staffId);
  if (!sh) throw new Error('Employee sheet not found: ' + staffId);

  // --- FIND FIRST EMPTY ROW BETWEEN 8 AND 40 ---
  const row = getFirstEmptyRow(sh);

  const annual = data.type === 'ANNUAL' ? data.days : '';
  const sick   = data.type === 'SICK'   ? data.days : '';
  const fileNo = data.fileNo || '';

  const startDate = data.startDate ? new Date(data.startDate) : '';
  const endDate   = data.endDate   ? new Date(data.endDate)   : '';

  // A-G fields
  sh.getRange(row, 1).setValue(startDate);
  sh.getRange(row, 2).setValue(data.reason || '');
  sh.getRange(row, 3).setValue(data.approvedBy || '');
  sh.getRange(row, 4).setValue(sick);
  sh.getRange(row, 5).setValue(annual);
  sh.getRange(row, 6).setValue(fileNo);
  sh.getRange(row, 7).setValue(endDate);

  return 'Leave record added: ' + data.staffName;
}



/*********** 5) OPEN ADD LEAVE DIALOG (ADD BUTTON) ***********/
function openAddLeaveDialog() {
  const template = HtmlService.createTemplateFromFile('AddLeave');
  template.departments = getDepartments(); // departments from LISTS
  const html = template.evaluate()
    .setWidth(420)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, 'Add Leave');
}


/*********** 6) OPEN GO TO STAFF DIALOG (GO BUTTON) ***********/
function openGoDialog() {
  const template = HtmlService.createTemplateFromFile('GoToStaff');
  template.departments = getDepartments(); // departments from LISTS
  const html = template.evaluate()
    .setWidth(350)
    .setHeight(340);
  SpreadsheetApp.getUi().showModalDialog(html, 'Go to Employee Page');
}


/*********** 7) GO TO SELECTED STAFF SHEET ***********/
function goToStaffSheet(staffId) {
  const ss = SpreadsheetApp.getActive();
  const sheetName = String(staffId);
  const sh = ss.getSheetByName(sheetName);
  if (!sh) {
    throw new Error('No sheet found for this ID: ' + sheetName);
  }

  ss.setActiveSheet(sh);
  sh.activate();
  ss.setActiveRange(sh.getRange('A1'));
}


/*********** 8) OPEN DELETE STAFF DIALOG (DELETE BUTTON) ***********/
function openDeleteStaffDialog() {
  const template = HtmlService.createTemplateFromFile('DeleteStaff');
  template.departments = getDepartments(); // department list from LISTS
  const html = template.evaluate()
    .setWidth(350)
    .setHeight(250);
  SpreadsheetApp.getUi().showModalDialog(html, 'Delete Employee Page');
}


/*********** 9) DELETE SELECTED STAFF SHEET BY ID ***********/
function deleteStaffSheetById(staffId) {
  const ss = SpreadsheetApp.getActive();
  const sheetName = String(staffId);

  // Safety: do not allow deleting system sheets
  const protectedSheets = ['STAFF_LIST', 'LISTS', 'SABLON'];
  if (protectedSheets.includes(sheetName)) {
    throw new Error('This sheet cannot be deleted: ' + sheetName);
  }

  const sh = ss.getSheetByName(sheetName);
  if (!sh) {
    throw new Error('No sheet found for this ID: ' + sheetName);
  }

  ss.deleteSheet(sh);
  return 'Sheet deleted: ' + sheetName;
}
  
/*********** STAFF EKLEME ***********/  
function openAddStaffDialog() {
  const html = HtmlService.createHtmlOutputFromFile("AddStaff")
    .setWidth(400)
    .setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, "ADD STAFF");
}
function addNewStaff(data) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("STAFF_LIST");
  if (!sh) throw new Error("STAFF_LIST sheet not found.");

  const lastRow = sh.getLastRow() + 1;

  // A:F → ID | NAME | DEPT | ANNUAL | SICK | TOTAL
  sh.getRange(lastRow, 1).setValue(String(data.staffId).trim().toUpperCase());
  sh.getRange(lastRow, 2).setValue(String(data.name).trim().toUpperCase());
  sh.getRange(lastRow, 3).setValue(String(data.department).trim());
  sh.getRange(lastRow, 4).setValue(Number(data.annual) || 0);
  sh.getRange(lastRow, 5).setValue(Number(data.sick) || 0);

  // ✅ TOTAL (F) = D + E
  sh.getRange(lastRow, 6).setFormula(`=D${lastRow}+E${lastRow}`);

  return "STAFF ADDED SUCCESSFULLY";
}





/*********** 11) OPEN DELETE ALL DIALOG (NEW BUTTON) ***********/
function openDeleteAllDialog() {
  const html = HtmlService.createHtmlOutputFromFile('DeleteAllStaff')
    .setWidth(300)
    .setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(html, '⚠️ Delete All Staff Sheets');
}

/*********** 12) DELETE ALL STAFF SHEETS (ROBUST VERSION) ***********/
function deleteAllStaffSheets(password) {
  // 1. Password Check
  if (password !== ADMIN_PASSWORD) {
    throw new Error("Incorrect Password! Access denied.");
  }

  const ss = SpreadsheetApp.getActive();
  const staffSheet = ss.getSheetByName('STAFF_LIST');

  if (!staffSheet) {
    throw new Error('STAFF_LIST sheet not found.');
  }

  // Hata önleme: Aktif sayfayı STAFF_LIST yap
  ss.setActiveSheet(staffSheet);

  // 2. Dosyada mevcut olan TÜM sayfa isimlerini al
  const allSheets = ss.getSheets();
  const actualSheetNames = allSheets.map(s => s.getName());
  
  const lastRow = staffSheet.getLastRow();
  if (lastRow < 3) return "No staff found to delete.";

  // ID'leri al
  const data = staffSheet.getRange(3, 1, lastRow - 2, 1).getValues();
  
  const protectedSheets = ['STAFF_LIST', 'LISTS', 'SABLON']; 
  let deletedCount = 0;
  let notFoundCount = 0;
  let errorLog = [];

  data.forEach(row => {
    let rawId = row[0];
    if (!rawId) return;

    // --- DÜZELTME BURADA BAŞLIYOR ---
    // ID formatını normalleştir: "101.0" -> "101" , 101 -> "101", " 101 " -> "101"
    let cleanId = String(rawId).trim();
    
    // Eğer sayısal bir değerse (örn: 101.0) onu tam sayıya çevirip tekrar string yapıyoruz
    if (!isNaN(cleanId) && cleanId !== '') {
      cleanId = String(Number(cleanId)); 
    }

    // Sistem sayfalarını kontrol et
    if (protectedSheets.includes(cleanId)) return;

    try {
      // Dosyada gerçekten bu isimde bir sayfa var mı bakıyoruz (Kurşun geçirmez kontrol)
      const index = actualSheetNames.indexOf(cleanId);
      
      if (index !== -1) {
        // Sayfa bulundu, siliyoruz
        const sheetToDelete = allSheets[index];
        ss.deleteSheet(sheetToDelete); 
        deletedCount++;
      } else {
        // ID listede var ama sayfa yok (Belki manuel silinmiş)
        notFoundCount++;
      }
    } catch (e) {
      errorLog.push("Hata: " + cleanId + " silinemedi (" + e.message + ")");
    }
  });

  let resultMessage = "İşlem Tamamlandı!\n\n✅ Silinen: " + deletedCount + "\n❌ Bulunamayan: " + notFoundCount;
  
  if (errorLog.length > 0) {
    resultMessage += "\n\n⚠️ Hatalar:\n" + errorLog.join("\n");
  }
  
  return resultMessage;
}




