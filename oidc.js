const GITHUB_ACTIONS = process.env.GITHUB_ACTIONS
const GITLAB = process.env.GITLAB_CI
const [,, registry, packageName] = process.argv

async function oidc ({ packageName, registry }) {
  let response
  try {
    // Only proceed inside supported CI providers
    if (!(GITHUB_ACTIONS || GITLAB)) return undefined
    let idToken = process.env.NPM_ID_TOKEN
    if (!idToken && GITHUB_ACTIONS) {
      if (!(
        process.env.ACTIONS_ID_TOKEN_REQUEST_URL &&
        process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
      )) {
        console.log('oidc', 'Skipped because incorrect permissions for id-token within GitHub workflow')
        return undefined
      }
      const audience = `npm:${new URL(registry).hostname}`
      const url = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL)
      url.searchParams.append('audience', audience)
      const response = await fetch(url.href, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`,
        },
      })
      const json = await response.json()
      if (!response.ok) {
        console.log('oidc', `Failed to fetch id_token from GitHub: received an invalid response`)
        return undefined
      }
      if (!json.value) {
        console.log('oidc', `Failed to fetch id_token from GitHub: missing value`)
        return undefined
      }
      idToken = json.value
    }
    if (!idToken) {
      console.log('oidc', 'Skipped because no id_token available')
      return undefined
    }
    try {
      const escapedPackageName = encodeURIComponent(packageName)
      const exchangeUrl = new URL(`/-/npm/v1/oidc/token/exchange/package/${escapedPackageName}`, registry)
      const res = await fetch(exchangeUrl.href, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${idToken}`,
          accept: 'application/json',
        },
      })
      response = await res.json()
    } catch (error) {
      console.log('oidc', `Failed token exchange request with body message: ${error?.body?.message || 'Unknown error'}`)
      return undefined
    }
    if (!response?.token) {
      console.log('oidc', 'Failed because token exchange was missing the token in the response body')
      return undefined
    }
  } catch (error) {
    console.log('oidc', `Failure with message: ${error?.message || 'Unknown error'}`)
    return undefined
  }
  return response.token
}

oidc({ packageName, registry }).then(console.log)