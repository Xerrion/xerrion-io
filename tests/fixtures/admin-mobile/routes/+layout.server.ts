export function load({ url }: { url: URL }) {
  return {
    user:
      url.pathname === '/admin/login' ? null : { id: 1, username: 'UI test' }
  }
}
