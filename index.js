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
  await page.fill('input[name="pwd"]', '23indePp22');
  // Click text=登录
  //await page.click('text=登录');
  await page.click('input[name="Submit"]');

  // Click text=请假记录查询
  const lrq = "https://hr.wistron.com/psp/PRD/EMPLOYEE/HRMS/c/ROLE_MANAGER.GP_ABS_MGRSS_HIST.GBL?NAVSTACK=Clear&PORTALPARAM_PTCNAV=HC_GP_ABS_MGRSS_HIST_GBL&EOPP.SCNode=HRMS&EOPP.SCPortal=EMPLOYEE&EOPP.SCName=ADMN_MANAGER_REVIEWS&EOPP.SCLabel=%e9%83%a8%e5%b1%9e%e7%94%b3%e8%af%b7%e8%ae%b0%e5%bd%95%e6%9f%a5%e8%af%a2&EOPP.SCFName=ADMN_F201512302128141443830683&EOPP.SCSecondary=true&EOPP.SCPTcname=PT_PTPP_SCFNAV_BASEPAGE_SCR&FolderPath=PORTAL_ROOT_OBJECT.CO_MANAGER_SELF_SERVICE.HC_TIME_MANAGEMENT.HC_VIEW_TIME_MGR.HC_GP_ABS_MGRSS_HIST_GBL&IsFolder=false";
  await page.goto(lrq);

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
      await page.waitForTimeout(500);
    }
    console.log(`waitTillReady ${cnt}`); //DEBUG
  }

  async function GetLeaveRecords(did, eid, employeeName) {
    /*
    await page.frame({name: 'TargetContent'}).fill('input[id="DERIVED_ABS_SS_BGN_DT"]', '2020/1/1');
    await page.frame({name: 'TargetContent'}).fill('input[id="DERIVED_ABS_SS_END_DT"]', '2021/11/1');
    let t1 = new Date(); console.log('设定日期 begin', t1);
    await page.frame({name: 'TargetContent'}).click('input[id="DERIVED_ABS_SS_SRCH_BTN"]'); // 刷新
    await waitTillReady();
    let t2 = new Date(); console.log('设定日期 end  ', t2, t2-t1);
    */

    const aViewAll = await page.frame({name: 'TargetContent'}).$('a[id="GP_ABSHISTSS_VW$hviewall$0"]'); // 全部查看
    if ( aViewAll ) {
      await aViewAll.click();
      console.log("Clicked 全部查看 button.");
      await waitTillReady();
    } else {
      console.log("No 全部查看 button.");
    }

    const counters = await page.frame({name: 'TargetContent'}).$('span.PSGRIDCOUNTER', {strict: true});
    const nAbsRows = await page.frame({name: 'TargetContent'}).locator("table.PSLEVEL1GRID tr").count();
    if ( counters ) {
      const cstr = await counters.innerText();
      const ds = /.*?\/(.*)/.exec(cstr); // 1-10/15 or 1/1
      assert(ds[1]==nAbsRows-1, `table not ready? counter=${ds[1]} rows=${nAbsRows-1}`);
    } else {
      assert(nAbsRows===0, 'weird');
    }

    let begin = await page.frame({name: 'TargetContent'}).getAttribute('input[id="DERIVED_ABS_SS_BGN_DT"]', 'value');
    let end = await page.frame({name: 'TargetContent'}).getAttribute('input[id="DERIVED_ABS_SS_END_DT"]', 'value');
    console.log(`From ${begin} till ${end} ${employeeName}有${nAbsRows?nAbsRows-1:0}個请假记录`);

    // Get details of 请假记录
    for (let r=2; r <= nAbsRows; r++) {
    //for (let r=2; r <= nAbsRows && r<=4; r++) {//DEBUG: Only get 3 of them.
      const tds = await page.frame({name: 'TargetContent'}).locator(`table.PSLEVEL1GRID tr:nth-child(${r}) td`).elementHandles();
      const 假别名称 = await tds[0].innerText().then(t=>t.trim());  // 特休假
      const 状态 = await tds[1].innerText().then(t=>t.trim());      // 已批准
      const 开始日期 = await tds[2].innerText().then(t=>t.trim());  // 2021/09/30
      const 结束日期 = await tds[3].innerText().then(t=>t.trim());  // 2021/09/30
      const 总计时数0 = await tds[4].innerText().then(t=>t.trim()); // 8 小时
      let 总计时数 = '???';
      const tmpHr = /(.*?) 小时/.exec(总计时数0);
      if ( tmpHr ) {
        总计时数 = tmpHr[1];
      }
      const 申请人 = await tds[5].innerText().then(t=>t.trim());    // 员工申请

      await page.frame({name: 'TargetContent'}).click(`table.PSLEVEL1GRID tr:nth-child(${r}) td:nth-child(1) a`);

      // Get the desired iframe name
      const frnm = await new Promise(resolve => {
        const frmnvg = frame => {
          frame.frameElement().then(ele => {
            ele.getAttribute("name").then(fn => {
              if ( fn.indexOf("ptModFrame_") === 0 ) {
                page.removeListener('framenavigated', frmnvg);
                resolve(fn);
              }
            });
          });
        };
        page.on('framenavigated', frmnvg);
      });

      const who = await page.frame({name: frnm}).innerText(`#PERSON_NAME_NAME`).then(t=>t.trim());  // 张翀 (JACK C ZHANG)
      const 假别名称1 = await page.frame({name: frnm}).innerText(`#DERIVED_ABS_SS_PIN_TAKE_NUM`).then(t=>t.trim()); // 特休假
      const 开始日期1 = await page.frame({name: frnm}).innerText(`#DERIVED_ABS_SS_BGN_DT`).then(t=>t.trim());       // 2021/09/13
      const 开始时间 = await page.frame({name: frnm}).innerText(`#Z_DERIVED_ABS_S_START_TIME`).then(t=>t.trim());   // 08:20
      const 结束日期1 = await page.frame({name: frnm}).innerText(`#DERIVED_ABS_SS_END_DT`).then(t=>t.trim());       // 2021/09/14
      const 结束时间 = await page.frame({name: frnm}).innerText(`#Z_DERIVED_ABS_S_END_TIME`).then(t=>t.trim());     // 17:20
      assert(employeeName===who, `who "${employeeName}" !== "${who}"`);
      assert(假别名称===假别名称1, `假别名称 "${假别名称}" !== "${假别名称1}"`);
      assert(开始日期===开始日期1, `开始日期 "${开始日期}" !== "${开始日期1}"`);
      assert(结束日期===结束日期1, `结束日期 "${结束日期}" !== "${结束日期1}"`);

      const 代理人 = await page.frame({name: frnm}).innerText(`#Z_PERS_SRCH_DEP_NAME_DISPLAY`).then(t=>t.trim());   // 庞美静 (TINA MJ PANG)
      const 理由 = await page.frame({name: frnm}).innerText(`#DERIVED_ABS_SS_COMMENTS`).then(t=>t.replace(/\n/g, ' ').trim()); // 家中有事

      // Get 签核历程
      let a1 = "" // Applicant time
      , a2 = ""   // Proxy time
      , a3 = "";  // Approver time
      const nApvCnt = await page.frame({name: frnm}).locator("table[id='tdgbrZ_GP_ABS_SS_STA$0'] tr").count();
      //console.log(`TA有${nApvCnt}個签核历程`);
      if (nApvCnt === 3) {
        a1 = await page.frame({name: frnm}).innerText("table[id='tdgbrZ_GP_ABS_SS_STA$0'] tr:nth-child(1) td:nth-child(4)").then(t=>t.trim());
        a2 = await page.frame({name: frnm}).innerText("table[id='tdgbrZ_GP_ABS_SS_STA$0'] tr:nth-child(2) td:nth-child(4)").then(t=>t.trim());
        a3 = await page.frame({name: frnm}).innerText("table[id='tdgbrZ_GP_ABS_SS_STA$0'] tr:nth-child(3) td:nth-child(4)").then(t=>t.trim());
      }

      fo.write(`${申请人},${did},${eid},${employeeName},${假别名称},${开始日期},${开始时间},${结束日期},${结束时间},${总计时数},${代理人},${理由},${状态},${a1},${a2},${a3}\r\n`);
      await page.frame({name: frnm}).click(`a[id="DERIVED_ABS_SS_LINK"]`);  // 返回请假纪录
      t1 = new Date(); console.log('返回请假纪录 begin', t1);
      while ( page.frame({name: frnm}) ) {
        await page.waitForTimeout(500);
      }
      t2 = new Date(); console.log('返回请假纪录 end  ', t2, t2-t1);
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
    let t1 = new Date(); console.log(`${subs[row-1].name} 选择 begin`, t1);
    await page.frame({name: 'TargetContent'}).click(`table.PSLEVEL1GRID tr:nth-child(${row+1}) td:nth-child(1) input`);  // input:has-text("选择")
    await page.waitForEvent('requestfinished');
    let t2 = new Date(); console.log(`${subs[row-1].name} 选择 end  `, t2, t2-t1);
    await GetLeaveRecords(subs[row-1].did, subs[row-1].eid, subs[row-1].name);
    //await page.frame({name: 'TargetContent'}).click('a[id="DERIVED_ABS_SS_BACK"]'); //click('text=返回到“直接报告者”');
    await page.goto(lrq);

    if ( subs[row-1].mgr ) {
      let l2Cnt = null;  // 直接下属的下属人数
      let l2Idx = null;
      do {
        t1 = new Date(); console.log(`${subs[row-1].name} 展开 begin`, t1);
        await page.frame({name: 'TargetContent'}).click(`table.PSLEVEL1GRID tr:nth-child(${row+1}) td:nth-child(2) a`); // 展开
        await page.waitForEvent('requestfinished');
        t2 = new Date(); console.log(`${subs[row-1].name} 展开 end  `, t2, t2-t1);
        const nRows2 = await page.frame({name: 'TargetContent'}).locator("table.PSLEVEL1GRID tr").count();
        const tmpCnt = nRows2 - nRows;
        if ( l2Cnt === null ) {
          l2Cnt = tmpCnt;
          l2Idx = 1;
          //l2Idx = 3;  //DEBUG
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
        t1 = new Date(); console.log(`${name} 选择 begin`, t1);
        await page.waitForEvent('requestfinished');
        t2 = new Date(); console.log(`${name} 选择 end  `, t2, t2-t1);
        await GetLeaveRecords(did, eid, name);
        //await page.frame({name: 'TargetContent'}).click('a[id="DERIVED_ABS_SS_BACK"]'); //click('text=返回到“直接报告者”');
        await page.goto(lrq);
        //if ( l2Idx === 3 ) l2Idx = l2Cnt-1;  //DEBUG
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