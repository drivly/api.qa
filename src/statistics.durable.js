
const progress_bar = (passed, total) => {
  const percentage = Math.round((passed / total) * 100)

  // Return an ascii progress bar
  return `[${'='.repeat(percentage)}${' '.repeat(100 - percentage)}] ${percentage}%`
}

export class StatisticsDurable {
	constructor(state, env) {
	  this.state = state
	  this.env = env

    // Report cache
    // Keys are the dates, and the values and the reports for that date.
    this.reports = {}
	}

	async fetch(req) {
    // This durable object will be in charge of storing the collective reports from all of the DOs.
    // It will also be in charge of aggregating the data and returning it to the user.

    const query = new URL(req.url).searchParams

    if (req.method == 'POST') {
      const data = await req.json()

      // We need to store the data in a way that we can aggregate it later.
      // Using the current date as the key
      await this.state.storage.put(`${new Date().toISOString().split('T')[0]}:${data.domain}`, JSON.stringify({
        ... data
      }))
      
      return new Response('OK')
    } else {
      // List our aggregated data for the date.
      let list
      const dt = req.url.split('/').pop().split('?')[0]

      if (!this.reports[dt]) {
        list = await this.state.storage.list({ prefix: dt })

        this.reports[dt] = Array.from(list.values()).map(key => {
          return JSON.parse(key)
        })
      }

      const reports = this.reports[dt]

      list = reports.sort((a, b) => {
        return b.passed_checks - a.passed_checks
      }).slice(parseInt(query.get('offset') || 0), parseInt(query.get('offset') || 0) + parseInt(query.get('limit') || 10))

      
      const filter = {
        passed: item => item.passed_checks == item.total_checks,
        any: item => true
      }[query.get('filter') || 'passed']

      list = list.filter(filter).map(item => {
        const ret = {
          ...item,
          checks: `${item.passed_checks}/${item.total_checks}`
        }

        delete ret.passed_checks
        delete ret.total_checks
        return ret
      })

      return new Response(JSON.stringify({
        total_passed: reports.filter(item => item.passed_checks == item.total_checks).length,
        total_failed: reports.filter(item => item.passed_checks != item.total_checks).length,
        total: reports.length,
        progress: progress_bar(reports.filter(item => item.passed_checks == item.total_checks).length, reports.length),
        results: list,
      }))
    }
  }
}