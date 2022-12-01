export { ScannerDurable } from './scanner.durable.js'

export const api = {
  icon: '⚡️',
  name: 'api.qa',
  description: 'Automated API Testing',
  url: 'https://api.qa/api',
  type: 'https://apis.do/testing',
  endpoints: {
    test: 'https://api.qa/:endpoint',
  },
  site: 'https://api.qa',
  login: 'https://api.qa/login',
  signup: 'https://api.qa/signup',
  subscribe: 'https://api.qa/subscribe',
  repo: 'https://github.com/drivly/api.qa',
}

export const gettingStarted = [
  '   _____ __________.___     ________      _____   ',
  '  /  _  \\______   \   |    \_____  \    /  _  \  ',
  ' /  /_\  \|     ___/   |     /  / \  \  /  /_\  \ ',
  '/    |    \    |   |   |    /   \_/.  \/    |     \ ',
  '\____|__  /____|   |___| /\ \_____\ \_/\____|__  /',
  '        \/               \/        \__>        \/ ',
]

export const examples = {
  'lodash.do': 'https://api.qa/lodash.do/api'
}

export default {
	fetch: async (req, env, ctx) => {
	  const { user, origin, hostname, requestId, method, body, time, pathname, pathSegments, pathOptions, url, query } = await env.CTX.fetch(req).then(res => res.json())
	  const json=(e,t)=>(ctx.waitUntil(fetch(`https://debug.do/ingest/${req.headers.get("CF-Ray")}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({request:{url:req.url,method:req.method,headers:Object.fromEntries(req.headers),query:Object.fromEntries(new URL(req.url).searchParams)},response:e,user,status: t?.status || 200})})),new Response(JSON.stringify(e,null,2),{headers:{"content-type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, PUT, DELETE, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization, X-Requested-With","Cache-Control":"no-cache, no-store, must-revalidate"},...t}))
	  
	  if (pathname == '/api') return new Response(JSON.stringify({ api, gettingStarted, examples, user }, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' }})

    if (pathSegments[2] == 'report') {
      // Fetch the latest report from the underlying DurableObject

      const scanner = await env.ScannerDurable.get(env.ScannerDurable.idFromName(pathSegments[1]))

      const report = await scanner.fetch(`https://x.do/${pathSegments[1]}/report`).then(res => res.json())

      return json({
        api,
        data: report,
        user,
      })
    }

    if (pathSegments[1] == 'list') {
      const domain_list = await fetch('https://cdn.jsdelivr.net/gh/drivly/apis.do/_data/domains.csv').then(res => res.text())

      // Parse CSV
      const domains = domain_list.split('\n').filter(x => !!x)

      const offset = parseInt(query.offset) || 0

      const limit = parseInt(query.limit) || 50

      const get_report = async (domain) => {
        const scanner = await env.ScannerDurable.get(env.ScannerDurable.idFromName(domain))

        const report = await scanner.fetch(`https://x.do/${domain}/report`).then(res => res.json())

        report.link = `https://${hostname}/api/${domain}/report`

        return report
      }

      return json({
        api,
        data: {
          next: `https://${hostname}/api/list?offset=${offset + limit}&limit=${limit}`,
          domains: await Promise.all(domains.slice(offset, offset + limit).map(get_report)),
        },
      })
    }

	  return new Response(JSON.stringify(output, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' }})
	},
}
  
  