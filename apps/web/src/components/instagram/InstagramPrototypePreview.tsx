'use client'

import { useEffect, useRef, useState } from 'react'
import source from './prototype-source.json'
import { InstagramPreviewSection, InstagramSection, isInstagramSection } from './sections'

// Original local prototype, isolated from CRM storage, cookies and network access.
const bridge = `<script>
(() => {
  const values = new Map();
  const memory = { getItem: key => values.get(String(key)) ?? null,
    setItem: (key,value) => values.set(String(key),String(value)), removeItem: key => values.delete(String(key)),
    clear: () => values.clear(), key: index => [...values.keys()][index] ?? null, get length(){return values.size} };
  Object.defineProperty(window,'localStorage',{value:memory});
  Object.defineProperty(window,'sessionStorage',{value:memory});
  const sections = ['conversas','automacoes','assistente','menus','conexao','resultados','simulador'];
  let active=false;
  const report = () => { if(active) parent.postMessage({type:'instagram-preview-section',section:location.hash.slice(1)},'*'); };
  addEventListener('message',event => {
    if(event.source===parent && event.data?.type==='instagram-preview-navigate' && sections.includes(event.data.section)){active=true;location.hash=event.data.section;}
  });
  addEventListener('hashchange',report);
  document.addEventListener('click',event => {
    const link=event.target.closest?.('a[href^="#"]');
    if(link){event.preventDefault();location.hash=link.getAttribute('href');}
  },true);
  addEventListener('load',() => {
    const content=document.getElementById('app');
    new ResizeObserver(() => parent.postMessage({type:'instagram-preview-height',height:content.scrollHeight+16},'*')).observe(content);
    report();
  });
  location.hash='automacoes';
})();
</script>`
const html = source.lines.join('\n').replace('</head>', `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'">
<style>.sidebar,.topbar{display:none!important}.main-shell{margin-left:0!important}.shell{display:block!important}#app{padding:20px!important;max-width:none!important}body{background:#fff!important}</style>${bridge}</head>`)

export default function InstagramPrototypePreview({ section, onNavigate }: {
  section: InstagramPreviewSection; onNavigate: (section: InstagramSection) => void
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(1100)
  useEffect(() => { frame.current?.contentWindow?.postMessage({ type: 'instagram-preview-navigate', section }, '*') }, [section])
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return
      if (event.data?.type === 'instagram-preview-section' && isInstagramSection(event.data.section)) onNavigate(event.data.section)
      if (event.data?.type === 'instagram-preview-height' && Number.isFinite(event.data.height)) setHeight(Math.min(5000, Math.max(400, event.data.height)))
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [onNavigate])
  return <div className="space-y-4">
    <div role="note" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <strong>Prévia interativa do protótipo.</strong> Automações, IA, menus e resultados usam dados fictícios e não executam envios.
      Rascunhos desta prévia ficam somente nesta sessão. As conversas reais e a autorização da conta ficam nas abas Conversas e Conexão.
    </div>
    <iframe ref={frame} title="Protótipo interativo do Instagram — dados fictícios" srcDoc={html}
      sandbox="allow-scripts allow-downloads" referrerPolicy="no-referrer"
      onLoad={() => frame.current?.contentWindow?.postMessage({ type: 'instagram-preview-navigate', section }, '*')}
      className="w-full rounded-xl border bg-white" style={{ height }} />
  </div>
}
