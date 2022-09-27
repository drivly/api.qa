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
  '/    |    \    |   |   |    /   \_/.  \/    |    \',
  '\____|__  /____|   |___| /\ \_____\ \_/\____|__  /',
  '        \/               \/        \__>        \/ ',
]

export const examples = {
  'lodash.do': 'https://api.qa/lodash.do/api'
}

export default {
  fetch: async (req, env) => {
    const { user, origin, requestId, method, body, time, pathname, pathSegments, pathOptions, url, query } = await env.CTX.fetch(req).then(res => res.json())
    if (pathname == '/api') return new Response(JSON.stringify({ api, gettingStarted, examples, user }, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' }})
    
    if (error) return new Response(JSON.stringify({ api, method, args, url, outputs, user }, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' }})
    return new Response(JSON.stringify(output, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' }})
  },
}
