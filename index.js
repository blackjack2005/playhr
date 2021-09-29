const { chromium } = require('playwright');
const fs = require('fs');

function idle(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

const keypress = () => {
  process.stdin.setRawMode(true)
  return new Promise(resolve => process.stdin.once('data', () => {
    process.stdin.setRawMode(false)
    resolve()
  }));
}

(async () => {
  // Output to CSV file
  const fo = fs.createWriteStream("records.csv");
  fo.write('\uFEFF'); // Byte of Marker (BOM) of UTF-8 file
  fo.write(`申请人, 部门 ID, 员工 ID, 姓名, 假别, 开始日期, 开始时间, 结束日期, 结束时间, 总计时数, 代理人, 理由, 状态, T1, T2, T3\r\n`);

  const tmStart = new Date();
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

  // Click text=请假记录查询
  await page.goto("https://hr.wistron.com/psp/PRD/EMPLOYEE/HRMS/c/ROLE_MANAGER.GP_ABS_MGRSS_HIST.GBL?NAVSTACK=Clear&PORTALPARAM_PTCNAV=HC_GP_ABS_MGRSS_HIST_GBL&EOPP.SCNode=HRMS&EOPP.SCPortal=EMPLOYEE&EOPP.SCName=ADMN_MANAGER_REVIEWS&EOPP.SCLabel=%e9%83%a8%e5%b1%9e%e7%94%b3%e8%af%b7%e8%ae%b0%e5%bd%95%e6%9f%a5%e8%af%a2&EOPP.SCFName=ADMN_F201512302128141443830683&EOPP.SCSecondary=true&EOPP.SCPTcname=PT_PTPP_SCFNAV_BASEPAGE_SCR&FolderPath=PORTAL_ROOT_OBJECT.CO_MANAGER_SELF_SERVICE.HC_TIME_MANAGEMENT.HC_VIEW_TIME_MGR.HC_GP_ABS_MGRSS_HIST_GBL&IsFolder=false");

  async function GetLeaveRecords(did, eid, employeeName) {
    await page.frame({name: 'TargetContent'}).fill('input[id="DERIVED_ABS_SS_BGN_DT"]', '2021/01/01');
    await page.frame({name: 'TargetContent'}).fill('input[id="DERIVED_ABS_SS_END_DT"]', '2021/12/31');
    await page.frame({name: 'TargetContent'}).click('input[id="DERIVED_ABS_SS_SRCH_BTN"]');
    let t1 = new Date(); console.log(`设定日期                `, t1);
    await page.waitForEvent('requestfinished', { timeout:621000});
    let t2 = new Date(); console.log(`设定日期 requestfinished`, t2, t2-t1);

    await page.frame({name: 'TargetContent'}).click('a[id="GP_ABSHISTSS_VW$hviewall$0"]', {timeout:1500}).then( async ()=>{
      console.log("Clicked 全部查看 button.");
      await page.waitForEvent('requestfinished');
      await idle(1000); //NOTE: Just don't know exactly when it is done.
    }, ()=>{
      console.log("No 全部查看 button.");
    });
    
    let begin = await page.frame({name: 'TargetContent'}).getAttribute('input[id="DERIVED_ABS_SS_BGN_DT"]', 'value');
    let end = await page.frame({name: 'TargetContent'}).getAttribute('input[id="DERIVED_ABS_SS_END_DT"]', 'value');
    const nAbsRows = await page.frame({name: 'TargetContent'}).locator("table.PSLEVEL1GRID tr").count();
    console.log(`From ${begin} till ${end} ${employeeName}有${nAbsRows-1}個请假记录`);

    // Get details of 请假记录
    for (let r=2; r <= nAbsRows; r++) {
    //for (let r=2; r <= nAbsRows && r<=4; r++) {//DEBUG: Only get 3 of them.
      const 申请人 = await page.frame({name: 'TargetContent'}).innerText(`table.PSLEVEL1GRID tr:nth-child(${r}) td:nth-child(6)`);
      await page.frame({name: 'TargetContent'}).click(`table.PSLEVEL1GRID tr:nth-child(${r}) td:nth-child(1) a`);

      // Get the desired iframe name
      const frnm = await new Promise(function(resolve, reject) {
        const frmnvg = frame => {
          frame.frameElement().then(ele => {
            ele.getAttribute("name").then(fn => {
              //console.log(`framenavigated ${fn}`);
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
      let 总计时数 = await page.frame({name: frnm}).innerText(`#DERIVED_ABS_SS_DURATION_ABS`);    // 16.0
      
      if (总计时数.trim()==="") {
        // e.g. (38妇女节)
        总计时数 = await page.frame({name: frnm}).innerText(`#DERIVED_ABS_SS_BEGIN_DAY_HRS`);     // 4.0 开始日时数
      }

      const 代理人 = await page.frame({name: frnm}).innerText(`#Z_PERS_SRCH_DEP_NAME_DISPLAY`);   // 庞美静 (TINA MJ PANG)
      const 理由 = await page.frame({name: frnm}).innerText(`#DERIVED_ABS_SS_COMMENTS`);          // 家中有事
      let 状态;
      try {
        状态 = await page.frame({name: frnm}).innerText(`#DERIVED_ABS_SS_WF_STATUS`, {timeout:100});         // 已批准
      } catch {
        状态 = await page.frame({name: frnm}).innerText(`#WORK_FLOW_STATUS`);
      }

      // Get 签核历程
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

      fo.write(`${申请人}, ${did}, ${eid}, ${employeeName}, ${假别名称}, ${开始日期}, ${开始时间}, ${结束日期}, ${结束时间}, ${总计时数}, ${代理人}, ${理由}, ${状态}, ${t1}, ${t2}, ${t3}\r\n`);
      await page.frame({name: frnm}).click(`a[id="DERIVED_ABS_SS_LINK"]`);  // 返回请假纪录
      await page.waitForEvent('requestfinished');
    }
    // console.log("Press any key to continue...");
    // await keypress();
  }

  let subs = [];  // direct subordinates
  let nTotalSubs = 0; // 全部下屬人數
  const nRows = await page.frame({name: 'TargetContent'}).locator("table.PSLEVEL1GRID tr").count();
  console.log(`你有${nRows-1}個直接下屬`);
  for (let row=1; row < nRows; row++) {
    const tbl = await page.frame({name: 'TargetContent'}).locator(`table.PSLEVEL1GRID tr:nth-child(${row+1}) td`).elementHandles();
    let name = await tbl[1].innerText();
    let eid  = await tbl[2].innerText();
    let did  = await tbl[4].innerText();
    let mgr = false;
    const exp = await tbl[1].$('a');
    if (exp) {
      mgr = true;
    }
    subs.push({name:name, eid:eid, did:did, mgr:mgr});
  }

  for (let row=1; row < nRows; row++) {
  //for (let row of [3,5]) {//DEBUG
    //console.log(`Going into row ${row} ${subs[row-1].name}`);
    await page.frame({name: 'TargetContent'}).click(`table.PSLEVEL1GRID tr:nth-child(${row+1}) td:nth-child(1) input`);  // input:has-text("选择")
    let t1 = new Date(); console.log(`${subs[row-1].name} 选择 clicked        `, t1);
    await page.waitForEvent('requestfinished');
    let t2 = new Date(); console.log(`${subs[row-1].name} 选择 requestfinished`, t2, t2-t1);
    await GetLeaveRecords(subs[row-1].did, subs[row-1].eid, subs[row-1].name);
    await page.frame({name: 'TargetContent'}).click('a[id="DERIVED_ABS_SS_BACK"]'); //click('text=返回到“直接报告者”');

    if ( subs[row-1].mgr ) {
      let l2Cnt = null;  // 直接下属的下属人数
      let l2Idx = null;
      do {
        await page.frame({name: 'TargetContent'}).click(`table.PSLEVEL1GRID tr:nth-child(${row+1}) td:nth-child(2) a`); // 展开
        t1 = new Date(); console.log(`${subs[row-1].name} 展开 clicked        `, t1);
        await page.waitForEvent('requestfinished');
        t2 = new Date(); console.log(`${subs[row-1].name} 展开 requestfinished`, t2, t2-t1);
        const nRows2 = await page.frame({name: 'TargetContent'}).locator("table.PSLEVEL1GRID tr").count();
        const tmpCnt = nRows2 - nRows;
        if ( l2Cnt === null ) {
          l2Cnt = tmpCnt;
          l2Idx = 1;
          console.log(`${subs[row-1].name} 有 ${l2Cnt} 個下屬`);
          nTotalSubs += l2Cnt;
        } else {
            console.assert(l2Cnt === tmpCnt);
        }
        const tbl = await page.frame({name: 'TargetContent'}).locator(`table.PSLEVEL1GRID tr:nth-child(${row+1+l2Idx}) td`).elementHandles();
        let name = await tbl[1].innerText();
        let eid  = await tbl[2].innerText();
        let did  = await tbl[4].innerText();
        await page.frame({name: 'TargetContent'}).click(`table.PSLEVEL1GRID tr:nth-child(${row+1+l2Idx}) td:nth-child(1) input:has-text("选择")`);
        t1 = new Date(); console.log(`${name} 选择 clicked        `, t1);
        await page.waitForEvent('requestfinished');
        t2 = new Date(); console.log(`${name} 选择 requestfinished`, t2, t2-t1);
        await GetLeaveRecords(did, eid, name);
        await page.frame({name: 'TargetContent'}).click('a[id="DERIVED_ABS_SS_BACK"]'); //click('text=返回到“直接报告者”');
        //if ( l2Idx === 1 ) l2Idx = l2Cnt-1;  //DEBUG
        l2Idx ++;
      } while (l2Idx <= l2Cnt);
    }
  }

  fo.end();
  console.log(`全部下屬人數: ${nRows-1+nTotalSubs}`);
  const tmFinish = new Date();
  const msElapsed = tmFinish - tmStart;
  console.log(`Time elapsed: ${msElapsed} ms`);

  console.log("Wait for page to close", new Date());
  await page.waitForEvent('close', {timeout: 36000}).then(()=>{
    console.log("使用者自行结束")
  }, () => {
    console.log("Time out. Auto close.");
    return page.close();
  });
  console.log("Page close", new Date());

  await context.close();
  await browser.close();
})();