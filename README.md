# API.QA - Automated API Testing API

This is a template and package for automated API testing by using the hypermedia references in an APIs.json file to discover an API's functionality and recursively iterate through testing all of the endpoints to ensure expected and consistent behavior.

You can discover the API at <https://api.qa/api>:
```
{
  "api": {
    "icon": "⚡️",
    "name": "api.qa",
    "description": "Automated API Testing",
    "url": "https://api.qa/api",
    "type": "https://apis.do/testing",
    "endpoints": {
      "test": "https://api.qa/:endpoint"
    },
    "site": "https://api.qa",
    "login": "https://api.qa/login",
    "signup": "https://api.qa/signup",
    "subscribe": "https://api.qa/subscribe",
    "repo": "https://github.com/drivly/api.qa"
  },
  "gettingStarted": {},
  "examples": {
    "lodash.do": "https://api.qa/lodash.do/api"
  },
  "user": {
    "authenticated": false,
    "plan": "🛠 Build",
    "browser": "Safari",
    "os": "Mac OS",
    "ip": "76.156.0.116",
    "isp": "Comcast Cable",
    "flag": "🇺🇸",
    "zipcode": "55379",
    "city": "Shakopee",
    "metro": "Minneapolis-St. Paul",
    "region": "Minnesota",
    "country": "United States",
    "continent": "North America",
    "requestId": "75172e199d802c80-ORD",
    "localTime": "9/27/2022, 4:02:24 PM",
    "timezone": "America/Chicago",
    "edgeLocation": "Chicago",
    "edgeDistanceMiles": 342,
    "latencyMilliseconds": 44,
    "recentInteractions": 1
  }
}
```
