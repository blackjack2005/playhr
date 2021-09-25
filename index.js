const { chromium } = require('playwright');
const fs = require('fs');

function idle(ms) {
  return new Promise((resolve, reject) => setTimeout(()=>resolve(), ms));
}

const keypress = () => {
  process.stdin.setRawMode(true)
  return new Promise(resolve => process.stdin.once('data', () => {
    process.stdin.setRawMode(false)
    resolve()
  }))
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
  await idle(5000);
  // Click text=请假记录查询
  // Another: https://hr.wistron.com/psp/PRD/EMPLOYEE/HRMS/c/ROLE_MANAGER.GP_ABS_MGRSS_HIST.GBL?NAVSTACK=Clear&PORTALPARAM_PTCNAV=HC_GP_ABS_MGRSS_HIST_GBL&EOPP.SCNode=HRMS&EOPP.SCPortal=EMPLOYEE&EOPP.SCName=ADMN_REVIEW_AND_APPROVAL_WSH&EOPP.SCLabel=%e9%83%a8%e5%b1%9e%e7%94%b3%e8%af%b7%e8%ae%b0%e5%bd%95%e6%9f%a5%e8%af%a2&EOPP.SCFName=ADMN_F202004220946516064176860&EOPP.SCSecondary=true&EOPP.SCPTcname=PT_PTPP_SCFNAV_BASEPAGE_SCR&FolderPath=PORTAL_ROOT_OBJECT.CO_MANAGER_SELF_SERVICE.HC_TIME_MANAGEMENT.HC_VIEW_TIME_MGR.HC_GP_ABS_MGRSS_HIST_GBL&IsFolder=false
  await page.goto("https://hr.wistron.com/psp/PRD/EMPLOYEE/HRMS/c/ROLE_MANAGER.GP_ABS_MGRSS_HIST.GBL?NAVSTACK=Clear&PORTALPARAM_PTCNAV=HC_GP_ABS_MGRSS_HIST_GBL&EOPP.SCNode=HRMS&EOPP.SCPortal=EMPLOYEE&EOPP.SCName=ADMN_MANAGER_REVIEWS&EOPP.SCLabel=%e9%83%a8%e5%b1%9e%e7%94%b3%e8%af%b7%e8%ae%b0%e5%bd%95%e6%9f%a5%e8%af%a2&EOPP.SCFName=ADMN_F201512302128141443830683&EOPP.SCSecondary=true&EOPP.SCPTcname=PT_PTPP_SCFNAV_BASEPAGE_SCR&FolderPath=PORTAL_ROOT_OBJECT.CO_MANAGER_SELF_SERVICE.HC_TIME_MANAGEMENT.HC_VIEW_TIME_MGR.HC_GP_ABS_MGRSS_HIST_GBL&IsFolder=false");

  // Click text=请假记录查询
  /*
  await page.frame({
    name: 'TargetContent'
  }).click('text=请假记录查询');
  // assert.equal(page.url(), 'https://hr.wistron.com/psp/PRD/EMPLOYEE/HRMS/c/ROLE_MANAGER.GP_ABS_MGRSS_HIST.GBL?NAVSTACK=Clear&PORTALPARAM_PTCNAV=HC_GP_ABS_MGRSS_HIST_GBL&EOPP.SCNode=HRMS&EOPP.SCPortal=EMPLOYEE&EOPP.SCName=ADMN_MANAGER_REVIEWS&EOPP.SCLabel=%e9%83%a8%e5%b1%9e%e7%94%b3%e8%af%b7%e8%ae%b0%e5%bd%95%e6%9f%a5%e8%af%a2&EOPP.SCFName=ADMN_F201512302128141443830683&EOPP.SCSecondary=true&EOPP.SCPTcname=PT_PTPP_SCFNAV_BASEPAGE_SCR&FolderPath=PORTAL_ROOT_OBJECT.CO_MANAGER_SELF_SERVICE.HC_TIME_MANAGEMENT.HC_VIEW_TIME_MGR.HC_GP_ABS_MGRSS_HIST_GBL&IsFolder=false');
  */
  let subs = [];  // direct subordinates
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
    subs.push({name:name, eid:eid, did:did});
    console.log(`Member ${row}: "${name}", "${eid}", "${did}"`);
  }
  console.log(subs);

  // Write to CSV file
  const fo = fs.createWriteStream("records.csv");
  fo.write('\uFEFF'); // Byte of Marker (BOM) of UTF-8 file
  fo.write(`申请人, 部门 ID, 员工 ID, 名称, 假别名称, 开始日期, 开始时间, 结束日期, 结束时间, 总计时数, 代理人, 理由, 状态, T1, T2, T3\r\n`);

  //for (let row=1; row < nRows; row++) {
  for (let row of [2,4]) {//DEBUG
    console.log(`Going into row ${row} ${subs[row-1].name}`);
    await page.frame({
      name: 'TargetContent'
    }).waitForSelector(`table.PSLEVEL1GRID tr:nth-child(${row+1}) td:nth-child(1) input:has-text("选择")`);
    await page.frame({
      name: 'TargetContent'
    }).click(`table.PSLEVEL1GRID tr:nth-child(${row+1}) td:nth-child(1) input:has-text("选择")`);
    //.locator("table.PSLEVEL1GRID tr").nth(row).locator("td").nth(0).click('input:has-text("选择")');
    console.log("选择 clicked");
    await page.waitForEvent('requestfinished');
    console.log("选择 requestfinished");

    // Get absence records begin
    /*
    await page.frame({
      name: 'TargetContent'
    }).fill('input[id="DERIVED_ABS_SS_BGN_DT"]', '2020/01/01');
    await page.frame({
      name: 'TargetContent'
    }).click('input[id="DERIVED_ABS_SS_SRCH_BTN"]');
    //await page.waitForEvent('requestfinished', { timeout:3600000});
    //await page.waitForSelector('input[id="DERIVED_ABS_SS_BGN_DT"]:has-text("2020/01/01")')
    await page.waitForLoadState("networkidle", {timeout:3600000});
    console.log("2020/01/01 requestfinished");
    //await idle(3600000);
    */

    await page.frame({
      name: 'TargetContent'
    }).click('a[id="GP_ABSHISTSS_VW$hviewall$0"]:has-text("全部查看")', {timeout:1000}).then( async ()=>{
      console.log("Has 全部查看 indeed.");
      await page.waitForEvent('requestfinished');
      await idle(1000); //DEBUG why?
    }, ()=>{
      console.log("No 全部查看.");
    });
    
    let begin = await page.frame({
      name: 'TargetContent'
    }).locator('input[id="DERIVED_ABS_SS_BGN_DT"]').getAttribute('value');
    let end = await page.frame({
      name: 'TargetContent'
    }).locator('input[id="DERIVED_ABS_SS_END_DT"]').getAttribute('value');
    console.log(`From ${begin} till ${end}`);

    const nAbsRows = await page.frame({
      name: 'TargetContent'
    }).locator("table.PSLEVEL1GRID tr").count();
    console.log(`TA有${nAbsRows-1}個请假记录`);

    // Get details of 请假记录 Begin
    for (let r=2; r <= nAbsRows && r<=4; r++) {//DEBUG
      const applicant = await page.frame({name: 'TargetContent'}).innerText(`table.PSLEVEL1GRID tr:nth-child(${r}) td:nth-child(6)`);
      //console.log(`${applicant}`);
      await page.frame({name: 'TargetContent'}).click(`table.PSLEVEL1GRID tr:nth-child(${r}) td:nth-child(1) a`);

      // Get the desired iframe name
      const frnm = await new Promise(function(resolve, reject) {
        const frmnvg = frame => {
          frame.frameElement().then(ele => {
            ele.getAttribute("name").then(fn => {
              console.log(`framenavigated ${fn}`);
              if ( fn.indexOf("ptModFrame_") === 0 ) {
                page.removeListener('framenavigated', frmnvg);
                resolve(fn);
              }
            });
          });
        };
        page.on('framenavigated', frmnvg);
      });

      const who = await page.frame({name: frnm}).innerText(`#PERSON_NAME_NAME`);  // 张翀 (JACK C ZHANG)
      const 假别名称 = await page.frame({name: frnm}).innerText(`#DERIVED_ABS_SS_PIN_TAKE_NUM`);  // 特休假
      const 开始日期 = await page.frame({name: frnm}).innerText(`#DERIVED_ABS_SS_BGN_DT`);        // 2021/09/13
      const 开始时间 = await page.frame({name: frnm}).innerText(`#Z_DERIVED_ABS_S_START_TIME`);   // 08:20
      const 结束日期 = await page.frame({name: frnm}).innerText(`#DERIVED_ABS_SS_END_DT`);        // 2021/09/14
      const 结束时间 = await page.frame({name: frnm}).innerText(`#Z_DERIVED_ABS_S_END_TIME`);     // 17:20
      const 总计时数 = await page.frame({name: frnm}).innerText(`#DERIVED_ABS_SS_DURATION_ABS`);  // 16.0
      /*
      if (总计时数=="") {
        // e.g. (38妇女节)
        const 开始日时数 = await page.frame({name: frnm}).innerText(`#DERIVED_ABS_SS_BEGIN_DAY_HRS`);  // 4.0
      }
      */
      const 代理人 = await page.frame({name: frnm}).innerText(`#Z_PERS_SRCH_DEP_NAME_DISPLAY`);   // 庞美静 (TINA MJ PANG)
      const 理由 = await page.frame({name: frnm}).innerText(`#DERIVED_ABS_SS_COMMENTS`);          // 家中有事
      const 状态 = await page.frame({name: frnm}).innerText(`#DERIVED_ABS_SS_WF_STATUS`);         // 已批准

      // Get 签核历程 BEGIN
      /**
       * 	Unexpected:
签核状态	  Step	  姓名	  Action DateTime	  Approver Comments	  
已提交  Applicant 冼策 (CE XIAN)  21/06/04 15:37:23 旅游
已修改  Applicant 冼策 (CE XIAN)  21/06/04 16:44:59 旅游
已批准  Leave_Agent 李超 (LANCE LI) 21/06/04 16:47:43
已批准  OC_L1Supervisor 黃世勇 (ALEX HUANG) 21/06/06 22:17:37
       */
      let t1 = "" // Applicant time
      , t2 = ""   // Proxy time
      , t3 = "";  // Approver time
      const nApvCnt = await page.frame({name: frnm}).locator("table[id='tdgbrZ_GP_ABS_SS_STA$0'] tr").count();
      //console.log(`TA有${nApvCnt}個签核历程`);
      if (nApvCnt === 3) {
        t1 = await page.frame({name: frnm}).innerText("table[id='tdgbrZ_GP_ABS_SS_STA$0'] tr:nth-child(1) td:nth-child(4)");
        t2 = await page.frame({name: frnm}).innerText("table[id='tdgbrZ_GP_ABS_SS_STA$0'] tr:nth-child(2) td:nth-child(4)");
        t3 = await page.frame({name: frnm}).innerText("table[id='tdgbrZ_GP_ABS_SS_STA$0'] tr:nth-child(3) td:nth-child(4)");
      }
      // Get 签核历程 END
      console.log(`${applicant} ${who} ${假别名称} ${开始日期} ${开始时间} ~ ${结束日期} ${结束时间} ${总计时数} 小时 ${代理人} ${理由} ${状态} ${t1} ${t2} ${t3}`);
      fo.write(`${applicant},,, ${who}, ${假别名称}, ${开始日期}, ${开始时间}, ${结束日期}, ${结束时间}, ${总计时数}, ${代理人}, ${理由}, ${状态}, ${t1}, ${t2}, ${t3}\r\n`);
      await page.frame({name: frnm}).click(`a[id="DERIVED_ABS_SS_LINK"]`);  // 返回请假纪录
      await page.waitForEvent('requestfinished');
      console.log("返回请假纪录 requestfinished");
    }
    // Get details of 请假记录 End
//    console.log("Press any key to continue...");
//    await keypress();
    //await idle(30000);
    // Get absence records end

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