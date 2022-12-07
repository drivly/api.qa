export class ScannerDurable {
  constructor(state, env) {
    this.state = state
    this.env = env

    this.log = async (message) => {

      console.log(message)

      await fetch(
        `https://websockets.do/apis-qa-scanner/emit?log=${message}&from=scanner`
      )
    }
  }

  current_date() {
    return new Date().toISOString().split('T')[0]
  }

  async generate_report(domain) {
    console.log('generating report')
    // Validate if domain exists first.
    
    const checks = [
      // DOMAIN VALIDATION CHECKS
      async () => {
        await this.log(`Validating if ${domain} exists...`)

        const check = await fetch(
          `https://1.1.1.1/dns-query?name=${domain}`,
          {
            headers: { accept: 'application/dns-json' }
          }
        ).then(res => res.json())

        // Check if nameservers are set.
        const ns_check = await fetch(
          `https://1.1.1.1/dns-query?name=${domain}&type=NS`,
          {
            headers: { accept: 'application/dns-json' }
          }
        ).then(res => res.json())

        return [
          {
            test_name: 'domainActive',
            result: check.Status == 0,
            error: 'Domain is not currently active.',
            fix: `https://dash.cloudflare.com/b6641681fe423910342b9ffa1364c76d/add-site`
          },
          {
            test_name: 'nameserversValid',
            result: ns_check.Status == 0 && ns_check.Answer.every(a => a.data.includes('cloudflare.com')),
            error: 'Domain is not on the Cloudflare network.',
            fix: `https://dash.cloudflare.com/b6641681fe423910342b9ffa1364c76d/add-site`
          }
        ]
      },
      async () => {
        // Check if domain is about to expire
        await this.log(`Checking if ${domain} is about to expire...`)

        const check = await fetch(
          `https://www.whatsmydns.net/api/domain?q=bucket.do`
        ).then(res => res.json())

        // Check if the expire time is more than 30 days away
        const expire = new Date(check.data.expires)
        const now = new Date()
        const diff = expire - now
        const days = diff / (1000 * 60 * 60 * 24)

        return [
          { test_name: 'domainExpiration', result: days > 30, error: 'Domain is about to expire.' }
        ]
      },
      async () => {
        // Test to see if there is a PUBLIC repo for this domain
        await this.log(`Validating if ${domain} has a public repo...`)

        let exists
        try {
          exists = await Promise.all([
            fetch(`https://cdn.jsdelivr.net/gh/drivly/${domain}/wrangler.toml`),
            fetch(`https://cdn.jsdelivr.net/gh/drivly/${domain}/README.md`),
          ])
        } catch (e) {
          exists = []
        }

        return {
          test_name: 'publicRepo',
          result: exists.length && exists.some(e => e.status == 200),
          fix: 'https://github.com/drivly/worker.templates.do/generate'
        }
      },
      async () => {
        await this.log(`Checking repo for issue #1 being the roadmap`)

        console.log(`https://api.github.com/repos/drivly/${domain}/issues/1`)

        const check = await fetch(
          `https://api.github.com/repos/drivly/${domain}/issues/1`,
          {
            headers: { accept: 'application/vnd.github.v3+json', 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36' }
          }
        ).then(res => res.json())

        return {
          test_name: 'roadmapExists',
          result: (check?.title || '').toLowerCase() == 'roadmap',
          error: 'A roadmap issue does not exist in the repo.',
          fix: `https://github.com/drivly/${domain}/issues/new?assignees=&labels=roadmap&title=Roadmap`
        }
      },
      async () => {
        // Validate if theres an API for this domain
        await this.log(`Checking what type of root page ${domain} has`)

        let check
        let r
        try {
          r = await fetch(
            `https://${domain}/`
          )

          check = await check.text()
        } catch (e) {
          console.log(
            'Error fetching root page for', domain, e
          )
          r = new Response('', { status: 404, headers: { 'Content-Type': 'error/error' } })
        }
        
        return {
          test_name: 'landingPage',
          result: (r.headers.get('Content-Type') || '').includes('html') && r.status == 200,
          error: 'This domain has no landing page. It did not return a 200 status code and HTML for the root page.',
          fix: [
            `https://github.com/drivly/${domain}/new/main?filename=CNAME&value=${domain}`,
            `https://github.com/drivly/${domain}/new/main?filename=_config.yaml&value=remote_theme%3A%20drivly%2Fdocs%0Aicon%3A%20%F0%9F%9A%80`
          ]
        }
      },
      async () => {
        // Check if the `/api` route exists
        await this.log(`Checking if ${domain}/api exists`)

        let check
        
        try {
          check = await fetch(
            `https://${domain}/api`
          ).then(res => res.json())
        } catch (e) {
          check = { error: e }
        }

        return {
          test_name: 'apiDescription',
          result: !!(check?.api?.description || '') && !(check?.api?.description || '').includes('Template'),
          error: 'This domain did not return an API description in its API header, or it doesnt have an API header.',
          fix: `https://github.com/drivly/${domain}/blob/main/worker.js`
        }
      },
      async () => {
        // Check if /login routes to the OAuth login page.
        await this.log(`Checking if ${domain}/login routes to the OAuth login page`)

        let check

        try {
          check = await fetch(
            `https://${domain}/login`,
            {
              redirect: 'manual'
            }
          )
        } catch (e) {
          check = new Response(null, { headers: { Location: 'error' }, status: 400 })
        }
        
        return {
          test_name: 'loginRedirect',
          result: (check.headers.get('Location') || '').includes('oauth.do'),
          error: 'This domain did not redirect to the OAuth login page when visiting /login.',
          fix: `https://dash.cloudflare.com/b6641681fe423910342b9ffa1364c76d/${domain}/workers`
        }
      }
    ]

    const report = await Promise.all(checks.map(x => x()))

    // Check if this domain has any custom tests we need to run.
    let api_spec

    try {
      api_spec = await fetch(
        `https://${domain}/api`
      ).then(res => res.json())
    } catch (e) {
      api_spec = { examples: {} }
    }

    let custom_report = {}

    if (Object.keys(api_spec?.tests || {}).length) {
      await this.log(`Running custom tests for ${domain}`)

      const custom_tests = Object.keys(api_spec.tests).map(async (test) => {
        const test_name = test
        const test_url = api_spec.tests[test]

        await this.log(`Running custom test ${test_name} for ${domain}`)

        let num_passes = 0
        let num_tests = typeof test_url == 'string' ? 1 : test_url.length // Test URL is either a string or an array of URLs to test.

        let messages = []

        for (let i = 0; i < num_tests; i++) {
          let check

          const u = typeof test_url == 'string' ? test_url : test_url[i]

          try {
            check = await fetch(
              u
            ).then(res => res.json())
          } catch (e) {
            check = { error: e }
          }

          if (u.includes('tests.do')) {
            // We're testing the tests.do API
            if (!check.data.success) {
              return {
                test_name,
                result: false,
                error: check.data.error,
                fix: `https://${domain}/api`
              }
            }

            if (check.data.result == 'passed') {
              num_passes++
            } else {
              messages.push({ url: u, 'results': check.data.results })
            }
          } else {
            num_passes++ // This domain isnt for testing, so we auto pass.
          }
        }

        if (num_passes == num_tests) {
          return {
            test_name,
            result: true,
            fix: `https://api.qa/api/${domain}/tests/${test_name}/report`
          }
        } else {
          return {
            test_name,
            result: false,
            error: `This domain failed ${num_tests - num_passes} of ${num_tests} tests. See the report for more details.`,
            fix: `https://api.qa/api/${domain}/tests/${test_name}/report`
          }
        }
      })

      custom_report = await Promise.all(custom_tests)

      report.push(custom_report)
    }

    // turn array of objects into one object
    const report_obj = report.flat().reduce((acc, cur) => { acc[cur.test_name] = cur.result; return acc }, {})

    const passed_checks = Object.values(report_obj).filter(x => x).length

    // If it passess all tests, we put a ✅ emoji
    // If it only passes some of the tests, we put a ❓ emoji
    // If it fails more than half, we put a ❌ emoji

    const emoji = passed_checks == report.flat().length ? '✅' : passed_checks > report.flat().length / 2 ? '🆗' : '❌'

    const statistics_durable = this.env.StatisticsDurable.get(this.env.StatisticsDurable.idFromName('main'))

    await statistics_durable.fetch(
      `https://api.qa/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          text: `${ emoji } ${domain} passed ${passed_checks}/${ report.flat().length } checks`,
          url: `https://api.qa/api/${domain}/report?date=${this.current_date()}`,
          report: report_obj,
          passed_checks,
          total_checks: report.flat().length,
          emoji
        })
      }
    )

    return {
      domain,
      lastChecked: new Date().toISOString(),
      repo: `https://github.com/drivly/${domain}`,
      text: `${ emoji } ${domain} passed ${passed_checks}/${ report.flat().length } checks`,
      performance: Object.keys(api_spec.examples || {}).map(x => ({ n: x, u: `https://time.series.do/api-qa-${domain}-${x}/embed?aggregate=avg&resolution=daily&range=30` })).reduce((acc, cur) => { acc[cur.n] = cur.u; return acc }, {}),
      passed: report.flat().filter(x => x.result).map(x => x.test_name),
      problems: report.flat().filter(x => !x.result).reduce((acc, cur) => { acc[cur.test_name] = { error: cur.error, fix: cur.fix }; return acc }, {}),
    }
  }

  async performance_test(domain) {
    let api_spec

    try {
      api_spec = await fetch(
        `https://${domain}/api`
      ).then(res => res.json())
    } catch (e) {
      // This domain clearly isnt setup correctly, no point in trying to perf test.
      return
    }

    const examples = api_spec.examples

    // Return if there are no examples or if they are the template examples
    // Examples is an object
    if (!Object.values(examples || {}).length) {
      console.log('No examples found.', domain)
      return
    }

    if (Object.values(examples || {}).filter(x => x.includes('templates.do')).length) {
      console.log('Only has template examples')
      return
    }

    for (const [key, value] of Object.entries(examples)) {
      const results = await fetch(
        `https://perf.do/${value.replace('https://', '')}`
      ).then(res => res.json())

      await this.log(
        `[PERF] ${key} : ${results.perf.avg}`
      )

      await fetch(
        `https://time.series.do/api-qa-${domain}-${key}/write?value=${results.perf.avg}`
      )
    }
  }

  async fetch(req) {
    const url = new URL(req.url)
    const segments = url.pathname.split('/').filter(Boolean)

    if (segments[1] == 'report') {
      // Get latest report
      let report = await this.state.storage.get(`${this.current_date()}:report`)

      if (!await this.state.storage.get(`domain`)) {
        console.log('SETTING DOMAIN IN STORAGE.')
        await this.state.storage.put(`domain`, segments[0])
      }

      if (!report || url.searchParams.get('force') == '1') {
        // Now we need to run for this date.
        report = await this.generate_report(segments[0])

        await this.state.storage.put(`${this.current_date()}:report`, JSON.stringify(report))
      } else {
        report = JSON.parse(report)
      }



      return new Response(JSON.stringify(report))
    }

    if (segments[1] == 'perf') {
      await this.performance_test(
        segments[0]
      )
    }

    if (segments[1] == 'purge') {
      await this.state.storage.delete(`${this.current_date()}:report`)

      return new Response('ok')
    }

    if (segments[1] == 'spawn') {
      // We need to setup the alarm to run at midnight everyday.
      await this.state.storage.deleteAlarm()
      await this.state.storage.setAlarm(
        new Date(new Date(Date.now() + 1000 * 60 * 60 * 24).setHours(0, 0, 0, 0))
      )

      await this.state.storage.put(`domain`, segments[0])

      // Run the reporting process right now.
      if (!await this.state.storage.get(`${this.current_date()}:report`)) {
        await this.state.storage.put(`${this.current_date()}:report`, JSON.stringify(
          await this.generate_report(segments[0])
        ))
      }

      return new Response('OK')
    }

    return new Response('woof')
  }

  async alarm() {
    // Run every 24 hours.
    await this.state.storage.setAlarm(
      new Date(Date.now() + 1000 * 60 * 60 * 24)
    )

    const domain = await this.state.storage.get(`domain`)

    const report = await this.generate_report(domain)

    await this.state.storage.put(`${this.current_date()}:report`, JSON.stringify(report))

    await this.performance_test(domain)
  }
}