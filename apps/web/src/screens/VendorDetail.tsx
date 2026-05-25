import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckSquare, Clock, FileText, RefreshCw, Upload, Users, Zap, Activity, ExternalLink, Shield } from "lucide-react";
import { VendorLogo } from "../components/VendorLogo.js";
import { DiffViewer } from "../components/DiffViewer.js";
import { DEMO_BEARER_TOKEN } from "../lib/api.js";
import type { ChangeCategory, Materiality } from "@unsyphn/shared";
import { RenegotiationPacket } from "../components/RenegotiationPacket.js";
import { SubprocessorHeatmap } from "./SubprocessorHeatmap.js";

type TabId = "overview" | "spend" | "contracts" | "changes" | "risk" | "activity";
type Posture = "fresh" | "expiring" | "stale" | "risk" | "watch" | "ok";

interface VendorMeta {
  id: string; name: string; domain: string; tier: 1 | 2 | 3;
  posture: Posture; renewsAt: string; ownerEmail: string;
  annualSpendUsd: number; activeSeats: number; totalSeats: number;
}

interface FeedChange {
  id: string; vendorId: string; title: string; summary: string; severity: string;
  occurredAt: string; category: string; diff?: { before: string; after: string };
  citations?: Array<{ url?: string; fetchedAt?: string }>;
}

const SEED: Record<string, VendorMeta> = {
  vnd_notion:   { id:"vnd_notion",   name:"Notion",               domain:"notion.so",        tier:1, posture:"risk",     renewsAt:"2026-07-04", ownerEmail:"priya@acme.dev",  annualSpendUsd:84000,   activeSeats:412, totalSeats:600 },
  vnd_datadog:  { id:"vnd_datadog",  name:"Datadog",              domain:"datadoghq.com",    tier:2, posture:"expiring", renewsAt:"2026-06-30", ownerEmail:"marcus@acme.dev", annualSpendUsd:145000,  activeSeats:280, totalSeats:300 },
  vnd_salesforce:{ id:"vnd_salesforce",name:"Salesforce",         domain:"salesforce.com",   tier:1, posture:"watch",    renewsAt:"2026-07-10", ownerEmail:"marcus@acme.dev", annualSpendUsd:815000,  activeSeats:438, totalSeats:850 },
  vnd_stripe:   { id:"vnd_stripe",   name:"Stripe",               domain:"stripe.com",       tier:1, posture:"watch",    renewsAt:"2026-07-18", ownerEmail:"lin@acme.dev",    annualSpendUsd:62000,   activeSeats:18,  totalSeats:20  },
  vnd_figma:    { id:"vnd_figma",    name:"Figma",                domain:"figma.com",        tier:2, posture:"ok",       renewsAt:"2026-11-01", ownerEmail:"marcus@acme.dev", annualSpendUsd:24000,   activeSeats:55,  totalSeats:80  },
  vnd_slack:    { id:"vnd_slack",    name:"Slack",                domain:"slack.com",        tier:2, posture:"watch",    renewsAt:"2026-08-12", ownerEmail:"priya@acme.dev",  annualSpendUsd:38000,   activeSeats:310, totalSeats:400 },
  vnd_github:   { id:"vnd_github",   name:"GitHub",               domain:"github.com",       tier:1, posture:"fresh",    renewsAt:"2027-03-20", ownerEmail:"devon@acme.dev",  annualSpendUsd:52000,   activeSeats:90,  totalSeats:100 },
  vnd_aws:      { id:"vnd_aws",      name:"AWS",                  domain:"aws.amazon.com",   tier:1, posture:"fresh",    renewsAt:"2027-01-01", ownerEmail:"ada@acme.dev",    annualSpendUsd:420000,  activeSeats:0,   totalSeats:0   },
  vnd_vercel:   { id:"vnd_vercel",   name:"Vercel",               domain:"vercel.com",       tier:2, posture:"ok",       renewsAt:"2027-02-15", ownerEmail:"jordan@acme.dev", annualSpendUsd:18000,   activeSeats:12,  totalSeats:15  },
  vnd_okta:     { id:"vnd_okta",     name:"Okta",                 domain:"okta.com",         tier:1, posture:"fresh",    renewsAt:"2027-01-08", ownerEmail:"ada@acme.dev",    annualSpendUsd:72000,   activeSeats:350, totalSeats:360 },
  vnd_hubspot:  { id:"vnd_hubspot",  name:"HubSpot",              domain:"hubspot.com",      tier:2, posture:"ok",       renewsAt:"2026-12-15", ownerEmail:"lin@acme.dev",    annualSpendUsd:31000,   activeSeats:25,  totalSeats:30  },
  vnd_adobe_cc: { id:"vnd_adobe_cc", name:"Adobe Creative Cloud", domain:"adobe.com",        tier:2, posture:"stale",    renewsAt:"2026-09-01", ownerEmail:"marcus@acme.dev", annualSpendUsd:19200,   activeSeats:8,   totalSeats:20  },
};

const daysUntil = (d: string) => Math.round((new Date(d).getTime() - Date.now()) / 86_400_000);
const fmtUsd = (n: number) => n >= 1_000_000 ? `$${(n/1e6).toFixed(1)}M` : n >= 1_000 ? `$${Math.round(n/1e3)}k` : `$${n}`;
const relTime = (iso: string) => { const d = Math.floor((Date.now()-Date.parse(iso))/86_400_000); return d===0?"today":d===1?"1d ago":`${d}d ago`; };
const postureCls = (p: Posture) => (p==="fresh"||p==="ok") ? "badge badge-success" : (p==="expiring"||p==="watch") ? "badge badge-warning" : "badge badge-danger";
const postureStr = (p: Posture) => (p==="fresh"||p==="ok") ? "fresh" : (p==="expiring"||p==="watch") ? "expiring" : "stale";

function sparklePath(vendorId: string, w=120, h=32): string {
  let seed = vendorId.split("").reduce((s,c)=>s+c.charCodeAt(0),0);
  const pts=Array.from({length:12},()=>{seed=(seed*1664525+1013904223)&0xffffffff;return ((seed>>>0)%80)+10;});
  const xStep=w/11;
  return pts.map((y,i)=>`${i===0?"M":"L"}${(i*xStep).toFixed(1)} ${(h-(y/100)*h).toFixed(1)}`).join(" ");
}

function Tile({label,value,sub}:{label:string;value:string;sub?:string}): JSX.Element {
  return (
    <div className="card" style={{padding:"var(--space-4)",display:"flex",flexDirection:"column",gap:"var(--space-1)"}}>
      <span style={{fontSize:"var(--text-xs)",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</span>
      <span style={{fontFamily:"var(--font-mono)",fontWeight:600,fontSize:"var(--text-2xl)",color:"var(--text)",lineHeight:1.1}}>{value}</span>
      {sub&&<span style={{fontSize:"var(--text-xs)",color:"var(--text-2)"}}>{sub}</span>}
    </div>
  );
}

function Head({children}:{children:React.ReactNode}): JSX.Element {
  return <h2 style={{margin:"0 0 var(--space-3) 0",fontSize:"var(--text-xs)",fontWeight:600,color:"var(--text)",textTransform:"uppercase",letterSpacing:"0.06em"}}>{children}</h2>;
}

function OverviewTab({vendor,changes}:{vendor:VendorMeta;changes:FeedChange[]}): JSX.Element {
  const days=daysUntil(vendor.renewsAt);
  const desc:Record<Posture,string>={fresh:"Posture healthy. No active risks.",ok:"Posture healthy. No active risks.",watch:"Some items need attention. Review recommended.",expiring:"Certifications expiring within 30 days.",stale:"Certifications or reviews overdue.",risk:"Active risk identified. Immediate review needed."};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"var(--space-5)"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"var(--space-3)"}}>
        <Tile label="Annual spend" value={fmtUsd(vendor.annualSpendUsd)}/>
        <Tile label="Active / total seats" value={`${vendor.activeSeats} / ${vendor.totalSeats}`}/>
        <Tile label="Renews in" value={`${days}d`} sub={new Date(vendor.renewsAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}/>
        <Tile label="Material changes" value={String(changes.length)} sub="detected"/>
      </div>
      <div>
        <Head>Posture summary</Head>
        <div className="card" style={{padding:"var(--space-4)",display:"flex",alignItems:"center",gap:"var(--space-3)"}}>
          <span className={postureCls(vendor.posture)}>{postureStr(vendor.posture)}</span>
          <span style={{fontSize:"var(--text-sm)",color:"var(--text-2)"}}>{desc[vendor.posture]}</span>
        </div>
      </div>
      <div>
        <Head>Recent activity</Head>
        {changes.length===0 ? <p style={{fontSize:"var(--text-sm)",color:"var(--text-muted)",margin:0}}>No recent changes.</p> : (
          <div style={{display:"flex",flexDirection:"column",gap:"var(--space-2)"}}>
            {changes.slice(0,3).map(ch=>(
              <div key={ch.id} className="card" style={{padding:"var(--space-3) var(--space-4)",display:"flex",alignItems:"center",gap:"var(--space-3)"}}>
                <span className={ch.severity==="P1"?"badge badge-danger":"badge badge-warning"} style={{flexShrink:0}}>{ch.severity}</span>
                <span style={{flex:1,fontSize:"var(--text-sm)",color:"var(--text)",fontWeight:500}}>{ch.title}</span>
                <span style={{fontSize:"var(--text-xs)",color:"var(--text-muted)",flexShrink:0}}>{relTime(ch.occurredAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SpendTab({vendor}:{vendor:VendorMeta}): JSX.Element {
  const cps=vendor.totalSeats>0?Math.round(vendor.annualSpendUsd/vendor.totalSeats):0;
  const pct=vendor.totalSeats>0?Math.round((vendor.activeSeats/vendor.totalSeats)*100):100;
  const unused=vendor.totalSeats-vendor.activeSeats;
  const recoverable=vendor.totalSeats>0?unused*Math.round(vendor.annualSpendUsd/vendor.totalSeats/12)*12:0;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"var(--space-5)"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:"var(--space-3)"}}>
        <Tile label="Annual spend" value={fmtUsd(vendor.annualSpendUsd)}/>
        <Tile label="Avg cost / seat" value={`$${cps.toLocaleString()}`} sub="per year"/>
        <div className="card" style={{padding:"var(--space-4)",display:"flex",flexDirection:"column",gap:"var(--space-2)"}}>
          <span style={{fontSize:"var(--text-xs)",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.06em"}}>30-day trend</span>
          <svg width={120} height={32} aria-hidden="true"><path d={sparklePath(vendor.id)} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeLinejoin="round"/></svg>
        </div>
      </div>
      {vendor.totalSeats>0&&(
        <div>
          <Head>Seat utilization</Head>
          <div className="card" style={{padding:"var(--space-4)",display:"flex",flexDirection:"column",gap:"var(--space-3)"}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:"var(--text-sm)",color:"var(--text)"}}>{vendor.activeSeats} of {vendor.totalSeats} seats active</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--text-sm)",color:"var(--text-2)"}}>{pct}%</span>
            </div>
            <div style={{height:8,background:"var(--surface-2)",borderRadius:"var(--radius-full)",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:pct<50?"var(--warning)":"var(--success)",borderRadius:"var(--radius-full)"}}/>
            </div>
            {recoverable>0&&<span className="badge badge-warning" style={{alignSelf:"flex-start"}}>Recoverable from {unused} unused seats: {fmtUsd(recoverable)}/yr</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function ContractsTab({vendor}:{vendor:VendorMeta}): JSX.Element {
  const docs=[
    {type:"Master Service Agreement",file:`MSA-${vendor.name.replace(/\s+/g,"")}-2025.pdf`,uploaded:"2025-03-12",term:24,autoRenew:true},
    {type:"Data Processing Agreement",file:`DPA-${vendor.name.replace(/\s+/g,"")}-2025.pdf`,uploaded:"2025-03-12",term:24,autoRenew:false},
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"var(--space-4)"}}>
      {docs.map(c=>(
        <div key={c.type} className="card" style={{padding:"var(--space-4)",display:"flex",flexDirection:"column",gap:"var(--space-3)"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"var(--space-3)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"var(--space-2)"}}>
              <FileText size={16} aria-hidden="true" style={{color:"var(--accent)",flexShrink:0}}/>
              <div>
                <div style={{fontWeight:600,fontSize:"var(--text-sm)",color:"var(--text)"}}>{c.type}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)",color:"var(--text-muted)"}}>{c.file}</div>
              </div>
            </div>
            <button type="button" className="btn btn-ghost" style={{fontSize:"var(--text-xs)"}} onClick={()=>alert("Clause extraction coming soon.")}>
              View clauses <ExternalLink size={11} aria-hidden="true"/>
            </button>
          </div>
          <div style={{display:"flex",gap:"var(--space-4)",flexWrap:"wrap"}}>
            <span style={{fontSize:"var(--text-xs)",color:"var(--text-2)"}}>Uploaded {new Date(c.uploaded).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
            <span style={{fontSize:"var(--text-xs)",color:"var(--text-2)"}}>Term: {c.term} months</span>
            <span className={c.autoRenew?"badge badge-warning":"badge badge-neutral"}>Auto-renew {c.autoRenew?"ON":"OFF"}</span>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-secondary" style={{alignSelf:"flex-start"}} onClick={()=>alert("Contract upload coming soon.")}>
        <Upload size={13} aria-hidden="true"/> Upload contract
      </button>
    </div>
  );
}

function ChangeFeedTab({vendorId}:{vendorId:string}): JSX.Element {
  const [changes,setChanges]=useState<FeedChange[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{
    let cancelled=false;
    setLoading(true);
    fetch(`/v1/changes/feed?vendorId=${encodeURIComponent(vendorId)}`,{headers:{Authorization:`Bearer ${DEMO_BEARER_TOKEN}`}})
      .then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json() as Promise<{changes:FeedChange[]}>;})
      .then(({changes:data})=>{if(!cancelled){setChanges(data);setLoading(false);}})
      .catch(()=>{if(!cancelled){setError("Failed to load change feed.");setLoading(false);}});
    return ()=>{cancelled=true;};
  },[vendorId]);

  if(loading) return <div style={{padding:"var(--space-4)",color:"var(--text-muted)",fontSize:"var(--text-sm)"}} aria-live="polite" aria-busy>Loading changes…</div>;
  if(error) return <span className="badge badge-danger">{error}</span>;
  if(changes.length===0) return (
    <div className="card" style={{padding:"var(--space-7)",textAlign:"center"}}>
      <CheckSquare size={24} aria-hidden="true" style={{color:"var(--success)",display:"block",margin:"0 auto var(--space-2)"}}/>
      <p style={{margin:0,fontSize:"var(--text-sm)",color:"var(--text-2)"}}>No material changes detected. Continuous monitoring is active.</p>
    </div>
  );

  const mapped=changes.map(ch=>({
    id:ch.id,category:ch.category as ChangeCategory,summary:ch.title,
    before:ch.diff?.before,after:ch.diff?.after,
    materiality:(ch.severity==="P1"?"material":ch.severity==="P2"?"minor":"cosmetic") as Materiality,
    citations:ch.citations?.map(c=>({url:c.url,fetchedAt:c.fetchedAt})),
  }));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"var(--space-3)"}}>
      <div style={{display:"flex",alignItems:"center",gap:"var(--space-2)",marginBottom:"var(--space-1)"}}>
        <Activity size={14} aria-hidden="true" style={{color:"var(--success)"}}/>
        <span style={{fontSize:"var(--text-xs)",color:"var(--text-muted)"}}>Continuous monitoring active · {changes.length} change{changes.length!==1?"s":""} detected</span>
      </div>
      <DiffViewer changes={mapped}/>
    </div>
  );
}


function ActivityTab({vendor}:{vendor:VendorMeta}): JSX.Element {
  const events=[
    {id:1,Icon:AlertCircle, label:"Renewal alert created",                                    actor:"system",           at:"2026-05-20T08:00:00Z"},
    {id:2,Icon:CheckSquare, label:`Acknowledged by ${vendor.ownerEmail}`,                     actor:vendor.ownerEmail,  at:"2026-05-20T09:14:00Z"},
    {id:3,Icon:RefreshCw,   label:"Posture badge changed: fresh → expiring",                 actor:"system",           at:"2026-05-18T12:00:00Z"},
    {id:4,Icon:Shield,      label:"Sub-processor review completed",                           actor:"ada@acme.dev",     at:"2026-05-15T10:30:00Z"},
    {id:5,Icon:Clock,       label:"Renewal reminder sent (60-day window)",                    actor:"system",           at:"2026-05-10T09:00:00Z"},
    {id:6,Icon:FileText,    label:"MSA uploaded and parsed",                                  actor:vendor.ownerEmail,  at:"2025-03-12T14:00:00Z"},
    {id:7,Icon:Users,       label:`Vendor owner assigned to ${vendor.ownerEmail}`,            actor:"admin@acme.dev",   at:"2025-03-10T09:00:00Z"},
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"var(--space-4)"}}>
      <div style={{display:"flex",flexDirection:"column"}}>
        {events.map(({id,Icon,label,actor,at},idx)=>(
          <div key={id} style={{display:"flex",gap:"var(--space-3)",padding:"var(--space-3) var(--space-1)",borderBottom:idx<events.length-1?"1px solid var(--border)":"none"}}>
            <div style={{width:28,height:28,borderRadius:"var(--radius-full)",background:"var(--surface-2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Icon size={13} aria-hidden="true" style={{color:"var(--text-2)"}}/>
            </div>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:"var(--space-1)"}}>
              <span style={{fontSize:"var(--text-sm)",color:"var(--text)",fontWeight:500}}>{label}</span>
              <span style={{fontSize:"var(--text-xs)",color:"var(--text-muted)"}}>{actor!=="system"?actor+" · ":""}{relTime(at)}</span>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-secondary" style={{alignSelf:"flex-start"}} onClick={()=>alert("Evidence bundle export coming soon.")}>
        <FileText size={13} aria-hidden="true"/> Export evidence bundle
      </button>
    </div>
  );
}

function NextActionCard({vendor,changeCount,onTab}:{vendor:VendorMeta;changeCount:number;onTab:(t:TabId)=>void}): JSX.Element {
  const days=daysUntil(vendor.renewsAt);
  const unused=vendor.totalSeats-vendor.activeSeats;
  const recoverable=vendor.totalSeats>0?unused*Math.round(vendor.annualSpendUsd/vendor.totalSeats/12)*12:0;

  const cta=changeCount>0
    ? {badge:"Changes",label:`Acknowledge ${changeCount} change${changeCount!==1?"s":""}`,tab:"changes" as TabId}
    : days<=60
    ? {badge:"Renewal",label:`Renewal in ${days}d — start packet`,tab:"contracts" as TabId}
    : unused>5
    ? {badge:"Savings",label:`Reclaim ${unused} unused seats (${fmtUsd(recoverable)}/yr)`,tab:"spend" as TabId}
    : {badge:"Monitor",label:"View inbox filtered to vendor",tab:null};

  return (
    <div className="card" style={{padding:"var(--space-4)",display:"flex",flexDirection:"column",gap:"var(--space-3)",minWidth:200,maxWidth:240}}>
      <div style={{display:"flex",alignItems:"center",gap:"var(--space-2)"}}>
        <Zap size={14} aria-hidden="true" style={{color:"var(--warning)",flexShrink:0}}/>
        <span style={{fontSize:"var(--text-xs)",fontWeight:600,color:"var(--text)",textTransform:"uppercase",letterSpacing:"0.06em"}}>Next action</span>
      </div>
      <span className="badge badge-accent" style={{alignSelf:"flex-start"}}>{cta.badge}</span>
      <p style={{margin:0,fontSize:"var(--text-sm)",color:"var(--text-2)",lineHeight:1.5}}>{cta.label}</p>
      <button type="button" className="btn btn-primary" style={{alignSelf:"flex-start"}}
        onClick={()=>cta.tab?onTab(cta.tab):window.location.assign(`/app/inbox?vendorId=${vendor.id}`)}>
        Take action
      </button>
    </div>
  );
}

export function VendorDetail(): JSX.Element {
  const pathname=typeof window!=="undefined"?window.location.pathname:"";
  const match=pathname.match(/^\/app\/vendors?\/([^/?#]+)/);
  const vendorId=match?.[1]??"";
  const vendor=SEED[vendorId];

  const [activeTab,setActiveTab]=useState<TabId>("overview");
  const [feedChanges,setFeedChanges]=useState<FeedChange[]>([]);
  const [feedLoaded,setFeedLoaded]=useState(false);
  const [packetOpen,setPacketOpen]=useState(false);

  useEffect(()=>{
    if(!vendor)return;
    fetch(`/v1/changes/feed?vendorId=${encodeURIComponent(vendorId)}`,{headers:{Authorization:`Bearer ${DEMO_BEARER_TOKEN}`}})
      .then(r=>r.json() as Promise<{changes:FeedChange[]}>)
      .then(({changes})=>{setFeedChanges(changes);setFeedLoaded(true);})
      .catch(()=>{setFeedLoaded(true);});
  },[vendor,vendorId]);

  if(!vendor) return (
    <main style={{maxWidth:680,margin:"var(--space-9) auto",padding:"0 var(--space-6)",textAlign:"center"}}>
      <h1 className="h1" style={{marginBottom:"var(--space-3)"}}>Vendor not found</h1>
      <p className="lead" style={{marginBottom:"var(--space-5)"}}>No vendor with id "{vendorId}" exists in your portfolio.</p>
      <a href="/app/vendors" className="btn btn-secondary"><ArrowLeft size={14} aria-hidden="true"/> Back to portfolio</a>
    </main>
  );

  const days=daysUntil(vendor.renewsAt);
  const TABS: Array<{id:TabId;label:string}>=[
    {id:"overview",label:"Overview"},{id:"spend",label:"Spend & Usage"},
    {id:"contracts",label:"Contracts"},{id:"changes",label:"Change Feed"},
    {id:"risk",label:"Risk"},{id:"activity",label:"Activity"},
  ];

  return (
    <main style={{maxWidth:1100,margin:"0 auto",padding:"var(--space-6) var(--space-6) var(--space-8)"}}>
      <a href="/app/vendors" style={{display:"inline-flex",alignItems:"center",gap:"var(--space-1)",fontSize:"var(--text-xs)",color:"var(--text-muted)",marginBottom:"var(--space-4)",textDecoration:"none"}}>
        <ArrowLeft size={12} aria-hidden="true"/> All vendors
      </a>

      {/* Header */}
      <div style={{display:"flex",gap:"var(--space-5)",alignItems:"flex-start",marginBottom:"var(--space-5)"}}>
        <VendorLogo name={vendor.name} domain={vendor.domain} size={64}/>
        <div style={{flex:1,minWidth:0}}>
          <h1 className="h1" style={{fontWeight:600,marginBottom:"var(--space-1)"}}>{vendor.name}</h1>
          <p style={{margin:"0 0 var(--space-3) 0",fontSize:"var(--text-sm)",color:"var(--text-2)"}}>
            <a href={`https://${vendor.domain}`} target="_blank" rel="noopener noreferrer" style={{color:"var(--text-2)"}}>{vendor.domain}</a>
            {" · "}Owner: {vendor.ownerEmail}
          </p>
          <div style={{display:"flex",gap:"var(--space-2)",flexWrap:"wrap",alignItems:"center"}}>
            <span className="badge badge-neutral">Tier {vendor.tier}</span>
            <span className={postureCls(vendor.posture)}>{postureStr(vendor.posture)}</span>
            <span style={{fontSize:"var(--text-xs)",color:"var(--text-muted)"}}>{days>0?`Renews in ${days}d`:`Renewed ${Math.abs(days)}d ago`}</span>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"var(--space-2)",alignItems:"flex-end"}}>
          {feedLoaded&&<NextActionCard vendor={vendor} changeCount={feedChanges.length} onTab={setActiveTab}/>}
          <button type="button" className="btn btn-secondary" style={{fontSize:"var(--text-xs)",height:32,alignSelf:"stretch"}} onClick={()=>setPacketOpen(true)}>
            Generate Renegotiation Packet
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div role="tablist" aria-label="Vendor detail sections" style={{display:"flex",borderBottom:"1px solid var(--border)",marginBottom:"var(--space-5)",overflowX:"auto"}}>
        {TABS.map(({id,label})=>{
          const on=activeTab===id;
          return (
            <button key={id} type="button" role="tab" aria-selected={on} aria-controls={`panel-${id}`} id={`tab-${id}`}
              onClick={()=>setActiveTab(id)}
              style={{padding:"var(--space-3) var(--space-4)",background:"none",border:"none",borderBottom:on?"2px solid var(--accent)":"2px solid transparent",color:on?"var(--accent)":"var(--text-2)",fontFamily:"var(--font-text)",fontSize:"var(--text-sm)",fontWeight:on?600:400,cursor:"pointer",whiteSpace:"nowrap",transition:"color var(--dur-fast),border-color var(--dur-fast)",marginBottom:-1}}>
              {label}
              {id==="changes"&&feedChanges.length>0&&<span className="badge badge-danger" style={{marginLeft:"var(--space-2)",fontSize:10}}>{feedChanges.length}</span>}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab==="overview"&&<OverviewTab vendor={vendor} changes={feedChanges}/>}
        {activeTab==="spend"&&<SpendTab vendor={vendor}/>}
        {activeTab==="contracts"&&<ContractsTab vendor={vendor}/>}
        {activeTab==="changes"&&<ChangeFeedTab vendorId={vendorId}/>}
        {activeTab==="risk"&&<SubprocessorHeatmap vendorId={vendorId}/>}
        {activeTab==="activity"&&<ActivityTab vendor={vendor}/>}
      </div>
      <RenegotiationPacket vendorId={vendorId} open={packetOpen} onClose={()=>setPacketOpen(false)}/>
    </main>
  );
}
