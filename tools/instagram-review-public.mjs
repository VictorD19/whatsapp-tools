// Production web build for the isolated reviewer only. No Cloudflare mutation.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { cpSync, existsSync, symlinkSync, readFileSync, writeFileSync, openSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'

const root=dirname(dirname(fileURLToPath(import.meta.url))), dir=join(root,'.instagram-test/reviewer')
const pointer=join(dir,'public-build.json'), current=existsSync(pointer)?JSON.parse(readFileSync(pointer,'utf8')).directory:'public-web'
if(!['public-web','public-web-b'].includes(current))throw Error('Unexpected reviewer build directory')
const env={PATH:dirname(process.execPath)+':'+(process.env.PATH||''),HOME:homedir(),NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',
 NEXT_PUBLIC_API_URL:'',NEXT_PUBLIC_WS_URL:'',NEXT_PUBLIC_APP_URL:'https://instagram-review.sistemazapchat.com',NEXT_PUBLIC_INSTAGRAM_PILOT:'true',NEXT_PUBLIC_INSTAGRAM_REVIEW_FIXTURES:'true'}
const action=process.argv[2]
const name=action==='build'?(current==='public-web'?'public-web-b':'public-web'):current, web=join(dir,name)
if(action==='build'){
 cpSync(join(root,'apps/web'),web,{recursive:true,filter:p=>!/(^|\/)(node_modules|\.next|\.env[^/]*|tsconfig\.tsbuildinfo)(\/|$)/.test(p)})
 if(!existsSync(join(web,'node_modules')))symlinkSync(join(root,'apps/web/node_modules'),join(web,'node_modules'),'dir')
 const config=join(web,'next.config.ts');writeFileSync(config,readFileSync(config,'utf8').replace("path.join(__dirname, '../../')",JSON.stringify(root)))
 const result=spawnSync(process.execPath,[join(root,'apps/web/node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:web,env,stdio:'inherit'})
 if(result.status!==0)throw Error('Reviewer web build failed')
 const standalone=join(web,'.next/standalone/.instagram-test/reviewer',name)
 cpSync(join(web,'public'),join(standalone,'public'),{recursive:true})
 cpSync(join(web,'.next/static'),join(standalone,'.next/static'),{recursive:true})
 writeFileSync(pointer,JSON.stringify({directory:name}),{mode:0o600})
}else if(action==='start'||action==='start-gateway'||action==='start-public-web'){
 for(const port of action==='start-gateway'?[18012]:action==='start-public-web'?[18091]:[18091,18012]){const{createServer}=await import('node:net');await new Promise((ok,no)=>{const s=createServer();s.once('error',no);s.listen(port,'127.0.0.1',()=>s.close(ok))})}
 for(const[service,args,cwd]of[['public-web',[join(web,'.next/standalone/.instagram-test/reviewer',name,'server.js')],web],['gateway',[join(root,'tools/instagram-review-gateway.mjs')],dir]].filter(([service])=>(action!=='start-gateway'||service==='gateway')&&(action!=='start-public-web'||service==='public-web'))){
  const log=openSync(join(dir,service+'.log'),'a',0o600);const c=spawn(process.execPath,args,{cwd,env:{...env,HOSTNAME:'127.0.0.1',PORT:'18091'},detached:true,stdio:['ignore',log,log]});c.unref();writeFileSync(join(dir,service+'.pid'),String(c.pid),{mode:0o600})
 }
 console.log('Production web and restricted reviewer gateway started on loopback. No tunnel or DNS enabled.')
}else throw Error('Use build or start')
