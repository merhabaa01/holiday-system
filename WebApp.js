const WEBAPP_PASSWORD = "Open1234";  // ✅ web app giriş şifresi

function apiLogin(password) {
  const p = String(password || "").trim();
  if (!p) return { ok:false, message:"Password required." };

  // basit kontrol
  if (p !== WEBAPP_PASSWORD) return { ok:false, message:"Wrong password." };

  // session token üret (6 saat geçerli)
  const token = Utilities.getUuid();
  const props = PropertiesService.getUserProperties();
  props.setProperty("WEBAPP_TOKEN", token);
  props.setProperty("WEBAPP_TOKEN_EXP", String(Date.now() + 6 * 60 * 60 * 1000));

  return { ok:true, token };
}

function apiLogout() {
  const props = PropertiesService.getUserProperties();
  props.deleteProperty("WEBAPP_TOKEN");
  props.deleteProperty("WEBAPP_TOKEN_EXP");
  return { ok:true };
}

function apiCheckAuth(token) {
  const props = PropertiesService.getUserProperties();
  const saved = props.getProperty("WEBAPP_TOKEN");
  const exp = Number(props.getProperty("WEBAPP_TOKEN_EXP") || "0");

  if (!saved || !exp) return { ok:false };
  if (Date.now() > exp) return { ok:false, expired:true };
  if (String(token || "") !== saved) return { ok:false };

  return { ok:true };
}


function doGet(e) {
  const tpl = HtmlService.createTemplateFromFile("Index");
  tpl.appTitle = "Leave Management";
  return tpl.evaluate()
    .setTitle("Leave Management")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** ===== API: STAFF LIST ===== */
function apiGetStaffList() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("STAFF_LIST");
  if (!sh) throw new Error("STAFF_LIST not found");

  const lastRow = sh.getLastRow();
  if (lastRow < 4) return { header: [], rows: [] };

  const header = [
    "Staff ID","Employee Name","Department",
    "Annual","Sick","Total",
    "Remaining Annual","Remaining Sick","Remaining Total"
  ];

  const rows = sh.getRange(4, 1, lastRow - 3, 9).getDisplayValues(); // A4:I
  return { header, rows };
}




function apiAddStaff(data) {
  // reuse your existing function
  return addNewStaff(data);
}

function apiGetDepartments() {
  // reuse your existing getDepartments() from Code.gs (LISTS A2:A)
  return getDepartments();
}

/** “Go to employee sheet” as URL (Web App’te activate olmaz) */
function apiGetEmployeeSheetUrl(staffId) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(String(staffId).trim());
  if (!sh) throw new Error("Employee sheet not found: " + staffId);

  if (sh.isSheetHidden()) sh.showSheet();

  return ss.getUrl() + "#gid=" + sh.getSheetId();
}

/** ===== API: LEAVE ===== */
function apiSaveLeave(data) {
  // reuse your existing saveLeave(data)
  return saveLeave(data);
}

/** ===== API: REPORTS (Web App) ===== */
function apiGetAllStaffReport() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("STAFF_LIST");
  if (!sh) throw new Error("STAFF_LIST not found");

  const lastRow = sh.getLastRow();
  const data = (lastRow < 3) ? [] : sh.getRange(3, 1, lastRow - 2, 9).getValues();
  const sorted = data.sort((a, b) => String(a[1] || "").localeCompare(String(b[1] || "")));

  return {
    title: "All Staff Report",
    generatedAt: new Date().toISOString(),
    header: [
      "Employee ID","Employee Name","Department",
      "Annual Leave Entitled","Sick Leave Entitled",
      "Annual Leave Used","Sick Leave Used",
      "Remaining Annual Leave","Remaining Sick Leave"
    ],
    data: sorted
  };
}

function apiGetDepartmentReport(dept) {
  const r = apiGetAllStaffReport();
  r.title = "Department Report: " + dept;
  r.data = r.data.filter(row => String(row[2]) === String(dept));
  return r;
}

function apiGetIndividualReport(staffId) {
  const ss = SpreadsheetApp.getActive();
  const id = String(staffId).trim();

  const sh = ss.getSheetByName(id);
  if (!sh) throw new Error("Staff sheet not found: " + id);

  // --- Sheet header values ---
  const header = {
    nameDept: sh.getRange("B1").getDisplayValue(),
    annual: sh.getRange("C3").getDisplayValue(), // Holiday/Annual (senin sheet'te böyle)
    sick: sh.getRange("D3").getDisplayValue(),
    remainE3: sh.getRange("E3").getDisplayValue() // ✅ Remind Days (Total Remaining)
  };

  // --- STAFF_LIST'ten Remaining Total (I sütunu) çek (backup) ---
  // STAFF_LIST: A=ID ... I=Remaining Total
  let remainI = "";
  try {
    const staff = ss.getSheetByName("STAFF_LIST");
    if (staff) {
      const lastRow = staff.getLastRow();
      if (lastRow >= 4) {
        const values = staff.getRange(4, 1, lastRow - 3, 9).getDisplayValues(); // A4:I
        const row = values.find(r => String(r[0]).trim() === id);
        if (row) remainI = row[8]; // I
      }
    }
  } catch (e) {
    // sessiz geç
  }

  // ✅ Remaining Total: önce E3, boşsa I sütunu
  const remainingTotal = String(header.remainE3 || "").trim() !== "" ? header.remainE3 : remainI;

  // ✅ 8–40 arası (33 satır) leave kayıtları
  const data = sh.getRange(8, 1, 33, 7).getDisplayValues();
  const cleaned = data.filter(row => row.some(cell => String(cell).trim() !== ""));

  // ✅ TOPLAM KULLANILAN (SICK + ANNUAL)
  // Kolonlar: 0 StartDate, 1 Reason, 2 ApprovedBy, 3 Sick, 4 Annual, 5 FileNo, 6 EndDate
  const toNum = (v) => {
    const s = String(v ?? "").replace(/,/g, "").trim();
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  };

  const totals = cleaned.reduce((acc, row) => {
    acc.sick += toNum(row[3]);
    acc.annual += toNum(row[4]);
    return acc;
  }, { sick: 0, annual: 0 });

  totals.total = totals.sick + totals.annual;

  return {
    title: "Employee Report",
    header,
    data: cleaned,
    totals,
    remainingTotal, // ✅ E3 veya STAFF_LIST I
    remainFrom: (String(header.remainE3 || "").trim() !== "" ? "E3" : "STAFF_LIST I")
  };
}


function apiGetDashboardChartData() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("STAFF_LIST");
  if (!sh) throw new Error("STAFF_LIST not found");

  const lastRow = sh.getLastRow();
  if (lastRow < 4) return { labels: [], annual: [], sick: [] };

  // A4:I... okuyalım (senin dosyada kayıtlar 4. satırdan başlıyor)
  const rows = sh.getRange(4, 1, lastRow - 3, 9).getDisplayValues();

  // label: Name (B)
  // remaining annual: G (index 6)
  // remaining sick: H (index 7)
  const labels = [];
  const annual = [];
  const sick = [];

  rows.forEach(r => {
    const name = String(r[1] || "").trim();
    if (!name) return;

    labels.push(name.length > 12 ? name.slice(0, 12) + "…" : name);
    annual.push(Number(r[6]) || 0);
    sick.push(Number(r[7]) || 0);
  });

  return { labels, annual, sick };
}

