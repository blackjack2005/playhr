// Get overtime records
// 加班记录查询
//
const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('assert');

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
  const fo = fs.createWriteStream("ot-records.csv");
  fo.write('\uFEFF'); // Byte of Marker (BOM) of UTF-8 file
  fo.write(`部门 ID, 员工 ID, 姓名, Type, 状态, 开始日期, 结束日期, 加班时数, 申请人, 理由\r\n`);

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
  await page.fill('input[name="pwd"]', '22Indepp20');
  // Click text=登录
  //await page.click('text=登录');
  await page.click('input[name="Submit"]');

  // Click text=加班记录查询
  await page.goto("https://hr.wistron.com/psp/PRD/EMPLOYEE/HRMS/c/Z_AM_MNU.Z_OT_MGRSS_HIST.GBL?PAGE=HR_DR_DIRECTREPORT");

  async function waitTillReady() {
    let cnt = 0;
    while (true) {
      const divWait = await page.frame({name: 'TargetContent'}).$('div#WAIT_win0');
      const dvwtStyle = await divWait.getAttribute('style');
      const dsp = /display: (.*?);/.exec(dvwtStyle);
      if ( dsp[1] === 'block' ) {
        cnt ++;
      } else if ( dsp[1] === 'none' ) {
        break;
      }
      await page.waitForTimeout(100);
    }
    console.log(`waitTillReady ${cnt}`); //DEBUG
  }

  async function GetOTRecords(did, eid, employeeName) {
    await page.frame({name: 'TargetContent'}).fill('input[id="DERIVED_ABS_SS_BGN_DT"]', '2020/1/1');
    await page.frame({name: 'TargetContent'}).fill('input[id="DERIVED_ABS_SS_END_DT"]', '2021/12/31');
    let t1 = new Date(); console.log('设定日期 begin', t1);
    await page.frame({name: 'TargetContent'}).click('input[id="DERIVED_ABS_SS_SRCH_BTN"]'); // 刷新
    await waitTillReady();
    let t2 = new Date(); console.log('设定日期 end  ', t2, t2-t1);

    const aViewAll = await page.frame({name: 'TargetContent'}).$('a[id="Z_OTHISTSS_VW$hviewall$0"]'); // 全部查看
    if ( aViewAll ) {
      await aViewAll.click();
      console.log("Clicked 全部查看 button.");
      await waitTillReady();
    } else {
      console.log("No 全部查看 button.");
    }

    const counters = await page.frame({name: 'TargetContent'}).$('span.PSGRIDCOUNTER', {strict: true});
    const nOtRows = await page.frame({name: 'TargetContent'}).locator("table.PSLEVEL1GRID tr").count();
    if ( counters ) {
      const cstr = await counters.innerText();
      const ds = /.*?\/(.*)/.exec(cstr); // 1-10/15 or 1/1
      assert(ds[1]==nOtRows-1, `table not ready? counter=${ds[1]} rows=${nOtRows-1}`);
    } else {
      assert(nOtRows===0, 'weird');
    }

    // Get overview of 加班记录
    for (let r=2; r <= nOtRows; r++) {
      const tds = await page.frame({name: 'TargetContent'}).locator(`table.PSLEVEL1GRID tr:nth-child(${r}) td`).elementHandles();
      const 申請項目 = await tds[0].innerText().then(t=>t.trim());  // Off Day Overtime
      const 状态 = await tds[1].innerText().then(t=>t.trim());      // 已批准
      const 开始日期 = await tds[2].innerText().then(t=>t.trim());  // 2021/09/30
      const 结束日期 = await tds[3].innerText().then(t=>t.trim());  // 2021/09/30
      const 时数 = await tds[4].innerText().then(t=>t.trim());      // 11.5 小时
      let 加班时数 = '???';
      const tmpHr = /(.*?) 小时/.exec(时数);
      if ( tmpHr ) {
        加班时数 = tmpHr[1];
      }
      const 申请人 = await tds[5].innerText().then(t=>t.trim());    // 经理人(助理)申请
      fo.write(`${did},${eid},${employeeName},${申請項目},${状态},${开始日期},${结束日期},${加班时数},${申请人}\r\n`);
    }
  }

  let subs = [];  // direct subordinates
  let nTotalSubs = 0; // 全部下屬人數
  const nRows = await page.frame({name: 'TargetContent'}).locator("table.PSLEVEL1GRID tr").count();
  console.log(`你有${nRows-1}個直接下屬`);
  for (let row=2; row <= nRows; row++) {
    const tbl = await page.frame({name: 'TargetContent'}).locator(`table.PSLEVEL1GRID tr:nth-child(${row}) td`).elementHandles();
    let name = await tbl[1].innerText();
    let eid  = await tbl[2].innerText();
    let did  = await tbl[5].innerText();
    let mgr = false;
    const exp = await tbl[1].$('a');
    if (exp) {
      mgr = true;
    }
    subs.push({name:name, eid:eid, did:did, mgr:mgr});
  }
  console.log(subs);    //DEBUG

  //
  // 展开部门主管的下属列表
  //
  for (let row=2; row <= nRows; row++) {
    if ( subs[row-2].mgr ) {
      let l2Cnt = null;  // 直接下属的下属人数
      let l2Idx = null;
      do {
        t1 = new Date(); console.log(`${subs[row-2].name} 展开 begin`, t1);
        await page.frame({name: 'TargetContent'}).click(`table.PSLEVEL1GRID tr:nth-child(${row}) td:nth-child(2) a`); // 展开
        //await page.waitForEvent('requestfinished');
        await waitTillReady();
        t2 = new Date(); console.log(`${subs[row-2].name} 展开 end  `, t2, t2-t1);
        const nRows2 = await page.frame({name: 'TargetContent'}).locator("table.PSLEVEL1GRID tr").count();
        const tmpCnt = nRows2 - nRows;
        if ( l2Cnt === null ) {
          l2Cnt = tmpCnt;
          l2Idx = 1;
          console.log(`${subs[row-2].name} 有 ${l2Cnt} 個下屬`);
          nTotalSubs += l2Cnt;
        } else {
            console.assert(l2Cnt === tmpCnt);
        }
        const tbl = await page.frame({name: 'TargetContent'}).locator(`table.PSLEVEL1GRID tr:nth-child(${row+l2Idx}) td`).elementHandles();
        let name = await tbl[1].innerText();
        let eid  = await tbl[2].innerText();
        let did  = await tbl[5].innerText();
        //await idle(900);
        await page.frame({name: 'TargetContent'}).click(`table.PSLEVEL1GRID tr:nth-child(${row+l2Idx}) td:nth-child(1) input:has-text("选择")`);
        t1 = new Date(); console.log(`${name} 选择 begin`, t1);
        await waitTillReady();
        //await page.waitForEvent('requestfinished');
        t2 = new Date(); console.log(`${name} 选择 end  `, t2, t2-t1);
        await GetOTRecords(did, eid, name);
        //await idle(900);
        await page.goto("https://hr.wistron.com/psp/PRD/EMPLOYEE/HRMS/c/Z_AM_MNU.Z_OT_MGRSS_HIST.GBL?PAGE=HR_DR_DIRECTREPORT");
        l2Idx ++;
      } while (l2Idx <= l2Cnt);
    }
  }

  fo.end();
  //console.log(`全部下屬人數: ${nRows-1+nTotalSubs}`);
  const tmFinish = new Date();
  const msElapsed = tmFinish - tmStart;
  console.log(`Time elapsed: ${msElapsed} ms`);

  console.log("Wait for page to close", new Date());
  await page.waitForEvent('close', {timeout: 60000}).then(()=>{
    console.log("使用者自行结束")
  }, () => {
    console.log("Time out. Auto close.");
    return page.close();
  });
  console.log("Page close", new Date());

  await context.close();
  await browser.close();
})();
