// FLYPAD document layouts. Flight records and calculations stay in app.js.
// Each function returns A4 canvases; the Scriptable launcher stores them as PDFs.
(function (root) {
  'use strict';
  const W = 1240, H = 1754, M = 58, CW = W - 2 * M, LIMIT = 1570;
  let currentCompany = 'FLYGER AVIATION SERVICES', currentContacts = {}, currentDesign = {}, currentStamp = null, currentSignature = null, currentFooterLogo = null;
  const NAVY = '#244354', TEAL = '#496D6B', PALE = '#EAF2F5', INK = '#172B35', GRAY = '#586A72';
  const A = x => Array.isArray(x) ? x : [];
  const S = x => x == null ? '' : String(x);
  const U = x => S(x).toUpperCase();
  const N = x => Number(x) || 0;
  const amt = x => N(x).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const date = x => { const s = S(x); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.slice(8) + ' ' + s.slice(5, 7) + ' ' + s.slice(0, 4) : s; };
  const person = (r, people) => {
    const p = A(people).find(x => x.id === r.personId) || r || {};
    const pass = A(p.passports)[0] || {};
    return {name: U(p.name || 'PERSON'), role: U(r.role || p.role), dob: date(p.dateOfBirth), nationality: U(p.nationalityCode || p.nationality), passport: U(pass.number)};
  };
  const route = l => [l.arrivingFrom, l.handlingStation, l.departingTo].filter(Boolean).join(' - ');
  const used = s => U(s.status) === 'USED';
  const sellingRate = s => s.chargeAmount !== '' && s.chargeAmount != null ? s.chargeAmount : s.sellingAmount !== '' && s.sellingAmount != null ? s.sellingAmount : null;
  const charges = (l, estimate) => A(l.services).filter(s => estimate ? !['CANCELLED', 'NOT USED'].includes(U(s.status)) : used(s));
  function operationHeader(d,f,l){
    d.fields([['Operator',f.operator],['A/C regtn',f.aircraftRegistration],['Flight no',l.departureFlight||l.arrivalFlight||f.flightNumber],['Handling stn',l.handlingStation],['Arr from / date',U(l.arrivingFrom)+' / '+date(l.arrivalDate)],['Dep to / date',U(l.departingTo)+' / '+date(l.departureDate)]],3);
  }

  class Sheet {
    constructor(title, ref, logo, subtitle) { this.title = title; this.ref = ref; this.logo = logo; this.subtitle = subtitle || ''; this.pages = []; this.newPage(); }
    newPage() {
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
      const c = canvas.getContext('2d'); c.fillStyle = 'white'; c.fillRect(0, 0, W, H);
      c.fillStyle = this.title === 'GENERAL DECLARATION' ? NAVY : (currentDesign.headerColor || NAVY); c.fillRect(0, 0, W, 160);
      c.fillStyle = currentDesign.headerTextColor || '#FFFFFF'; c.font = 'bold 24px sans-serif'; c.fillText(U(currentCompany).slice(0, 48), M, 63);
      c.font = '18px sans-serif'; c.fillText('FLYPAD  /  FLIGHT OPERATIONS', M, 102);
      if (this.logo && ['HEADER','BOTH'].includes(currentDesign.logoPosition||'HEADER')) { const k = Math.min(160 / this.logo.width, 115 / this.logo.height); c.fillStyle = '#FFFFFF'; c.fillRect(W - M - 195, 22, 195, 125); c.drawImage(this.logo, W - M - 177, 28, this.logo.width * k, this.logo.height * k); }
      c.fillStyle = INK; c.font = 'bold 34px sans-serif'; c.fillText(this.title, M, 224);
      c.fillStyle = GRAY; c.font = '18px sans-serif'; c.fillText(this.subtitle, M, 258);
      c.textAlign = 'right'; c.fillText('REF  ' + U(this.ref || 'DRAFT'), W - M, 258); c.textAlign = 'left';
      this.canvas = canvas; this.c = c; this.y = 298; this.pages.push(canvas);
    }
    ensure(h) { if (this.y + h > LIMIT) this.newPage(); }
    wrap(text, width, font = '20px sans-serif') {
      const c = this.c; c.font = font; const result = [];
      S(text).split('\n').forEach(part => {
        let line = '';
        part.split(/\s+/).filter(Boolean).forEach(word => {
          const trial = line ? line + ' ' + word : word;
          if (c.measureText(trial).width <= width) { line = trial; return; }
          if (line) result.push(line); line = '';
          if (c.measureText(word).width <= width) { line = word; return; }
          let chunk = '';
          for (const ch of word) { if (chunk && c.measureText(chunk + ch).width > width) { result.push(chunk); chunk = ''; } chunk += ch; }
          line = chunk;
        });
        result.push(line);
      });
      return result.length ? result : [''];
    }
    titleBar(label) { this.ensure(110); const c = this.c; c.fillStyle = PALE; c.fillRect(M, this.y, CW, 43); c.fillStyle = NAVY; c.font = 'bold 19px sans-serif'; c.fillText(U(label), M + 12, this.y + 28); this.y += 49; }
    fields(pairs, cols = 2) {
      const c = this.c, w = CW / cols, rowHeights=[];
      pairs.forEach(([label,value],i)=>{const lines=this.wrap(U(value||'—'),w-28,'bold 19px sans-serif');rowHeights[Math.floor(i/cols)]=Math.max(rowHeights[Math.floor(i/cols)]||0,Math.max(66,43+lines.length*22));});
      rowHeights.forEach((height,row)=>{
        this.ensure(height+3);const y=this.y;
        pairs.slice(row*cols,(row+1)*cols).forEach(([label,value],j)=>{const x=M+j*w;c.strokeStyle='#CBD8DE';c.lineWidth=1;c.strokeRect(x,y,w,height);c.fillStyle=GRAY;c.font='14px sans-serif';c.fillText(U(label),x+12,y+22);c.fillStyle=INK;c.font='bold 19px sans-serif';this.wrap(U(value||'—'),w-28,'bold 19px sans-serif').forEach((line,k)=>c.fillText(line,x+12,y+46+k*22));});
        this.y+=height+3;
      }); this.y+=5;
    }
    note(text, color = GRAY) {
      const lines = this.wrap(text, CW - 20, '18px sans-serif'), h = 5 + lines.length * 23;
      this.ensure(h); this.c.fillStyle = color; this.c.font = '18px sans-serif';
      lines.forEach((line, i) => this.c.fillText(line, M + 8, this.y + 20 + i * 23)); this.y += h;
    }
    table(headers, rows, widths) {
      const actual = rows.length ? rows : [['—']];
      const header = () => { this.ensure(46); const c = this.c; c.fillStyle = NAVY; c.fillRect(M, this.y, CW, 44); c.fillStyle = 'white'; c.font = 'bold 16px sans-serif'; let x = M; headers.forEach((v, i) => {c.fillText(U(v), x + 10, this.y + 28); x += widths[i];}); this.y += 44; };
      header();
      actual.forEach((row, ri) => {
        const wrapped = headers.map((_, i) => this.wrap(S(row[i] ?? ''), widths[i] - 20, '18px sans-serif'));
        const h = Math.max(44, 14 + Math.max(...wrapped.map(x => x.length)) * 25);
        if (this.y + h > LIMIT) { this.newPage(); header(); }
        const c = this.c; c.fillStyle = ri % 2 ? 'white' : '#F3F7F8'; c.fillRect(M, this.y, CW, h);
        c.strokeStyle = '#D4E0E4'; c.beginPath(); c.moveTo(M, this.y + h); c.lineTo(M + CW, this.y + h); c.stroke();
        c.fillStyle = INK; c.font = '18px sans-serif'; let x = M;
        wrapped.forEach((lines, i) => { lines.forEach((line, j) => c.fillText(line, x + 10, this.y + 29 + j * 25)); x += widths[i]; });
        this.y += h;
      }); this.y += 16;
    }
    signatures(labels) {
      this.ensure(132); const c = this.c, w = CW / labels.length;
      labels.forEach((label, i) => { const x = M + i * w; c.strokeStyle = GRAY; c.beginPath(); c.moveTo(x + 10, this.y + 76); c.lineTo(x + w - 20, this.y + 76); c.stroke(); c.fillStyle = GRAY; c.font = '16px sans-serif'; c.fillText(U(label), x + 10, this.y + 103); });
      this.y += 132;
    }
    finish() {
      const contacts=currentContacts||{},order=[...new Set([...(Array.isArray(currentDesign.footerOrder)?currentDesign.footerOrder:[]),...Object.keys(contacts)])];
      const labels={address:'ADDRESS',telephone:'TEL',mobile:'MOBILE',fax:'FAX',poBox:'PO BOX',email:'EMAIL',web:'WEB',arinc:'ARINC',sita:'SITA'};
      const detail=order.filter(k=>contacts[k]&&currentDesign.footerVisible?.[k]!==false).map(k=>(labels[k]||U(k))+' '+S(contacts[k])).join('  ·  ');
      this.pages.forEach((canvas,i)=>{
        const c=canvas.getContext('2d'),footer=currentFooterLogo;
        const available=CW-(footer?174:0)-70;const lines=detail?this.wrap(detail,available,'14px sans-serif'):['PREPARED FROM THE SAVED FLIGHT RECORD · REVIEW BEFORE ISSUE'];
        if(lines.length>6)throw Error('FOOTER DETAILS EXCEED PRINT AREA. HIDE OR SHORTEN CONTACT ITEMS.');
        c.fillStyle=currentDesign.footerColor||PALE;c.fillRect(0,1604,W,150);
        c.strokeStyle='#CBD8DE';c.beginPath();c.moveTo(M,1604);c.lineTo(W-M,1604);c.stroke();
        c.fillStyle=currentDesign.footerTextColor||INK;c.font='14px sans-serif';lines.forEach((line,j)=>c.fillText(line,M,1633+j*20));
        if(footer&&footer.width&&footer.height){const k=Math.min(140/footer.width,92/footer.height);c.drawImage(footer,W-M-188,1619,footer.width*k,footer.height*k)}
        c.textAlign='right';c.fillText((i+1)+' / '+this.pages.length,W-M,1732);c.textAlign='left';
      });return this.pages;
    }
  }

  function invoice(f, l, n, logo, kind) {
    if(kind === 'CREDIT HANDLING SHEET'){
      const d=new Sheet('CREDIT HANDLING SHEET',f.tripNumber,logo,'LEG '+(n+1)+' / '+U(l.handlingStation));
      operationHeader(d,f,l);d.titleBar('Services provided');
      const services=A(l.services).filter(x=>U(x.required)!=='NO'&&U(x.status)!=='NOT USED');
      if(!services.length)d.note('NO SERVICES LISTED');
      services.forEach((item,i)=>{const lines=d.wrap(U(item.description||'SERVICE'),CW-95,'19px sans-serif'),h=Math.max(53,24+lines.length*23);d.ensure(h);const c=d.c,y=d.y;c.strokeStyle='#879ba4';c.strokeRect(M+12,y+11,25,25);c.fillStyle=INK;c.font='19px sans-serif';lines.forEach((v,j)=>c.fillText(v,M+54,y+31+j*23));c.strokeStyle='#D4E0E4';c.beginPath();c.moveTo(M,y+h);c.lineTo(W-M,y+h);c.stroke();d.y+=h;});
      d.ensure(235);d.titleBar('Acknowledgement');d.ensure(180);
      const c=d.c,w=CW/2,y=d.y;
      [['HANDLING AGENT','Name and designation'],['CREW REPRESENTATIVE','Name and role']].forEach(([title,detail],i)=>{const x=M+i*w;c.fillStyle=NAVY;c.font='bold 17px sans-serif';c.fillText(title,x+8,y+23);c.strokeStyle=GRAY;c.beginPath();c.moveTo(x+8,y+76);c.lineTo(x+w-25,y+76);c.moveTo(x+8,y+141);c.lineTo(x+w-25,y+141);c.stroke();c.fillStyle=GRAY;c.font='14px sans-serif';c.fillText(U(detail),x+8,y+96);c.fillText('SIGNATURE',x+8,y+160)});d.y+=180;
      return d.finish();
    }
    const estimate = kind === 'INVOICE / PROFORMA', type = kind === 'CASH INVOICE' ? 'CASH INVOICE' : estimate ? 'PROFORMA INVOICE' : 'CREDIT HANDLING SHEET';
    const d = new Sheet(type, f.tripNumber, logo, 'LEG ' + (n + 1) + '  /  ' + U(l.handlingStation) + '  /  ' + date(l.departureDate || l.arrivalDate));
    operationHeader(d,f,l);
    d.fields([['Trip / invoice reference', f.tripNumber], ['Payment method', l.paymentMethod || (estimate ? 'TO BE CONFIRMED' : '')]]);
    d.titleBar(estimate ? 'Estimated services and rates' : 'Services provided and rates');
    const services = charges(l, estimate), totals = {};
    const rows = services.map(s => {const cur=U(s.sellingCurrency || 'AED'), qty=N(s.quantity), raw=sellingRate(s), priced=raw!==null && Number.isFinite(Number(raw)), rate=priced?Number(raw):0;
      const tax=Math.max(0,N(s.taxPercentage)),net=qty*rate,taxValue=net*tax/100;
      if(priced){const total=totals[cur]||(totals[cur]={net:0,tax:0});total.net+=net;total.tax+=taxValue}
      return [U(s.description),S(qty),U(s.unit||'EA'),priced?cur+' '+amt(rate):'',priced?amt(tax)+'% / '+amt(taxValue):'',priced?cur+' '+amt(net+taxValue):''];
    });
    d.table(['Service','Qty','Unit','Rate','Tax / amount','Total incl tax'],rows.length?rows:[['NO SERVICES SELECTED FOR THIS DOCUMENT','','','','','']],[332,70,90,195,195,242]);
    d.titleBar('Totals by currency');
    d.table(['Currency','Subtotal','Tax','Total incl tax'],Object.keys(totals).sort().map(cur=>[cur,amt(totals[cur].net),amt(totals[cur].tax),amt(totals[cur].net+totals[cur].tax)]),[205,275,275,369]);
    d.note(estimate?'This is an electronically generated proforma invoice. No signature or stamp is required.':'This is an electronically generated invoice. No signature or stamp is required.');
    return d.finish();
  }

  function declaration(f,l,n,people,logo,outward){
    const label=outward?'OUTWARD':'INWARD',dep=U(outward?l.handlingStation:l.arrivingFrom),arr=U(outward?l.departingTo:l.handlingStation);
    const crew=A(outward?l.departureCrew:l.arrivalCrew).map(r=>person(r,people)),pax=A(outward?l.departurePassengers:l.arrivalPassengers).map(r=>person(r,people));
    const entries=[...crew.map(p=>({kind:'CREW',p})),...(pax.length?[{kind:'PASSENGER HEADER'},...pax.map(p=>({kind:'PAX',p}))]:[]),{kind:'ARRIVAL'}],chunks=[];
    const measure=document.createElement('canvas').getContext('2d');
    const wrap=(value,width,size,bold=false)=>{measure.font=(bold?'600 ':'400 ')+size+'px Arial, Helvetica, sans-serif';const result=[];let line='';for(const word of U(value).split(/\s+/)){if(!word)continue;const next=line?line+' '+word:word;if(measure.measureText(next).width<=width){line=next;continue}if(line){result.push(line);line=''}if(measure.measureText(word).width<=width){line=word;continue}let part='';for(const char of word){if(measure.measureText(part+char).width>width){result.push(part);part=''}part+=char}line=part}if(line)result.push(line);if(result.length>3)throw Error('GENERAL DECLARATION ENTRY NEEDS A SUPPLEMENTARY ROSTER: '+U(value));return result.length?result:['']};
    entries.forEach(item=>{if(item.p){const p=item.p;item.cells=[wrap(p.name+(p.role?' / '+p.role:''),298,13,true),wrap(p.dob,109,12),wrap(p.nationality,94,13),wrap(p.passport,197,12)];item.height=Math.max(27,Math.max(...item.cells.map(x=>x.length))*17+7)}else item.height=27});
    let group=[],usedHeight=0;for(const item of entries){if(group.length&&usedHeight+item.height>500){chunks.push(group);group=[];usedHeight=0}group.push(item);usedHeight+=item.height}if(group.length)chunks.push(group);
    const pages=[];
    chunks.forEach((part,pageIndex)=>{
      const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,W,H);
      const stroke='#34434a',left=M,right=W-M,routeRight=885,top=483;
      const text=(value,x,y,size=16,bold=false)=>{c.fillStyle=INK;c.font=(bold?'600 ':'400 ')+size+'px Arial, Helvetica, sans-serif';c.fillText(U(value),x,y)};
      const rule=(x1,y1,x2,y2)=>{c.strokeStyle=stroke;c.lineWidth=1;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
      const box=(x,y,w,h)=>{c.strokeStyle=stroke;c.lineWidth=1;c.strokeRect(x,y,w,h)};
      c.textAlign='center';text('GENERAL DECLARATION',W/2,74,29,true);text('('+label+')',W/2,143,23,true);c.textAlign='left';text('VER-01',M,125,11,true);
      if(logo&&logo.width&&logo.height){const k=Math.min(130/logo.width,80/logo.height);c.drawImage(logo,W-M-150,30,logo.width*k,logo.height*k)}
      const field=(name,value,x,y,width)=>{text(name,x,y+22,13,true);box(x+215,y,width,45);text(value||'—',x+227,y+29,17,true)};
      field('OPERATOR',f.operator,M,171,260);field('DATE',date(outward?l.departureDate:l.arrivalDate),630,171,292);
      field('MARKS OF NATIONALITY',f.aircraftRegistration,M,231,260);field('FLIGHT NUMBER',outward?l.departureFlight:l.arrivalFlight,630,231,292);
      field('DEPARTURE FROM',dep,M,291,260);field('ARRIVAL AT',arr,630,291,292);
      rule(left,370,right,370);text('FLIGHT ROUTING',left+3,394,15,true);
      text('("Place" column always lists origin, every en-route stop and destination)',left+3,417,12);
      box(left,431,right-left,552);rule(routeRight,431,routeRight,983);rule(left,top,routeRight,top);
      const widths=[left,left+120,left+435,left+560,left+670,routeRight];for(const x of widths.slice(1,-1))rule(x,431,x,983);
      [['PLACE',left+12],['NAMES OF CREW / PASSENGERS',left+129],['D.O.B.',left+444],['NATIONALITY',left+568],['PASSPORT',left+679]].forEach(([v,x])=>text(v,x,462,11,true));
      let rowY=top;part.forEach((item,i)=>{const y=rowY;rowY+=item.height;rule(left,rowY,routeRight,rowY);if(item.kind==='PASSENGER HEADER'){c.fillStyle='#eef3f5';c.fillRect(left+1,y+1,routeRight-left-2,item.height-2);c.textAlign='center';text('PASSENGER LIST',(left+routeRight)/2,y+19,14,true);c.textAlign='left'}else if(item.kind==='ARRIVAL'){text(arr,left+24,y+19,14,true)}else{if(i===0&&pageIndex===0)text(dep,left+12,y+19,14,true);[[left+128,13,true],[left+442,12,false],[left+567,13,false],[left+679,12,false]].forEach(([x,size,bold],col)=>item.cells[col].forEach((v,j)=>text(v,x,y+18+j*17,size,bold)))}});
      text('NUMBER OF PASSENGERS',routeRight+12,458,14);text('ON THIS STAGE**',routeRight+12,477,13);
      text('DEPARTURE PLACE  '+dep,routeRight+12,520,13);text('EMBARKING:  '+pax.length,routeRight+12,561,13);
      text('THROUGH ON SAME FLIGHT:  0',routeRight+12,661,12);
      text('ARRIVAL PLACE  '+arr,routeRight+12,747,13);text('DISEMBARKING:  '+pax.length,routeRight+12,790,13);
      text('THROUGH ON SAME FLIGHT:  0',routeRight+12,900,12);
      box(left,983,right-left,340);rule(routeRight,983,routeRight,1323);text('DECLARATION OF HEALTH*',left+5,1007,15,true);text('FOR OFFICIAL USE ONLY',routeRight+8,1007,13,true);
      const health=['PERSONS ON BOARD WITH ILLNESSES OTHER THAN AIRSICKNESS OR THE EFFECTS OF','ACCIDENTS, INCLUDING SYMPTOMS OR SIGNS OF ILLNESS: __________________','OTHER CONDITIONS WHICH MAY LEAD TO SPREAD OF DISEASE: ______________','DISINFECTING OR SANITARY TREATMENT (PLACE, DATE, TIME, METHOD): ______'];
      health.forEach((v,i)=>text(v,left+5,1043+i*35,12));
      text('SIGNED, IF REQUIRED, WITH TIME AND DATE: _________________________',left+5,1244,12);
      text('CREW MEMBER CONCERNED',left+250,1298,12);
      box(left,1323,right-left,369);
      const declarationLines=['I DECLARE THAT ALL STATEMENTS AND PARTICULARS CONTAINED IN THIS GENERAL','DECLARATION, AND IN ANY SUPPLEMENTARY FORMS, ARE COMPLETE, EXACT AND TRUE','TO THE BEST OF MY KNOWLEDGE, AND THAT THROUGH PASSENGERS WILL CONTINUE.'];
      declarationLines.forEach((v,i)=>text(v,left+5,1350+i*25,12));
      text('SIGNATURE',left+385,1456,15,true);rule(887,1503,right-9,1503);
      const mm=Number(l.gdStampWidthMm||currentDesign.gdStampWidthMm)||48;
      if(currentStamp&&currentStamp.width&&currentStamp.height){const width=Math.min(70,Math.max(25,mm))*W/210,scale=Math.min(width/currentStamp.width,120/currentStamp.height);c.drawImage(currentStamp,right-10-currentStamp.width*scale,1513,currentStamp.width*scale,currentStamp.height*scale)}
      if(currentSignature&&currentSignature.width&&currentSignature.height){const k=Math.min(210/currentSignature.width,58/currentSignature.height);c.drawImage(currentSignature,655,1435,currentSignature.width*k,currentSignature.height*k)}
      text('AUTHORIZED AGENT OR PILOT-IN-COMMAND',903,1658,11);
      text('*TO BE COMPLETED ONLY WHEN REQUIRED BY THE STATE.',left+4,1610,11);
      text('**NOT TO BE COMPLETED WHEN PASSENGER MANIFESTS ARE PRESENTED, IF REQUIRED BY THE STATE.',left+4,1636,10);
      if(pageIndex<chunks.length-1)text('ROSTER CONTINUES ON NEXT PAGE',left+4,1676,11,true);
      text((pageIndex+1)+' / '+chunks.length,right-45,1726,13);
      pages.push(canvas);
    });
    return pages;
  }

  function checklist(f,l,n,logo){
    const d=new Sheet('GROUND SERVICE CHECKLIST',f.tripNumber,logo,'LEG '+(n+1)+'  /  '+U(l.handlingStation));
    operationHeader(d,f,l);
    d.titleBar('Required and used services');
    const services=A(l.services).filter(s=>U(s.status)!=='CANCELLED');
    d.table(['Phase','Service','Required','Used status','Qty'],services.map(s=>[U(s.phase),U(s.description),U(s.required||'YES'),U(s.status||'PENDING'),S(s.quantity||'')+' '+U(s.unit||'')]),[150,472,150,190,162]);
    d.titleBar('Completion and remarks');d.note('ALL REQUIRED SERVICES RENDERED   [  ] YES   [  ] NO   [  ] PENDING');
    d.note('REMARKS  '+U(l.remarks||'____________________________________________________________________________'));
    d.fields([['Arrival handler',(l.arrival_handler||{}).name],['Departure handler',(l.departure_handler||{}).name]]);
    d.y+=30;d.signatures(['Station representative','Customer / crew representative']);return d.finish();
  }
  function quality(f,l,n,logo){
    const d=new Sheet('QUALITY OF SERVICE',f.tripNumber,logo,'CUSTOMER QUESTIONNAIRE  /  LEG '+(n+1));
    operationHeader(d,f,l);
    d.note('Your feedback helps us improve our service. Please tick one answer for each question.');
    d.titleBar('Customer feedback');
    const rows=[
      ['Representative response',['Promptly','Good','Very good']],
      ['Equipment performance',['Good','Sufficient','Not good']],
      ['Handling smoothness',['Very good','Smooth','Rough']],
      ['All required services rendered?',['Yes','No - please specify']],
      ['Service on time?',['Yes','No - please specify']],
      ['Flight plan / weather NOTAM support',['Efficient','Inefficient','N/A']],
      ['Fueling on time?',['Yes','No','N/A']],
      ['Handling in general',['Excellent','Fair','Needs review']]
    ];
    rows.forEach(([label,answers],i)=>{d.ensure(82);const c=d.c,y=d.y;c.fillStyle=i%2?'#FFFFFF':'#F3F7F8';c.fillRect(M,y,CW,76);c.fillStyle=INK;c.font='bold 16px sans-serif';c.fillText(U(label),M+12,y+24);c.font='16px sans-serif';let x=M+12;answers.forEach(a=>{c.strokeStyle=TEAL;c.strokeRect(x,y+39,21,21);c.fillText(U(a),x+29,y+57);x+=Math.min(360,Math.max(220,Math.ceil(c.measureText(U(a)).width)+65))});d.y+=82});
    d.titleBar('Comments and remarks');d.note('____________________________________________________________________________________________');d.note('____________________________________________________________________________________________');
    d.ensure(260);d.y+=110;d.signatures(['Customer / crew representative','Station representative']);return d.finish();
  }

  function handling(f,l,n,logo){
    const d=new Sheet('HANDLING CONFIRMATION',f.tripNumber,logo,'LEG '+(n+1)+'  /  '+U(l.handlingStation));
    d.fields([['Operator',f.operator],['Aircraft',U(f.aircraftRegistration)+' / '+U(f.aircraftType)],['Trip reference',f.tripNumber],['Route',route(l)],['Arrival',date(l.arrivalDate)+'  '+U(l.scheduledArrival)+' UTC'],['Departure',date(l.departureDate)+'  '+U(l.scheduledDeparture)+' UTC']]);
    d.titleBar('Full trip itinerary · UTC');const sectors=A(f.sectors);d.table(['Leg','Flight no','Dep from','Date + time','Arr to','Date + time'],sectors.map((s,i)=>[S(i+1),U(s.flightNumber||f.flightNumber),U(s.from),date(s.departureDate)+' '+U(s.etd),U(s.to),date(s.arrivalDate)+' '+U(s.eta)]),[65,145,145,245,145,379]);d.titleBar('Your station · '+U(l.handlingStation));d.fields([['Arrival from',U(l.arrivingFrom)+' / '+date(l.arrivalDate)+' '+U(l.scheduledArrival)+' UTC'],['Departure to',U(l.departingTo)+' / '+date(l.departureDate)+' '+U(l.scheduledDeparture)+' UTC'],['Crew arrival / departure',A(l.arrivalCrew).length+' / '+A(l.departureCrew).length],['Passengers arrival / departure',A(l.arrivalPassengers).length+' / '+A(l.departurePassengers).length]]);d.titleBar('Requirements for '+U(l.handlingStation)+' only');d.note(U(l.handlingRequirements||'NO STATION INSTRUCTIONS ENTERED'),INK);d.titleBar('Handling acknowledgement');
    d.note('It is our pleasure to acknowledge your handling request for the flight shown above. We are glad to support this operation at '+U(l.handlingStation)+'.',INK);
    d.note('Our operations team is available 24 hours a day, 7 days a week. Please contact us if the schedule or requirements change.');
    d.titleBar('Contact details');
    d.fields([['Mobile',currentContacts.mobile],['Telephone',currentContacts.telephone],['Email',currentContacts.email],['SITA',currentContacts.sita]]);
    d.note('ARRIVAL HANDLER / STAFF  '+U((l.arrival_handler||{}).name));d.note('DEPARTURE HANDLER / STAFF  '+U((l.departure_handler||{}).name));
    d.signatures(['Handling agent','Station representative']);return d.finish();
  }

  function itinerary(f,logo){
    const sectors=A(f.sectors),legs=A(f.legs),d=new Sheet('TRIP ITINERARY',f.tripNumber,logo,'FULL TRIP  /  ALL TIMES UTC');
    const minutes=(day,time)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(S(day))||!/^([01]\d|2[0-3])[0-5]\d$/.test(S(time)))return null;const stamp=new Date(day+'T'+time.slice(0,2)+':'+time.slice(2)+':00Z');return Number.isFinite(stamp.getTime())&&stamp.toISOString().slice(0,10)===day?stamp.getTime()/60000:null};
    const hours=m=>Math.floor(m/60)+'H '+S(m%60).padStart(2,'0')+'M';
    d.fields([['Trip reference',f.tripNumber],['Operator',f.operator],['Aircraft registration',f.aircraftRegistration],['Aircraft type',f.aircraftType],['Flight number',f.flightNumber],['Purpose',f.purpose]]);
    d.titleBar('Sector schedule');
    let total=0,complete=0;
    const rows=sectors.map((s,i)=>{const start=minutes(s.departureDate,s.etd),end=minutes(s.arrivalDate,s.eta),valid=start!==null&&end!==null&&end>=start;if(valid){total+=end-start;complete++}return [S(i+1)+' / '+U(s.flightNumber||f.flightNumber),U(s.from),date(s.departureDate)+'  '+U(s.etd),U(s.to),date(s.arrivalDate)+'  '+U(s.eta),valid?hours(end-start):'PENDING']});
    d.table(['Sector / flight','From','Departure UTC','To','Arrival UTC','Flight time'],rows.length?rows:[['NO SECTORS SAVED','','','','','']],[200,105,245,105,245,224]);
    d.titleBar('Trip breakdown');
    d.fields([['Sectors',sectors.length],['Handling legs',legs.length],['Scheduled flight hours',hours(total)],['Time data complete',complete+' / '+sectors.length+' SECTORS']]);
    d.note('TOTAL FLIGHT HOURS SUMS SECTOR DEPARTURE TO ARRIVAL. GROUND TIME IS EXCLUDED. PENDING SECTORS ARE EXCLUDED FROM THE TOTAL.');
    d.titleBar('Handling stations');
    d.table(['Leg','Station','Arrival from / date UTC','Departure to / date UTC'],legs.map((l,i)=>[i+1,U(l.handlingStation),U(l.arrivingFrom)+' / '+date(l.arrivalDate)+' '+U(l.scheduledArrival),U(l.departingTo)+' / '+date(l.departureDate)+' '+U(l.scheduledDeparture)]),[100,180,422,422]);
    return d.finish();
  }

  function report(f,logo){
    const d=new Sheet('FLIGHT REPORT',f.tripNumber,logo,'TRIP SUMMARY  /  '+A(f.legs).length+' LEG(S)');
    d.fields([['Trip number',f.tripNumber],['Operator',f.operator],['Aircraft',U(f.aircraftRegistration)+' / '+U(f.aircraftType)],['Purpose',f.purpose],['Prepared by',f.preparedBy],['Flight number',f.flightNumber]]);
    if(A(f.sectors).length){d.titleBar('Full route / sector schedule');d.table(['Flight number','From','Departure / ETD UTC','To','Arrival / ETA UTC'],A(f.sectors).map(s=>[U(s.flightNumber||f.flightNumber),U(s.from),date(s.departureDate)+' / '+U(s.etd),U(s.to),date(s.arrivalDate)+' / '+U(s.eta)]),[230,120,325,120,329]);}
    const overallBuy={},overallPaid={},overallSell={},overallTax={};
    A(f.legs).forEach((l,i)=>{
      d.titleBar('Leg '+(i+1)+' / '+route(l));
      d.fields([['Arrival flight / date',U(l.arrivalFlight)+' / '+date(l.arrivalDate)],['STA / touchdown / chocks on',[l.scheduledArrival,l.touchdown,l.onBlocks].map(U).join(' / ')+' UTC'],['Departure flight / date',U(l.departureFlight)+' / '+date(l.departureDate)],['STD / chocks off / airborne',[l.scheduledDeparture,l.offBlocks,l.airborne].map(U).join(' / ')+' UTC'],['Crew in / out',N(l.crewIn)+' / '+N(l.crewOut)],['Passengers in / out',N(l.paxIn)+' / '+N(l.paxOut)]]);
      const buy={},paid={},sell={},taxes={};
      const rows=A(l.services).map(s=>{const qty=N(s.quantity),buyCur=U(s.costCurrency||'AED'),buyRate=N(s.expenseAmount??s.costAmount),raw=sellingRate(s),priced=raw!==null&&Number.isFinite(Number(raw)),sellCur=U(s.sellingCurrency||'AED'),sellRate=priced?Number(raw):0;
        buy[buyCur]=(buy[buyCur]||0)+qty*buyRate;overallBuy[buyCur]=(overallBuy[buyCur]||0)+qty*buyRate;if(U(s.paymentStatus)==='PAID'){paid[buyCur]=(paid[buyCur]||0)+qty*buyRate;overallPaid[buyCur]=(overallPaid[buyCur]||0)+qty*buyRate}
        const tax=priced?qty*sellRate*Math.max(0,N(s.taxPercentage))/100:0;
        if(priced){sell[sellCur]=(sell[sellCur]||0)+qty*sellRate;overallSell[sellCur]=(overallSell[sellCur]||0)+qty*sellRate;taxes[sellCur]=(taxes[sellCur]||0)+tax;overallTax[sellCur]=(overallTax[sellCur]||0)+tax}
        return [U(s.phase)+' / '+U(s.description)+' / '+U(s.status)+' / '+U(s.paymentStatus||'UNPAID'),S(qty),buyCur+' '+amt(buyRate),buyCur+' '+amt(qty*buyRate),priced?sellCur+' '+amt(sellRate):'',priced?amt(N(s.taxPercentage))+'% / '+amt(tax):'',priced?sellCur+' '+amt(qty*sellRate+tax):''];
      });
      d.table(['Phase / service / status','Qty','Buying / unit','Buying total','Selling / unit','Tax','Charged total'],rows,[270,60,150,150,160,150,184]);
      d.note('BUYING COST  '+Object.keys(buy).sort().map(cur=>cur+' '+amt(buy[cur])).join('  /  '));d.note('SUPPLIER PAID  '+(Object.keys(paid).length?Object.keys(paid).sort().map(cur=>cur+' '+amt(paid[cur])).join('  /  '):'NONE MARKED PAID'));
      d.note('SELLING TOTAL  '+(Object.keys(sell).length?Object.keys(sell).sort().map(cur=>cur+' '+amt(sell[cur])).join('  /  '):'NO SELLING PRICE ENTERED'));
      d.note('SELLING TAX  '+(Object.keys(taxes).length?Object.keys(taxes).sort().map(cur=>cur+' '+amt(taxes[cur])).join('  /  '):'NONE'));
      const cur=U(f.profitCurrency||'AED'),usedServices=A(l.services).filter(used),profit=usedServices.reduce((sum,s)=>sum+N(s.profitInCurrency),0),missing=usedServices.some(s=>s.profitInCurrency==null);d.note('LEG PROFIT / LOSS  '+(missing?'RATE OR PRICE REQUIRED':cur+' '+amt(profit)),INK);if(l.remarks)d.note('REMARKS  '+U(l.remarks));
    });
    d.ensure(285);d.titleBar('Trip totals by currency');
    d.table(['Currency','Buying cost','Supplier paid','Selling / charged'],[...new Set([...Object.keys(overallBuy),...Object.keys(overallSell)])].sort().map(cur=>[cur,cur in overallBuy?amt(overallBuy[cur]):'',cur in overallPaid?amt(overallPaid[cur]):'',cur in overallSell?amt(overallSell[cur]):'']),[190,285,285,364]);
    d.note('TRIP SELLING TAX  '+(Object.keys(overallTax).length?Object.keys(overallTax).sort().map(cur=>cur+' '+amt(overallTax[cur])).join('  /  '):'NONE'));const allUsed=A(f.legs).flatMap(l=>A(l.services).filter(used)),missing=allUsed.some(s=>s.profitInCurrency==null);d.titleBar('Final trip profit / loss');d.note(missing?'RATE OR PRICE REQUIRED':U(f.profitCurrency||'AED')+' '+amt(allUsed.reduce((sum,s)=>sum+N(s.profitInCurrency),0)),INK);
    return d.finish();
  }

  root.FLYPADDocuments = {
    render(type, flight, leg, index, people, logo, companyName, contacts, design, stamp, signature, footerLogo) {
      currentCompany=companyName||'FLYGER AVIATION SERVICES';currentContacts=contacts||{};currentDesign=design||{};currentStamp=stamp||null;currentSignature=signature||null;currentFooterLogo=footerLogo||null;
      if (type === 'COMBINED FLIGHT REPORT') return report(flight, logo);
      if (type === 'TRIP ITINERARY') return itinerary(flight, logo);
      if (type === 'GENERAL DECLARATION · ICAO') return [
        ...declaration(flight, leg, index, people, logo, false),
        ...declaration(flight, leg, index, people, logo, true)
      ];
      if (type === 'GROUND SERVICE CHECKLIST') return checklist(flight, leg, index, logo);
      if (type === 'QUALITY OF SERVICE') return quality(flight, leg, index, logo);
      if (type === 'HANDLING CONFIRMATION') return handling(flight, leg, index, logo);
      if (['INVOICE / PROFORMA', 'CASH INVOICE', 'CREDIT HANDLING SHEET'].includes(type)) return invoice(flight, leg, index, logo, type);
      throw Error('NO DOCUMENT TEMPLATE: ' + type);
    }
  };
})(window);
