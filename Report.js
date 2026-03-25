function openReportMenu() {
  const html = HtmlService.createHtmlOutputFromFile("ReportMenu")
    .setWidth(400)
    .setHeight(750);
  SpreadsheetApp.getUi().showModalDialog(html, "📄 Generate Report");
}
function showAllStaffReport() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("STAFF_LIST");

  const data = sh.getRange(3, 1, sh.getLastRow() - 2, 9).getValues();

  // Profesyonel başlıklar:
  const header = [
    "Employee ID",
    "Employee Name",
    "Department",
    "Annual Leave Entitled",
    "Sick Leave Entitled",
    "Annual Leave Used",
    "Sick Leave Used",
    "Remaining Annual Leave",
    "Remaining Sick Leave"
  ];

  const template = HtmlService.createTemplateFromFile("ReportTemplate");
  template.title = "All Staff Report";
  template.data = data;
  template.header = header;

  SpreadsheetApp.getUi().showModalDialog(
    template.evaluate().setWidth(1200).setHeight(850),
    "All Staff Report"
  );
}


function showDepartmentReport(dept) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("STAFF_LIST");

  const all = sh.getRange(3, 1, sh.getLastRow() - 2, 9).getValues();

  const filtered = all.filter(row => row[2] === dept);

  // Aynı profesyonel başlıklar
  const header = [
    "Employee ID",
    "Employee Name",
    "Department",
    "Annual Leave Entitled",
    "Sick Leave Entitled",
    "Annual Leave Used",
    "Sick Leave Used",
    "Remaining Annual Leave",
    "Remaining Sick Leave"
  ];

  const template = HtmlService.createTemplateFromFile("ReportTemplate");
  template.title = "Department Report: " + dept;
  template.data = filtered;
  template.header = header;

  SpreadsheetApp.getUi().showModalDialog(
    template.evaluate().setWidth(1200).setHeight(850),
    "Department Report"
  );
}


function showIndividualReportById(staffId) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(String(staffId));

  if (!sh) {
    SpreadsheetApp.getUi().alert("Staff sheet not found: " + staffId);
    return;
  }

  // ÜST BİLGİLER
  const header = {
    nameDept: sh.getRange("B1").getValue(),
    annual: sh.getRange("C3").getValue(),
    sick: sh.getRange("D3").getValue(),
    remain: sh.getRange("E3").getValue()
  };

  // TABLO (GOING DATE başlığının ALTINDAN)
  const lastRow = sh.getLastRow();
  const data =
    lastRow < 8
      ? []
      : sh.getRange(8, 1, lastRow - 7, 7).getValues();

  const tpl = HtmlService.createTemplateFromFile("IndividualReport");
  tpl.header = header;
  tpl.data = data;

  const html = tpl.evaluate()
    .setWidth(1200)
    .setHeight(800);

  SpreadsheetApp.getUi().showModalDialog(html, "Employee Report");
}



function getDepartmentsFromStaffList_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("STAFF_LIST");

  const data = sh.getRange(3, 3, sh.getLastRow() - 2, 1).getValues();
  const unique = [...new Set(data.flat().filter(x => x !== ""))];

  return unique;
}
function runReport(type, value) {
  if (type === "all") {
    showAllStaffReport();
  }
  if (type === "dept") {
    showDepartmentReport(value);
  }
  if (type === "individual") {
    showIndividualReportById(value);
  }
}

/////////////////

function apiGetAllStaffReport() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("STAFF_LIST");
  const data = sh.getRange(3, 1, sh.getLastRow() - 2, 9).getValues();

  return {
    title: "All Staff Report",
    header: [
      "Employee ID","Employee Name","Department",
      "Annual Leave Entitled","Sick Leave Entitled",
      "Annual Leave Used","Sick Leave Used",
      "Remaining Annual Leave","Remaining Sick Leave"
    ],
    data
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
  const sh = ss.getSheetByName(String(staffId).trim());
  if (!sh) throw new Error("Staff sheet not found: " + staffId);

  const header = {
    nameDept: sh.getRange("B1").getValue(),
    annual: sh.getRange("C3").getValue(),
    sick: sh.getRange("D3").getValue(),
    remain: sh.getRange("E3").getValue()
  };

  const lastRow = sh.getLastRow();
  const data = (lastRow < 8) ? [] : sh.getRange(8, 1, lastRow - 7, 7).getValues();

  return { title: "Employee Report", header, data };
}



