const { chromium } = require('playwright');

const idle = (ms) => {
  return new Promise((resolve, reject) => setTimeout(()=>resolve(), ms))
}

(async () => {
  const browser = await chromium.launch({
    headless: false
  });
  const context = await browser.newContext();

  // Open new page
  const page = await context.newPage();

  await page.goto('https://hr.wistron.com/psp/PRD/?cmd=login&languageCd=ZHS&');

  // Fill input[name="userid"]
  await page.fill('input[name="userid"]', '8106062');
  // Fill input[name="pwd"]
  await page.fill('input[name="pwd"]', '2022Indepp');
  // Click text=登录
  //await page.click('text=登录');
  await page.click('input[name="Submit"]');
  //await idle(9000);
  // Click text=请假记录查询
  await page.goto("https://hr.wistron.com/psp/PRD/EMPLOYEE/HRMS/c/ROLE_MANAGER.GP_ABS_MGRSS_HIST.GBL?NAVSTACK=Clear&PORTALPARAM_PTCNAV=HC_GP_ABS_MGRSS_HIST_GBL&EOPP.SCNode=HRMS&EOPP.SCPortal=EMPLOYEE&EOPP.SCName=ADMN_REVIEW_AND_APPROVAL_WSH&EOPP.SCLabel=%e9%83%a8%e5%b1%9e%e7%94%b3%e8%af%b7%e8%ae%b0%e5%bd%95%e6%9f%a5%e8%af%a2&EOPP.SCFName=ADMN_F202004220946516064176860&EOPP.SCSecondary=true&EOPP.SCPTcname=PT_PTPP_SCFNAV_BASEPAGE_SCR&FolderPath=PORTAL_ROOT_OBJECT.CO_MANAGER_SELF_SERVICE.HC_TIME_MANAGEMENT.HC_VIEW_TIME_MGR.HC_GP_ABS_MGRSS_HIST_GBL&IsFolder=false");

  // Go to https://hr.wistron.com/psp/PRD/EMPLOYEE/HRMS/h/?tab=DEFAULT
  //await page.goto('https://hr.wistron.com/psp/PRD/EMPLOYEE/HRMS/h/?tab=DEFAULT');

  // Go to https://hr.wistron.com/psp/PRD/EMPLOYEE/HRMS/h/?tab=Z_RC_TAB_MSS
  //await page.goto('https://hr.wistron.com/psp/PRD/EMPLOYEE/HRMS/h/?tab=Z_RC_TAB_MSS');

  // Go to https://hr.wistron.com/psp/PRD/EMPLOYEE/HRMS/s/WEBLIB_PTPP_SC.HOMEPAGE.FieldFormula.IScript_AppHP?scname=ADMN_MANAGER_REVIEWS&secondary=true&fname=ADMN_F201512302128141443830683&FolderPath=PORTAL_ROOT_OBJECT.PORTAL_BASE_DATA.CO_NAVIGATION_COLLECTIONS.ADMN_MANAGER_REVIEWS.ADMN_F201512302127315039216284.ADMN_F201512302128141443830683&IsFolder=true&PORTALPARAM_PTCNAV=PT_PTPP_SCFNAV_BASEPAGE_SCR
  //await page.goto('https://hr.wistron.com/psp/PRD/EMPLOYEE/HRMS/s/WEBLIB_PTPP_SC.HOMEPAGE.FieldFormula.IScript_AppHP?scname=ADMN_MANAGER_REVIEWS&secondary=true&fname=ADMN_F201512302128141443830683&FolderPath=PORTAL_ROOT_OBJECT.PORTAL_BASE_DATA.CO_NAVIGATION_COLLECTIONS.ADMN_MANAGER_REVIEWS.ADMN_F201512302127315039216284.ADMN_F201512302128141443830683&IsFolder=true&PORTALPARAM_PTCNAV=PT_PTPP_SCFNAV_BASEPAGE_SCR');

  // Click text=请假记录查询
  /*
  await page.frame({
    name: 'TargetContent'
  }).click('text=请假记录查询');
  // assert.equal(page.url(), 'https://hr.wistron.com/psp/PRD/EMPLOYEE/HRMS/c/ROLE_MANAGER.GP_ABS_MGRSS_HIST.GBL?NAVSTACK=Clear&PORTALPARAM_PTCNAV=HC_GP_ABS_MGRSS_HIST_GBL&EOPP.SCNode=HRMS&EOPP.SCPortal=EMPLOYEE&EOPP.SCName=ADMN_MANAGER_REVIEWS&EOPP.SCLabel=%e9%83%a8%e5%b1%9e%e7%94%b3%e8%af%b7%e8%ae%b0%e5%bd%95%e6%9f%a5%e8%af%a2&EOPP.SCFName=ADMN_F201512302128141443830683&EOPP.SCSecondary=true&EOPP.SCPTcname=PT_PTPP_SCFNAV_BASEPAGE_SCR&FolderPath=PORTAL_ROOT_OBJECT.CO_MANAGER_SELF_SERVICE.HC_TIME_MANAGEMENT.HC_VIEW_TIME_MGR.HC_GP_ABS_MGRSS_HIST_GBL&IsFolder=false');
*/

  /*
  //await idle(1000);
  // Double click text=S0511001
  await page.frame({
    name: 'TargetContent'
  }).dblclick('text=S0511001');
  */

  const nRows = await page.frame({
    name: 'TargetContent'
  }).locator("table.PSLEVEL1GRID tr").count();
  console.log(`你有${nRows-1}個直接下屬`);
  for (let row=1; row < nRows; row++) {
    const tbl = await page.frame({
      name: 'TargetContent'
    }).locator("table.PSLEVEL1GRID tr").nth(row).locator("td").elementHandles();
    let name = await tbl[1].innerText();
    let eid  = await tbl[2].innerText();
    let did  = await tbl[4].innerText();
    console.log(`Member ${row}: "${name}", "${eid}", "${did}"`);
  }

  for (let row=1; row < nRows; row++) {
    console.log(`Going into row ${row}`);
    await page.frame({
      name: 'TargetContent'
    }).waitForSelector(`table.PSLEVEL1GRID tr:nth-child(${row+1}) td:nth-child(1) input:has-text("选择")`);
    await page.frame({
      name: 'TargetContent'
    }).locator(`table.PSLEVEL1GRID tr:nth-child(${row+1}) td:nth-child(1) input:has-text("选择")`).click();
    //.locator("table.PSLEVEL1GRID tr").nth(row).locator("td").nth(0).click('input:has-text("选择")');
    console.log("选择");
    await page.waitForEvent('requestfinished');
    console.log("requestfinished");
    //await idle(3000);
    // Click text=返回到“直接报告者”
    await page.frame({
      name: 'TargetContent'
    }).click('a[id="DERIVED_ABS_SS_BACK"]'); //click('text=返回到“直接报告者”');  //  {trial: true}
    console.log('返回到“直接报告者”');
    //await page.waitForNavigation();
    //await page.waitForEvent('requestfinished');
    //console.log('requestfinished');
    //await page.waitForLoadState('domcontentloaded');
    //console.log('domcontentloaded');
    //await idle(1000); // why?
  }

  console.log("Wait for page to close", new Date());
  await page.waitForEvent('close', {timeout: 3600000}).then(()=>{
    console.log("使用者结束")
  }, reason => {
    console.warn("Time out. Auto close.");
    //console.error(reason);
    return page.close();
  });
  console.log("Page close", new Date());
  // Close page
  //await page.close();

  // ---------------------
  await context.close();
  await browser.close();
})();