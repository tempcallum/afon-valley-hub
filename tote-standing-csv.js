/* Optional local Lloyds CSV aide: never uploads the statement.
   Final ticket issuance is always a conscious Chair/Treasurer verification. */
(function(){
 const baseTote=tote;
 const norm=x=>String(x??"").toUpperCase().replace(/[^A-Z0-9]/g,"");
 const gbp=p=>Number(p/100).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
 const safe=x=>esc(String(x??""));
 function rowsCsv(input){
   const result=[];let row=[],field="",quoted=false;
   const text=String(input||"").replace(/^\uFEFF/,"");
   for(let i=0;i<text.length;i++){
     const c=text[i],next=text[i+1];
     if(quoted){
       if(c==='"'&&next==='"'){field+='"';i++}else if(c==='"'){quoted=false}else field+=c;
       continue;
     }
     if(c==='"'&&field===""){quoted=true;continue}
     if(c===','){row.push(field);field="";continue}
     if(c==='\n'||c==='\r'){
       if(c==='\r'&&next==='\n')i++;
       row.push(field);field="";
       if(row.some(v=>v.trim()))result.push(row);
       row=[];if(result.length>15000)throw Error('Too many rows. Export a shorter Lloyds statement.');
       continue;
     }
     field+=c;
   }
   row.push(field);if(row.some(v=>v.trim()))result.push(row);
   return result;
 }
 const num=x=>{
   const s=String(x||"").replace(/[£,\s]/g,"");
   if(!/^-?\d+(\.\d{1,2})?$/.test(s))return null;
   const n=Math.round(Number(s)*100);return n>=0?n:null;
 };
 const dateValue=x=>{
   const value=String(x||"").trim();
   let m=value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
   if(m){
     const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));
     if(d.getFullYear()===Number(m[3])&&d.getMonth()===Number(m[2])-1&&d.getDate()===Number(m[1]))
       return d.toLocaleDateString('en-GB');
   }
   m=value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
   if(m){const d=new Date(value+'T12:00:00');return Number.isNaN(d.getTime())?null:d.toLocaleDateString('en-GB')}
   return null;
 };
 async function fingerprint(line){
   const bytes=new TextEncoder().encode(line);
   const hash=await crypto.subtle.digest("SHA-256",bytes);
   return 'CSV-'+Array.from(new Uint8Array(hash)).slice(0,16).map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
 }
 tote=async function(){
   await baseTote();
   if(!profile?.approved||!['chair','treasurer'].includes(profile.role)||isPlayerView()||tab!=='tote')return;
   const panel=document.querySelector('.tote-standing-admin');
   if(!panel||!panel.isConnected)return;
   const forms=[...panel.querySelectorAll('form.standing-confirm')].map(form=>({
     form,
     ref:norm(form.querySelector('[name=reference]')?.value),
     amountPence:Math.round(Number(form.querySelector('[name=amount]')?.value||0)*100)
   })).filter(x=>x.ref);
   if(!forms.length)return;
   const details=document.createElement('details');
   details.className='standing-csv-helper';
   details.innerHTML='<summary>Match Lloyds CSV bank statement (optional)</summary>'+
     '<p class="muted">Select a CSV export from Lloyds. Matching happens <strong>on this device</strong>; the full statement is not sent to the Hub. We look for permanent references beginning AVS. You must still check the amount and actual receipt date/time against Lloyds before confirming any tickets.</p>'+
     '<label>Lloyds CSV file<input type="file" accept=".csv,text/csv" id="standingBankCsv"></label>'+
     '<div id="standingCsvMatches" role="status" class="muted">No bank statement selected.</div>';
   panel.append(details);
   const file=details.querySelector('#standingBankCsv'),result=details.querySelector('#standingCsvMatches');
   file.onchange=async()=>{
     const selected=file.files?.[0];
     if(!selected){result.textContent='No file selected';return}
     if(selected.size>2*1024*1024){result.textContent='File too large. Export a shorter date range from Lloyds (2 MB maximum).';return}
     result.textContent='Scanning statement locally…';
     try{
       const raw=await selected.text(),rows=rowsCsv(raw);
       const allRefs=new Map(forms.map(x=>[x.ref,x]));
       const found=[];let creditIndex=-1,dateIndex=-1;
       for(let i=0;i<Math.min(rows.length,16);i++){
         const headers=rows[i].map(x=>String(x||"").trim().toLowerCase());
         const credit=headers.findIndex(x=>/^(paid in|money in|credit|credit amount|deposit|amount in)$/.test(x));
         const date=headers.findIndex(x=>/^(date|transaction date|value date|payment date)$/.test(x));
         if(credit>=0||date>=0){creditIndex=credit;dateIndex=date;break}
       }
       for(const row of rows){
         const rawLine=row.join('|'),text=row.join(' ').toUpperCase();
         const matches=[...text.matchAll(/AVS[0-9]{7}/g)];
         const refs=[...new Set(matches.map(x=>x[0]))];
         for(const ref of refs){
           const sub=allRefs.get(ref);if(!sub)continue;
           const credit=creditIndex>=0?num(row[creditIndex]):null;
           const day=dateIndex>=0?dateValue(row[dateIndex]):null;
           found.push({ref,sub,credit,day,key:await fingerprint(rawLine)});
           if(found.length>=80)break;
         }
         if(found.length>=80)break;
       }
       if(!found.length){result.textContent='No unentered standing-order references matched in the CSV. Check the export dates and make sure the payment reference is visible.';return}
       result.innerHTML='<strong>'+found.length+' possible payment row(s) identified</strong>'+
         '<p class="muted">A match is not proof of payment; compare the credited transaction in Lloyds. Rows with unexpected amounts should not be confirmed.</p>'+
         '<div class="list">'+found.map((x,i)=>'<div class="row">'+
           '<span><strong>'+safe(x.ref)+'</strong><br><small>'+safe(x.day||'Check date in Lloyds')+
           ' · '+(x.credit===null?'Amount not identified':gbp(x.credit))+
           (x.credit!==null&&x.credit!==x.sub.amountPence?' · AMOUNT MISMATCH':'')+'</small></span>'+
           '<button type="button" class="btn" data-csv-row="'+i+'">Review</button></div>').join('')+'</div>';
       result.querySelectorAll('[data-csv-row]').forEach(button=>button.onclick=()=>{
         const entry=found[Number(button.dataset.csvRow)];
         const {form}=entry.sub;
         form.closest('details')?.setAttribute('open','');
         form.querySelector('[name=reference]').value=entry.ref;
         form.querySelector('[name=transaction]').value=entry.key;
         if(entry.credit!==null)form.querySelector('[name=amount]').value=(entry.credit/100).toFixed(2);
         const time=form.querySelector('[name=received]');
         time.value='';time.focus();
         form.scrollIntoView({behavior:'smooth',block:'center'});
         alert('Matched '+entry.ref+'. Check the payment in Lloyds and enter the ACTUAL bank receipt date and time. The CSV may only show a date, so no time has been assumed. Confirm only when the amount is correct.');
       });
     }catch(e){result.textContent='Could not interpret this CSV export: '+e.message}
   };
 };
})();