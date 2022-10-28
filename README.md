# API.QA - Automated API Testing API

This is a template and package for automated API testing by using the hypermedia references in an APIs.json file to discover an API's functionality and recursively iterate through testing all of the endpoints to ensure expected and consistent behavior.

You can discover the API at <https://api.qa/api>
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
  }
}
```
